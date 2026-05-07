import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { findSlotByToken } from "@/lib/stash/slots";
import type { MemberSlot } from "@/types/crypto";

const slotSchema = z.object({
  token: z.string().min(1),
  publicKey: z.string().min(1),
  encryptedStashKey: z.string().min(1),
});

const announcementSchema = z.object({
  encryptedContent: z.string().min(1),
  epoch: z.number().int().nonnegative(),
});

const schema = z.object({
  inviteCode: z.string().min(1),
  newSlot: slotSchema,
  announcement: announcementSchema,
  updatedEncryptedMetadata: z.string().optional(),
  encryptedStashIndex: z.string().optional(),
});

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
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { inviteCode, newSlot, announcement, updatedEncryptedMetadata, encryptedStashIndex } = parsed.data;

  const invite = await prisma.inviteLink.findUnique({
    where: { code: inviteCode },
    select: {
      id: true,
      stashId: true,
      usesRemaining: true,
      expiresAt: true,
    },
  });

  if (!invite || invite.stashId !== stashId) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
  }

  if (invite.usesRemaining !== null && invite.usesRemaining <= 0) {
    return NextResponse.json({ error: "Invite has no uses remaining" }, { status: 400 });
  }

  const stash = await prisma.stash.findUnique({
    where: { id: stashId },
    select: {
      memberSlots: true,
      encryptedAnnouncements: true,
    },
  });

  if (!stash) {
    return NextResponse.json({ error: "Stash not found" }, { status: 404 });
  }

  const slots = stash.memberSlots as MemberSlot[];
  if (findSlotByToken(slots, newSlot.token)) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const announcements = (stash.encryptedAnnouncements ?? []) as object[];

  await prisma.$transaction(async (tx) => {
    await tx.stash.update({
      where: { id: stashId },
      data: {
        memberSlots: [...slots, newSlot],
        encryptedAnnouncements: [...announcements, announcement],
        ...(updatedEncryptedMetadata && { encryptedMetadata: updatedEncryptedMetadata }),
      },
    });

    if (invite.usesRemaining !== null) {
      await tx.inviteLink.update({
        where: { id: invite.id },
        data: { usesRemaining: invite.usesRemaining - 1 },
      });
    }

    if (encryptedStashIndex) {
      await tx.user.update({
        where: { id: session.userId },
        data: { encryptedStashIndex },
      });
    }
  });

  return NextResponse.json({ success: true });
}
