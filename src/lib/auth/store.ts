import { randomUUID } from 'crypto';

interface Session {
  moltbookApiKey: string;
  userId: string;
  expiresAt: number;
  used: boolean;
}

const sessions = new Map<string, Session>();
const userSessions = new Map<string, Set<string>>();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt < now || session.used) {
      sessions.delete(id);
      userSessions.get(session.userId)?.delete(id);
    }
  }
}

// GC every hour
setInterval(pruneExpired, 60 * 60 * 1000).unref();

export function createSession(userId: string, moltbookApiKey: string): string {
  const id = randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(id, { moltbookApiKey, userId, expiresAt, used: false });
  if (!userSessions.has(userId)) userSessions.set(userId, new Set());
  userSessions.get(userId)!.add(id);
  return id;
}

export function consumeSession(
  refreshToken: string
): { moltbookApiKey: string; userId: string; newRefreshToken: string } | null {
  const session = sessions.get(refreshToken);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(refreshToken);
    return null;
  }
  if (session.used) return null;

  // Mark old token as used (rotation)
  session.used = true;

  // Issue a new refresh token
  const newRefreshToken = createSession(session.userId, session.moltbookApiKey);
  return { moltbookApiKey: session.moltbookApiKey, userId: session.userId, newRefreshToken };
}

export function getMoltbookKey(userId: string): string | null {
  const ids = userSessions.get(userId);
  if (!ids) return null;
  const now = Date.now();
  for (const id of ids) {
    const session = sessions.get(id);
    if (session && !session.used && session.expiresAt > now) {
      return session.moltbookApiKey;
    }
  }
  return null;
}

export function invalidateUser(userId: string): void {
  const ids = userSessions.get(userId);
  if (!ids) return;
  for (const id of ids) sessions.delete(id);
  userSessions.delete(userId);
}
