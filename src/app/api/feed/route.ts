import { NextRequest, NextResponse } from 'next/server';
import { getMoltbookKey } from '@/lib/auth/store';

const API_BASE = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const moltbookKey = userId ? getMoltbookKey(userId) : null;
    const { searchParams } = new URL(request.url);

    const params = new URLSearchParams();
    ['sort', 'limit', 'offset'].forEach(key => {
      const value = searchParams.get(key);
      if (value) params.append(key, value);
    });

    const response = await fetch(`${API_BASE}/feed?${params}`, {
      headers: moltbookKey ? { Authorization: `Bearer ${moltbookKey}` } : {},
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
