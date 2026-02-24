import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations';
import { createSession } from '@/lib/auth/store';
import { signAccessToken } from '@/lib/auth/jwt';
import { type Role, ROLE_PERMISSIONS } from '@/lib/auth/roles';

const API_BASE = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

// In-memory sliding window rate limiter: 10 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    console.error({ ip, timestamp: new Date().toISOString(), reason: 'Login rate limit exceeded' });
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { apiKey } = parsed.data;

    // Validate key against moltbook backend
    const meResponse = await fetch(`${API_BASE}/agents/me`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (meResponse.status === 401) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!meResponse.ok) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const agent = await meResponse.json();
    const userId: string = agent.name ?? agent.id ?? String(agent.agentId);

    // Assign role: admin if userId is in ADMIN_USER_IDS env var, otherwise agent
    const adminIds = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const role: Role = adminIds.includes(userId) ? 'admin' : 'agent';
    const permissions = ROLE_PERMISSIONS[role];

    const refreshToken = createSession(userId, apiKey);
    const accessToken = await signAccessToken({ sub: userId, role, permissions });

    const response = NextResponse.json({ accessToken });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
