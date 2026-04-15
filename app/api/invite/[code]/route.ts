import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { code } = await params;

  const invite = await prisma.inviteLink.findUnique({
    where: { code },
    select: {
      stashId: true,
      passwordProtected: true,
      salt: true,
      encryptedPayload: true,
      usesRemaining: true,
      expiresAt: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  if (invite.usesRemaining !== null && invite.usesRemaining <= 0) {
    return NextResponse.json({ error: "Invite has no uses remaining" }, { status: 410 });
  }

  return NextResponse.json(invite);
}
