import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hasStashAccess } from "@/lib/auth/stash-access";

type Params = { params: Promise<{ stashId: string }> };

// PATCH: atomically replace member slots + metadata after a kick + re-key
export async function PATCH(req: NextRequest, { params }: Params) {
  const { stashId } = await params;
  const session = await getSession();

  if (!session.userId || !hasStashAccess(session, stashId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only the owner may kick members
  const stash = await prisma.stash.findUnique({
    where: { id: stashId },
    select: { ownerMemberToken: true, currentEpoch: true },
  });
  if (!stash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ownerToken = session.stashSessions?.[stashId]?.memberToken;
  if (ownerToken !== stash.ownerMemberToken) {
    return NextResponse.json({ error: "Only the owner can kick members" }, { status: 403 });
  }

  const body = await req.json();
  const { newMemberSlots, newEncryptedMetadata } = body;

  if (!Array.isArray(newMemberSlots) || !newEncryptedMetadata) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  await prisma.stash.update({
    where: { id: stashId },
    data: {
      memberSlots: newMemberSlots,
      encryptedMetadata: newEncryptedMetadata,
      currentEpoch: { increment: 1 },
    },
  });

  return NextResponse.json({ ok: true });
}
