import { redis, KEYS } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { NextRequest } from 'next/server';

const LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 60);
const WINDOW = 60; // seconds

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

/**
 * Sliding-ish window rate limit using a Redis counter with EX on first hit.
 */
export async function rateLimit(ip: string): Promise<RateLimitResult> {
  if (!redis) return { allowed: true, remaining: LIMIT, retryAfter: 0 };
  const key = KEYS.rateLimit(ip);
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW);
    }
    if (count > LIMIT) {
      const ttl = await redis.ttl(key);
      logger.warn('rate limit hit', { ip, count });
      return { allowed: false, remaining: 0, retryAfter: Math.max(ttl, 1) };
    }
    return {
      allowed: true,
      remaining: Math.max(0, LIMIT - count),
      retryAfter: 0,
    };
  } catch (err) {
    logger.error('rate limit error', { err: (err as Error).message });
    return { allowed: true, remaining: LIMIT, retryAfter: 0 };
  }
}

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}
