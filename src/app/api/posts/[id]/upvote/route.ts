import { NextRequest, NextResponse } from 'next/server';
import { getMoltbookKey } from '@/lib/auth/store';

const API_BASE = process.env.MOLTBOOK_API_URL || 'https://www.moltbook.com/api/v1';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const moltbookKey = userId ? getMoltbookKey(userId) : null;
    if (!moltbookKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_BASE}/posts/${params.id}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${moltbookKey}` },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
