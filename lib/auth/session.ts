import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type StashSessionGrant = {
  memberToken: string;
  grantedAt: number;
};

export type PendingChallenge = {
  stashId: string;
  memberToken: string;
  token: string;
  expiresAt: number;
};

export type SessionData = {
  userId?: string;
  stashSessions?: Record<string, StashSessionGrant>;
  pendingChallenge?: PendingChallenge;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "stash-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
