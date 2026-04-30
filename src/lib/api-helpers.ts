import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';
import { RiotApiError, RiotNotFoundError, RiotRateLimitError } from '@/lib/riot';
import { PlayerNotFoundError, RefreshLockedError } from '@/services/player';
import { isPlatformRegion } from '@/lib/regions';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  extra?: { retryAfter?: number },
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: { code, message, ...extra } };
  const headers: Record<string, string> = {};
  if (extra?.retryAfter) headers['Retry-After'] = String(extra.retryAfter);
  return NextResponse.json(body, { status, headers });
}

export async function withApi<T>(
  req: NextRequest,
  handler: () => Promise<NextResponse<T> | NextResponse<ApiErrorBody>>,
): Promise<NextResponse<T> | NextResponse<ApiErrorBody>> {
  // 1. Rate-limit
  const ip = getClientIp(req);
  const rl = await rateLimit(ip);
  if (!rl.allowed) {
    return jsonError(
      'RATE_LIMITED',
      'Too many requests. Please slow down.',
      429,
      { retryAfter: rl.retryAfter },
    );
  }

  // 2. Run handler with consistent error mapping
  try {
    return await handler();
  } catch (err) {
    return mapError(err);
  }
}

export function mapError(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof PlayerNotFoundError) {
    return jsonError('PLAYER_NOT_FOUND', 'Player not found.', 404);
  }
  if (err instanceof RefreshLockedError) {
    return jsonError(
      'REFRESH_COOLDOWN',
      `Profile refresh is on cooldown. Try again in ${err.retryAfterSeconds}s.`,
      429,
      { retryAfter: err.retryAfterSeconds },
    );
  }
  if (err instanceof RiotNotFoundError) {
    return jsonError('NOT_FOUND', 'Resource not found on Riot API.', 404);
  }
  if (err instanceof RiotRateLimitError) {
    return jsonError(
      'UPSTREAM_RATE_LIMITED',
      'Riot API is rate limiting. Please retry shortly.',
      503,
      { retryAfter: err.retryAfter },
    );
  }
  if (err instanceof RiotApiError) {
    return jsonError(
      'UPSTREAM_ERROR',
      `Riot API error (${err.status}).`,
      502,
    );
  }
  const e = err as Error;
  logger.error('unhandled api error', { msg: e?.message, stack: e?.stack });
  return jsonError('INTERNAL', 'Unexpected server error.', 500);
}

export function validateRegion(region: string): string | null {
  if (!region || !isPlatformRegion(region)) {
    return 'Invalid region. Use one of: BR1, NA1, EUW1, EUN1, KR, JP1, LA1, LA2, OC1, TR1, RU.';
  }
  return null;
}
