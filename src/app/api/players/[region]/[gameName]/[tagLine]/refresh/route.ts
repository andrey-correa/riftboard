import { NextRequest, NextResponse } from 'next/server';
import { withApi, jsonError, validateRegion } from '@/lib/api-helpers';
import { refreshPlayer } from '@/services/player';
import { normalizePlatform } from '@/lib/regions';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { region: string; gameName: string; tagLine: string } },
) {
  return withApi(req, async () => {
    const regionErr = validateRegion(params.region);
    if (regionErr) {
      return jsonError('INVALID_REGION', regionErr, 400);
    }
    const region = normalizePlatform(params.region)!;
    const gameName = decodeURIComponent(params.gameName);
    const tagLine = decodeURIComponent(params.tagLine);

    if (!gameName || !tagLine) {
      return jsonError('INVALID_INPUT', 'gameName and tagLine are required.', 400);
    }

    logger.info('player refresh', { region, gameName, tagLine });
    const data = await refreshPlayer(region, gameName, tagLine);
    return NextResponse.json(data);
  });
}
