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

  const listings = await prisma.listing.findMany({
    where: { stashId },
    orderBy: { createdAt: "desc" },
    select: { id: true, encryptedContent: true, epoch: true, createdAt: true },
  });

  return NextResponse.json(listings);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { stashId } = await params;
  const session = await getSession();

  if (!session.userId || !hasStashAccess(session, stashId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify stash exists and belongs to this session's owner (any member may post listings)
  const stash = await prisma.stash.findUnique({ where: { id: stashId }, select: { id: true } });
  if (!stash) {
    return NextResponse.json({ error: "Stash not found" }, { status: 404 });
  }

  const body = await req.json();
  const { encryptedContent, epoch } = body;

  if (!encryptedContent || typeof epoch !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: { stashId, encryptedContent, epoch },
    select: { id: true, epoch: true, createdAt: true },
  });

  return NextResponse.json(listing, { status: 201 });
}
