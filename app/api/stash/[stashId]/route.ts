import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hasStashAccess } from "@/lib/auth/stash-access";

type Params = { params: Promise<{ stashId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stashId } = await params;

  if (!hasStashAccess(session, stashId)) {
    return NextResponse.json({ error: "Stash access required" }, { status: 403 });
  }

  const stash = await prisma.stash.findUnique({
    where: { id: stashId },
    select: {
      id: true,
      encryptedMetadata: true,
      ownerMemberToken: true,
      currentEpoch: true,
      createdAt: true,
    },
  });

  if (!stash) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(stash);
}
