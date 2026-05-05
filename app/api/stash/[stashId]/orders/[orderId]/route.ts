import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hasStashAccess } from "@/lib/auth/stash-access";

type Params = { params: Promise<{ stashId: string; orderId: string }> };

// PATCH: replace the encrypted order content (e.g. status update re-encrypted by owner)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { stashId, orderId } = await params;
  const session = await getSession();

  if (!session.userId || !hasStashAccess(session, stashId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { encryptedContent, epoch } = body;

  if (!encryptedContent || typeof epoch !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const stash = await prisma.stash.findUnique({
    where: { id: stashId },
    select: { ownerMemberToken: true },
  });
  if (!stash) {
    return NextResponse.json({ error: "Stash not found" }, { status: 404 });
  }

  const sessionToken = session.stashSessions?.[stashId]?.memberToken;
  if (!sessionToken || sessionToken !== stash.ownerMemberToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, stashId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { encryptedContent, epoch },
    select: { id: true, epoch: true },
  });

  return NextResponse.json(updated);
}
