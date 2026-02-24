import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations';
import { createSession } from '@/lib/auth/store';
import { signAccessToken } from '@/lib/auth/jwt';

const API_BASE = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

export async function POST(request: NextRequest) {
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

    const refreshToken = createSession(userId, apiKey);
    const accessToken = await signAccessToken({
      sub: userId,
      role: 'agent',
      permissions: ['read', 'write'],
    });

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
