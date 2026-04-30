import { NextRequest, NextResponse } from 'next/server';
import { withApi, jsonError } from '@/lib/api-helpers';
import { loadMatchDetail } from '@/services/player';
import { REGIONAL_ROUTES, RegionalRoute } from '@/lib/regions';

export const dynamic = 'force-dynamic';

function isRegionalRoute(value: string): value is RegionalRoute {
  return (REGIONAL_ROUTES as readonly string[]).includes(value);
}

// Formato Riot: {PLATAFORMA}_{ID_NUMÉRICO} — ex: NA1_4567890123, KR_1234567890
const MATCH_ID_RE = /^[A-Z0-9]{2,6}_\d{6,15}$/;

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
    if (!params.matchId || !MATCH_ID_RE.test(params.matchId.toUpperCase())) {
      return jsonError('INVALID_INPUT', 'Invalid matchId format.', 400);
    }

    const detail = await loadMatchDetail(params.regionalRoute, params.matchId);
    return NextResponse.json(detail);
  });
}
