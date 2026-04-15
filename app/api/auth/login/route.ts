import { NextRequest, NextResponse } from "next/server";
import { verify } from "@node-rs/argon2";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const valid = await verify(user.passwordHash, password);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  }

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.json({ success: true });
}
