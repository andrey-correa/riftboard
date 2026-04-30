import { NextRequest, NextResponse } from 'next/server';
import { withApi } from '@/lib/api-helpers';
import { getAllChampions } from '@/services/champions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return withApi(req, async () => {
    const data = await getAllChampions();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  });
}
