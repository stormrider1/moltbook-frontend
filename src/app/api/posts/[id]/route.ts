import { NextRequest, NextResponse } from 'next/server';
import { getMoltbookKey } from '@/lib/auth/store';

const API_BASE = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const moltbookKey = userId ? getMoltbookKey(userId) : null;

    const response = await fetch(`${API_BASE}/posts/${params.id}`, {
      headers: moltbookKey ? { Authorization: `Bearer ${moltbookKey}` } : {},
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const moltbookKey = userId ? getMoltbookKey(userId) : null;
    if (!moltbookKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE}/posts/${params.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${moltbookKey}` },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
