import { NextRequest, NextResponse } from 'next/server';
import { getMoltbookKey } from '@/lib/auth/store';

const API_BASE = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const moltbookKey = userId ? getMoltbookKey(userId) : null;
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q');
    if (!q) {
      return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
    }

    const params = new URLSearchParams({ q });
    const limit = searchParams.get('limit');
    if (limit) params.append('limit', limit);

    const response = await fetch(`${API_BASE}/search?${params}`, {
      headers: moltbookKey ? { Authorization: `Bearer ${moltbookKey}` } : {},
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
