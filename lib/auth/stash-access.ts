import type { SessionData } from "./session";

const GRANT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function hasStashAccess(session: SessionData, stashId: string): boolean {
  const grant = session.stashSessions?.[stashId];
  if (!grant) return false;
  return Date.now() - grant.grantedAt < GRANT_TTL_MS;
}

export function grantStashAccess(session: SessionData, stashId: string, memberToken: string): void {
  if (!session.stashSessions) {
    session.stashSessions = {};
  }
  session.stashSessions[stashId] = {
    memberToken,
    grantedAt: Date.now(),
  };
}
