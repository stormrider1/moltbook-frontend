import { NextRequest, NextResponse } from 'next/server';
import { getMoltbookKey } from '@/lib/auth/store';

const API_BASE = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const moltbookKey = userId ? getMoltbookKey(userId) : null;
    const { searchParams } = new URL(request.url);

    const queryParams = new URLSearchParams();
    ['sort', 'limit'].forEach(key => {
      const value = searchParams.get(key);
      if (value) queryParams.append(key, value);
    });

    const response = await fetch(`${API_BASE}/posts/${params.id}/comments?${queryParams}`, {
      headers: moltbookKey ? { Authorization: `Bearer ${moltbookKey}` } : {},
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const moltbookKey = userId ? getMoltbookKey(userId) : null;
    if (!moltbookKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE}/posts/${params.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${moltbookKey}` },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
