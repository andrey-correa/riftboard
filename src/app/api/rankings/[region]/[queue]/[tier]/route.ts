import { NextRequest, NextResponse } from 'next/server';
import { withApi, jsonError, validateRegion } from '@/lib/api-helpers';
import { getLeaderboard, ApexTierUpper } from '@/services/rankings';
import { normalizePlatform } from '@/lib/regions';

export const dynamic = 'force-dynamic';

const VALID_QUEUES = new Set([
  'RANKED_SOLO_5x5',
  'RANKED_FLEX_SR',
  'RANKED_FLEX_TT',
]);

const VALID_TIERS = new Set<ApexTierUpper>([
  'CHALLENGER',
  'GRANDMASTER',
  'MASTER',
]);

export async function GET(
  req: NextRequest,
  { params }: { params: { region: string; queue: string; tier: string } },
) {
  return withApi(req, async () => {
    const regionErr = validateRegion(params.region);
    if (regionErr) return jsonError('INVALID_REGION', regionErr, 400);
    const region = normalizePlatform(params.region)!;

    if (!VALID_QUEUES.has(params.queue)) {
      return jsonError(
        'INVALID_QUEUE',
        'queue must be one of RANKED_SOLO_5x5, RANKED_FLEX_SR, RANKED_FLEX_TT.',
        400,
      );
    }

    const tierUpper = params.tier.toUpperCase() as ApexTierUpper;
    if (!VALID_TIERS.has(tierUpper)) {
      return jsonError(
        'INVALID_TIER',
        'tier must be CHALLENGER, GRANDMASTER, or MASTER.',
        400,
      );
    }

    const data = await getLeaderboard(region, params.queue, tierUpper);
    return NextResponse.json(data);
  });
}
