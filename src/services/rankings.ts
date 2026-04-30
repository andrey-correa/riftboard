import { PlatformRegion, getRegionalRoute } from '@/lib/regions';
import { cacheGet, cacheSet, KEYS, TTL } from '@/lib/redis';
import {
  getApexLeague,
  getAccountByPuuid,
  getSummonerById,
  ApexTier,
} from '@/lib/riot';
import type { LeaderboardEntry, LeaderboardResponse } from '@/types/domain';

export type ApexTierUpper = 'CHALLENGER' | 'GRANDMASTER' | 'MASTER';

const TIER_TO_LOWER: Record<ApexTierUpper, ApexTier> = {
  CHALLENGER: 'challenger',
  GRANDMASTER: 'grandmaster',
  MASTER: 'master',
};

type RiotLeaderboardEntryWithPossibleIds = {
  puuid?: string;
  summonerId?: string;
  leaguePoints: number;
  rank: string;
  wins: number;
  losses: number;
  veteran?: boolean;
  inactive?: boolean;
  freshBlood?: boolean;
  hotStreak?: boolean;
};

async function resolvePuuidFromSummonerId(
  region: PlatformRegion,
  summonerId?: string | null,
): Promise<string | null> {
  if (!summonerId) return null;

  const cacheKey = KEYS.summonerById(region, summonerId);

  const cached = await cacheGet<{ puuid: string }>(cacheKey);

  if (cached?.puuid) {
    return cached.puuid;
  }

  try {
    const summoner = await getSummonerById(region, summonerId);

    if (!summoner?.puuid) {
      return null;
    }

    await cacheSet(cacheKey, { puuid: summoner.puuid }, TTL.summonerById);

    return summoner.puuid;
  } catch (err) {
    console.error('FAILED_SUMMONER_LOOKUP', {
      region,
      summonerId,
      error: err,
    });

    return null;
  }
}

async function resolveAccountName(params: {
  region: PlatformRegion;
  regionalRoute: ReturnType<typeof getRegionalRoute>;
  puuid?: string | null;
  summonerId?: string | null;
}): Promise<{
  puuid: string | null;
  gameName: string | null;
  tagLine: string | null;
  displayName: string;
}> {
  const puuid =
    params.puuid ??
    (await resolvePuuidFromSummonerId(params.region, params.summonerId));

  if (!puuid) {
    return {
      puuid: null,
      gameName: null,
      tagLine: null,
      displayName: 'Summoner desconhecido',
    };
  }

  const cacheKey = KEYS.accountByPuuid(params.regionalRoute, puuid);

  const cached = await cacheGet<{
    puuid: string;
    gameName: string | null;
    tagLine: string | null;
    displayName: string;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const account = await getAccountByPuuid(params.regionalRoute, puuid);

    const gameName = account.gameName ?? null;
    const tagLine = account.tagLine ?? null;

    const normalized = {
      puuid,
      gameName,
      tagLine,
      displayName:
        gameName && tagLine
          ? `${gameName}#${tagLine}`
          : 'Summoner desconhecido',
    };

    await cacheSet(cacheKey, normalized, TTL.accountByPuuid);

    return normalized;
  } catch (err) {
    console.error('FAILED_ACCOUNT_LOOKUP', {
      regionalRoute: params.regionalRoute,
      puuid,
      error: err,
    });

    return {
      puuid,
      gameName: null,
      tagLine: null,
      displayName: 'Summoner desconhecido',
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

export async function getLeaderboard(
  region: PlatformRegion,
  queue: string,
  tier: ApexTierUpper,
): Promise<LeaderboardResponse> {
  const key = KEYS.leaderboard(region, queue, tier);
  const cached = await cacheGet<LeaderboardResponse>(key);

  if (cached) {
    return cached;
  }

  const data = await getApexLeague(region, TIER_TO_LOWER[tier], queue);

  console.log('RAW_RIOT_LEADERBOARD_FIRST_ENTRY', data.entries[0]);

  const regionalRoute = getRegionalRoute(region);

 const sorted = [...data.entries].sort(
  (a, b) => b.leaguePoints - a.leaguePoints,
) as RiotLeaderboardEntryWithPossibleIds[];

// TEMPORÁRIO PARA TESTE: buscar nomes apenas do top 5
const topEntries = sorted.slice(0, 10);

const entries: LeaderboardEntry[] = await mapWithConcurrency(
  topEntries,
  2,
  async (entry, idx) => {
      const total = entry.wins + entry.losses;

      const account = await resolveAccountName({
        region,
        regionalRoute,
        puuid: entry.puuid ?? null,
        summonerId: entry.summonerId ?? null,
      });

      return {
        rank: idx + 1,
        region,
        puuid: account.puuid,
        summonerId: entry.summonerId ?? null,
        gameName: account.gameName,
        tagLine: account.tagLine,
        displayName: account.displayName,
        leaguePoints: entry.leaguePoints,
        wins: entry.wins,
        losses: entry.losses,
        winRate: total > 0 ? Math.round((entry.wins / total) * 1000) / 10 : 0,
        tier: data.tier,
        rankInTier: entry.rank,
        hotStreak: entry.hotStreak ?? false,
      };
    },
  );

  const response: LeaderboardResponse = {
    region,
    queue,
    tier,
    entries,
    total: entries.length,
  };

  await cacheSet(key, response, TTL.leaderboard);

  return response;
}