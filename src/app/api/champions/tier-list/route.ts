import { NextRequest, NextResponse } from 'next/server';
import { withApi, jsonError } from '@/lib/api-helpers';
import {
  getChampionTierList,
  resolveLatestPatch,
} from '@/services/champion-analytics';
import { isPlatformRegion } from '@/lib/regions';
import type { ChampionTierListDto } from '@/types/domain';

export const dynamic = 'force-dynamic';

const VALID_ROLES = new Set(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']);

export async function GET(req: NextRequest) {
  return withApi(req, async () => {
    const sp = req.nextUrl.searchParams;

    const region = (sp.get('region') ?? 'BR1').toUpperCase();
    if (!isPlatformRegion(region)) {
      return jsonError('INVALID_INPUT', `Invalid region: ${region}.`, 400);
    }

    const role = (sp.get('role') ?? 'MIDDLE').toUpperCase();
    if (!VALID_ROLES.has(role)) {
      return jsonError('INVALID_INPUT', `Invalid role: ${role}.`, 400);
    }

    const queueIdParam = sp.get('queueId') ?? '420';
    const queueId = Number(queueIdParam);
    if (!Number.isInteger(queueId) || queueId <= 0) {
      return jsonError('INVALID_INPUT', 'queueId must be a positive integer.', 400);
    }

    let patch = sp.get('patch') ?? '';
    if (!patch) {
      const resolved = await resolveLatestPatch(region, role, queueId);
      if (!resolved) {
        return NextResponse.json<ChampionTierListDto>({
          patch: null,
          region,
          role,
          queueId,
          entries: [],
        });
      }
      patch = resolved;
    }

    const data = await getChampionTierList({ patch, region, role, queueId });
    return NextResponse.json<ChampionTierListDto>(data);
  });
}
