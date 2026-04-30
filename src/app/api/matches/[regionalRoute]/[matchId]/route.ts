import { NextRequest, NextResponse } from 'next/server';
import { withApi, jsonError } from '@/lib/api-helpers';
import { loadMatchDetail } from '@/services/player';
import { REGIONAL_ROUTES, RegionalRoute } from '@/lib/regions';

export const dynamic = 'force-dynamic';

function isRegionalRoute(value: string): value is RegionalRoute {
  return (REGIONAL_ROUTES as readonly string[]).includes(value);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { regionalRoute: string; matchId: string } },
) {
  return withApi(req, async () => {
    if (!isRegionalRoute(params.regionalRoute)) {
      return jsonError(
        'INVALID_ROUTE',
        'Invalid regional route. Use: americas, europe, asia, sea.',
        400,
      );
    }
    if (!params.matchId || params.matchId.length > 64) {
      return jsonError('INVALID_INPUT', 'matchId is required.', 400);
    }

    const detail = await loadMatchDetail(params.regionalRoute, params.matchId);
    return NextResponse.json(detail);
  });
}
