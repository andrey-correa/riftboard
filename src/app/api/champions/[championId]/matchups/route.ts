import { NextRequest, NextResponse } from 'next/server';
import { withApi, jsonError } from '@/lib/api-helpers';
import { getChampionMatchups } from '@/services/champion-analytics';
import { parseChampionParams } from '../_parseParams';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { championId: string } },
) {
  return withApi(req, async () => {
    const parsed = await parseChampionParams(req, params.championId);
    if ('error' in parsed) return jsonError('INVALID_INPUT', parsed.error, parsed.status);

    const data = await getChampionMatchups(parsed.championId, parsed.ctx);
    return NextResponse.json(data);
  });
}
