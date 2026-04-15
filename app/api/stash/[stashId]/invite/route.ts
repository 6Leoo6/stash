import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  encryptedPayload: z.string().min(1),
  salt: z.string(),
  passwordProtected: z.boolean(),
  usesRemaining: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

type Params = { params: Promise<{ stashId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stashId } = await params;

  const stash = await prisma.stash.findUnique({
    where: { id: stashId },
    select: { ownerUserId: true },
  });

  if (!stash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (stash.ownerUserId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { encryptedPayload, salt, passwordProtected, usesRemaining, expiresAt } =
    parsed.data;

  const code = crypto.randomBytes(16).toString("base64url");

  const invite = await prisma.inviteLink.create({
    data: {
      stashId,
      code,
      encryptedPayload,
      salt,
      passwordProtected,
      usesRemaining: usesRemaining ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ code: invite.code }, { status: 201 });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stashId } = await params;

  const stash = await prisma.stash.findUnique({
    where: { id: stashId },
    select: { ownerUserId: true },
  });

  if (!stash || stash.ownerUserId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await prisma.inviteLink.findMany({
    where: { stashId },
    select: {
      id: true,
      code: true,
      passwordProtected: true,
      usesRemaining: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}
