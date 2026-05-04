/**
 * Shared query-param parser for champion analytics routes.
 *
 * Defaults:
 *   region  = "BR1"
 *   queueId = 420  (ranked solo)
 *   patch   = resolved from DB (latest available)
 *   role    = resolved from DB (most played for the champion)
 */

import { NextRequest } from 'next/server';
import { isPlatformRegion } from '@/lib/regions';
import {
  resolveLatestPatch,
  resolveBestRole,
  type AnalyticsContext,
} from '@/services/champion-analytics';

const VALID_ROLES = new Set(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']);

export interface ParsedChampionParams {
  championId: number;
  ctx: AnalyticsContext;
}

export async function parseChampionParams(
  req: NextRequest,
  rawChampionId: string,
): Promise<ParsedChampionParams | { error: string; status: number }> {
  const championId = Number(rawChampionId);
  if (!Number.isInteger(championId) || championId <= 0) {
    return { error: 'championId must be a positive integer.', status: 400 };
  }

  const sp = req.nextUrl.searchParams;

  // region
  const regionParam = (sp.get('region') ?? 'BR1').toUpperCase();
  if (!isPlatformRegion(regionParam)) {
    return { error: `Invalid region: ${regionParam}.`, status: 400 };
  }
  const region = regionParam;

  // queueId
  const queueIdParam = sp.get('queueId') ?? '420';
  const queueId = Number(queueIdParam);
  if (!Number.isInteger(queueId) || queueId <= 0) {
    return { error: 'queueId must be a positive integer.', status: 400 };
  }

  // role
  let role = (sp.get('role') ?? '').toUpperCase();
  if (role && !VALID_ROLES.has(role)) {
    return { error: `Invalid role: ${role}. Valid: ${[...VALID_ROLES].join(', ')}.`, status: 400 };
  }

  // patch — resolve latest if not provided
  let patch = sp.get('patch') ?? '';
  if (!patch) {
    const resolved = await resolveLatestPatch(region, role || 'MIDDLE', queueId, championId);
    if (!resolved) {
      return { error: 'No data available for this champion yet.', status: 404 };
    }
    patch = resolved;
  }

  // role — resolve best if not provided
  if (!role) {
    const resolved = await resolveBestRole(championId, patch, region, queueId);
    if (!resolved) {
      return { error: 'No role data available for this champion yet.', status: 404 };
    }
    role = resolved;
  }

  return { championId, ctx: { patch, region, role, queueId } };
}
