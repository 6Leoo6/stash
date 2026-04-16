import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hasStashAccess } from "@/lib/auth/stash-access";

type Params = { params: Promise<{ stashId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { stashId } = await params;
  const session = await getSession();

  if (!session.userId || !hasStashAccess(session, stashId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { stashId },
    orderBy: { createdAt: "desc" },
    select: { id: true, listingId: true, encryptedContent: true, epoch: true, createdAt: true },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { stashId } = await params;
  const session = await getSession();

  if (!session.userId || !hasStashAccess(session, stashId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { listingId, encryptedContent, epoch } = body;

  if (!listingId || !encryptedContent || typeof epoch !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the listing belongs to this stash
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, stashId },
    select: { id: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const order = await prisma.order.create({
    data: { listingId, stashId, encryptedContent, epoch },
    select: { id: true, epoch: true, createdAt: true },
  });

  return NextResponse.json(order, { status: 201 });
}
