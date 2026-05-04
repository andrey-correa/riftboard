import Redis from 'ioredis';
import { logger } from './logger';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    enableOfflineQueue: true,
  });
  client.on('error', (err) => {
    logger.error('redis error', { message: err.message });
  });
  return client;
}

export const redis: Redis =
  globalForRedis.redis ??
  (process.env.REDIS_URL ? createRedis() : (undefined as unknown as Redis));

if (process.env.NODE_ENV !== 'production' && process.env.REDIS_URL) {
  globalForRedis.redis = redis;
}

const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';

/**
 * TTL values in seconds for each cache namespace.
 * Mandated by spec.
 */
export const TTL = {
  playerProfile: 30 * 60, // 30 min
  summoner: 30 * 60, // 30 min
  league: 10 * 60, // 10 min
  matchIds: 10 * 60, // 10 min
  matchDetail: 7 * 24 * 60 * 60, // 7 days
  champions: 24 * 60 * 60, // 24 h
  leaderboard: 5 * 60, // 5 min
  refreshLock: 120, // 120 s
  accountByPuuid: 60 * 60 * 24,
  summonerById: 60 * 60 * 24,
  // Champion analytics
  championAnalytics: 30 * 60, // 30 min
  championTierList: 30 * 60,  // 30 min
} as const;

export const KEYS = {
  playerProfile: (region: string, gameName: string, tagLine: string) =>
    `player-profile:${region}:${gameName.toLowerCase()}:${tagLine.toLowerCase()}`,
  summoner: (region: string, puuid: string) => `summoner:${region}:${puuid}`,
  leagueEntries: (region: string, summonerId: string) =>
    `league-entries:${region}:${summonerId}`,
  matchIds: (regionalRoute: string, puuid: string) =>
    `match-ids:${regionalRoute}:${puuid}`,
  matchDetail: (regionalRoute: string, matchId: string) =>
    `match-detail:${regionalRoute}:${matchId}`,
  champions: (version: string) => `champions:data-dragon:${version}`,
  leaderboard: (region: string, queue: string, tier: string) =>
    `leaderboard:${region}:${queue}:${tier}`,
  refreshLock: (region: string, puuid: string) =>
    `refresh-lock:${region}:${puuid}`,
  rateLimit: (ip: string) => `ratelimit:ip:${ip}`,
  accountByPuuid: (regionalRoute: string, puuid: string) =>
    `account-by-puuid:${regionalRoute}:${puuid}`,
  summonerById: (region: string, summonerId: string) =>
    `summoner-by-id:${region}:${summonerId}`,
  // Champion analytics — keyed by (patch, region, role, queueId[, championId])
  championOverview: (patch: string, region: string, role: string, queueId: number, championId: number) =>
    `champion-overview:${patch}:${region}:${role}:${queueId}:${championId}`,
  championBuilds: (patch: string, region: string, role: string, queueId: number, championId: number) =>
    `champion-builds:${patch}:${region}:${role}:${queueId}:${championId}`,
  championRunes: (patch: string, region: string, role: string, queueId: number, championId: number) =>
    `champion-runes:${patch}:${region}:${role}:${queueId}:${championId}`,
  championSpells: (patch: string, region: string, role: string, queueId: number, championId: number) =>
    `champion-spells:${patch}:${region}:${role}:${queueId}:${championId}`,
  championMatchups: (patch: string, region: string, role: string, queueId: number, championId: number) =>
    `champion-matchups:${patch}:${region}:${role}:${queueId}:${championId}`,
  championTierList: (patch: string, region: string, role: string, queueId: number) =>
    `champion-tier-list:${patch}:${region}:${role}:${queueId}`,
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!CACHE_ENABLED || !redis) return null;
  try {
    const raw = await redis.get(key);
    if (raw === null) {
      logger.debug('cache miss', { key });
      return null;
    }
    logger.debug('cache hit', { key });
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error('cacheGet error', { key, err: (err as Error).message });
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  if (!CACHE_ENABLED || !redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.error('cacheSet error', { key, err: (err as Error).message });
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    logger.error('cacheDel error', { key, err: (err as Error).message });
  }
}

/**
 * Acquire a TTL-bound lock. Returns true if acquired.
 * Used to enforce the "Atualizar" cooldown.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  // Fail closed: se Redis não está disponível, nega o lock para evitar
  // abuso da Riot API quando o sistema de controle de cooldown está inoperante.
  if (!redis) return false;
  try {
    const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (err) {
    logger.error('acquireLock error', { key, err: (err as Error).message });
    return false;
  }
}

export async function lockTtl(key: string): Promise<number> {
  if (!redis) return 0;
  try {
    return await redis.ttl(key);
  } catch {
    return 0;
  }
}
