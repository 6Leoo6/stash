import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const createSchema = z.object({
  id: z.string().uuid(),
  encryptedMetadata: z.string().min(1),
  encryptedPreview: z.string().min(1),
  ownerMemberToken: z.string().min(1),
  memberSlots: z.array(
    z.object({
      token: z.string(),
      publicKey: z.string(),
      encryptedStashKey: z.string(),
    })
  ),
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stashes = await prisma.stash.findMany({
    where: { ownerUserId: session.userId },
    select: {
      id: true,
      encryptedPreview: true,
      ownerMemberToken: true,
      currentEpoch: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(stashes);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { id, encryptedMetadata, encryptedPreview, ownerMemberToken, memberSlots } =
    parsed.data;

  const existing = await prisma.stash.findUnique({ where: { id } });
  if (existing) {
    return NextResponse.json({ error: "Stash ID already exists" }, { status: 409 });
  }

  const stash = await prisma.stash.create({
    data: {
      id,
      ownerUserId: session.userId,
      encryptedMetadata,
      encryptedPreview,
      ownerMemberToken,
      memberSlots,
    },
  });

  return NextResponse.json({ id: stash.id }, { status: 201 });
}
