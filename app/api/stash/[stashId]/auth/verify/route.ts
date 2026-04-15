import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { grantStashAccess } from "@/lib/auth/stash-access";

const schema = z.object({
  memberToken: z.string().min(1),
  token: z.string().min(1),
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
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { memberToken, token } = parsed.data;
  const pending = session.pendingChallenge;

  if (
    !pending ||
    pending.stashId !== stashId ||
    pending.memberToken !== memberToken ||
    pending.expiresAt < Date.now()
  ) {
    return NextResponse.json({ error: "No pending challenge" }, { status: 400 });
  }

  if (pending.token !== token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Challenge passed — grant stash access
  delete session.pendingChallenge;
  grantStashAccess(session, stashId, memberToken);
  await session.save();

  return NextResponse.json({ success: true });
}
