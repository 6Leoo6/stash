import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { findSlotByToken } from "@/lib/stash/slots";
import type { MemberSlot } from "@/types/crypto";

const schema = z.object({ memberToken: z.string().min(1) });

type Params = { params: Promise<{ stashId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stashId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { memberToken } = parsed.data;

  const stash = await prisma.stash.findUnique({
    where: { id: stashId },
    select: { memberSlots: true },
  });

  if (!stash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slots = stash.memberSlots as MemberSlot[];
  const slot = findSlotByToken(slots, memberToken);

  if (!slot) {
    // Return fake challenge to prevent slot enumeration
    return NextResponse.json({
      challenge: {
        ephemeralPublicKey: Buffer.from(crypto.randomBytes(32)).toString("base64"),
        iv: Buffer.from(crypto.randomBytes(12)).toString("base64"),
        ciphertext: Buffer.from(crypto.randomBytes(64)).toString("base64"),
      },
    });
  }

  // Encrypt a random token to the member's public key using ECIES
  // (server-side ECIES using Node.js crypto — symmetric AES-GCM for simplicity)
  const randomToken = crypto.randomBytes(32).toString("base64");
  const memberPubKey = Buffer.from(slot.publicKey, "base64");

  // Server-side ECIES: ephemeral X25519 + HKDF + AES-256-GCM
  const ephemeralPriv = crypto.generateKeyPairSync("x25519");
  const ephemeralPubRaw = ephemeralPriv.publicKey
    .export({ type: "spki", format: "der" })
    .slice(-32);

  const peerPub = crypto.createPublicKey({
    key: Buffer.concat([
      // SPKI header for X25519
      Buffer.from("302a300506032b656e032100", "hex"),
      memberPubKey,
    ]),
    format: "der",
    type: "spki",
  });

  const sharedSecret = crypto.diffieHellman({
    privateKey: ephemeralPriv.privateKey,
    publicKey: peerPub,
  });

  const salt = Buffer.concat([ephemeralPubRaw, memberPubKey]);
  const encKey = Buffer.from(
    crypto.hkdfSync("sha256", sharedSecret, salt, Buffer.from("ecies-v1"), 32)
  );

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(randomToken)),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  // Store challenge in session (expires in 5 minutes)
  session.pendingChallenge = {
    stashId,
    memberToken,
    token: randomToken,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  await session.save();

  return NextResponse.json({
    challenge: {
      ephemeralPublicKey: ephemeralPubRaw.toString("base64"),
      iv: iv.toString("base64"),
      ciphertext: encrypted.toString("base64"),
    },
    encryptedStashKey: slot.encryptedStashKey,
  });
}
