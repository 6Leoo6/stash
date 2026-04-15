import { NextRequest, NextResponse } from "next/server";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, _ and - allowed"),
  password: z.string().min(8).max(128),
  identityPublicKey: z.string().min(1),
  encryptedIdentityBundle: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { username, password, identityPublicKey, encryptedIdentityBundle } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      identityPublicKey,
      encryptedIdentityBundle,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.json({ success: true }, { status: 201 });
}
