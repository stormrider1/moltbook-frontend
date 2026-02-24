import { NextRequest, NextResponse } from 'next/server';
import { consumeSession } from '@/lib/auth/store';
import { signAccessToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = consumeSession(refreshToken);
    if (!result) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, newRefreshToken } = result;
    const accessToken = await signAccessToken({
      sub: userId,
      role: 'agent',
      permissions: ['read', 'write'],
    });

    const response = NextResponse.json({ accessToken });
    response.cookies.set('refresh_token', newRefreshToken, {
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
