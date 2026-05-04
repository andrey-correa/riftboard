import { NextRequest, NextResponse } from 'next/server';
import { withApi, jsonError } from '@/lib/api-helpers';
import {
  recalculateForContext,
  recalculateAllContexts,
} from '@/services/champion-aggregates';
import { isPlatformRegion } from '@/lib/regions';

export const dynamic = 'force-dynamic';

const VALID_ROLES = new Set(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']);

/**
 * POST /api/admin/champions/recalculate
 *
 * Body (all optional — omit all to recalculate every distinct context in DB):
 *   { patch?: string; region?: string; role?: string; queueId?: number }
 *
 * If all four are provided, recalculates only that specific context.
 * Otherwise recalculates all contexts found in ChampionAggregate.
 */
export async function POST(req: NextRequest) {
  return withApi(req, async () => {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // empty body → recalculate all
    }

    const { patch, region, role, queueId } = body as {
      patch?: string;
      region?: string;
      role?: string;
      queueId?: number;
    };

    const hasAll = patch && region && role && queueId != null;

    if (hasAll) {
      const regionUp = (region as string).toUpperCase();
      if (!isPlatformRegion(regionUp)) {
        return jsonError('INVALID_INPUT', `Invalid region: ${region}.`, 400);
      }

      const roleUp = (role as string).toUpperCase();
      if (!VALID_ROLES.has(roleUp)) {
        return jsonError('INVALID_INPUT', `Invalid role: ${role}.`, 400);
      }

      const queueIdNum = Number(queueId);
      if (!Number.isInteger(queueIdNum) || queueIdNum <= 0) {
        return jsonError('INVALID_INPUT', 'queueId must be a positive integer.', 400);
      }

      const ctx = {
        patch: patch as string,
        region: regionUp,
        role: roleUp,
        queueId: queueIdNum,
      };

      await recalculateForContext(ctx);
      return NextResponse.json({ ok: true, mode: 'single', ctx });
    }

    // recalculate all distinct contexts
    await recalculateAllContexts();
    return NextResponse.json({ ok: true, mode: 'all' });
  });
}
