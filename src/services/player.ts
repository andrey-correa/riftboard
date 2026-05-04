import pLimit from 'p-limit';
import {
  PlatformRegion,
  RegionalRoute,
  getRegionalRoute,
} from '@/lib/regions';
import { persistMatchParticipants } from '@/services/match-participants';
import {
  cacheGet,
  cacheSet,
  cacheDel,
  KEYS,
  TTL,
  acquireLock,
  lockTtl,
} from '@/lib/redis';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesBySummonerId,
  getMatchIdsByPuuid,
  getMatchById,
  RiotNotFoundError,
} from '@/lib/riot';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { queueLabel } from '@/lib/queues';
import type {
  PlayerProfile,
  RankInfo,
  MatchSummary,
  MatchDetail,
  MatchParticipantDetail,
} from '@/types/domain';

export class PlayerNotFoundError extends Error {
  constructor() {
    super('Player not found');
    this.name = 'PlayerNotFoundError';
  }
}

export class RefreshLockedError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`Refresh on cooldown. Retry in ${retryAfterSeconds}s.`);
    this.name = 'RefreshLockedError';
  }
}

interface LoadOptions {
  forceFresh?: boolean;
}

type CachedSummonerProfile = {
  profileIconId: number;
  summonerLevel: number;
  summonerId: string;
};

function buildRanks(
  entries: Array<{
    queueType: string;
    tier?: string | null;
    rank?: string | null;
    leaguePoints?: number | null;
    wins?: number | null;
    losses?: number | null;
    hotStreak?: boolean;
  }>,
): RankInfo[] {
  return entries.map((e) => {
    const wins = e.wins ?? 0;
    const losses = e.losses ?? 0;
    const total = wins + losses;

    return {
      queueType: e.queueType,
      tier: e.tier ?? null,
      rank: e.rank ?? null,
      leaguePoints: e.leaguePoints ?? 0,
      wins,
      losses,
      winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0,
      hotStreak: e.hotStreak,
    };
  });
}

/**
 * Load profile, using cache unless forceFresh.
 * On forceFresh, sets the refresh lock; throws RefreshLockedError if already locked.
 */
export async function loadPlayerProfile(
  region: PlatformRegion,
  gameName: string,
  tagLine: string,
  opts: LoadOptions = {},
): Promise<PlayerProfile> {
  const cacheKey = KEYS.playerProfile(region, gameName, tagLine);

  if (!opts.forceFresh) {
    const cached = await cacheGet<PlayerProfile>(cacheKey);
    if (cached) return cached;
  } else {
    const lockKey = KEYS.refreshLock(region, `${gameName}#${tagLine}`);
    const acquired = await acquireLock(lockKey, TTL.refreshLock);

    if (!acquired) {
      const ttl = await lockTtl(lockKey);
      throw new RefreshLockedError(ttl);
    }
  }

  const route = getRegionalRoute(region);
  const profile = await fetchAndPersistProfile(region, route, gameName, tagLine);

  await cacheSet(cacheKey, profile, TTL.playerProfile);

  return profile;
}

async function fetchAndPersistProfile(
  region: PlatformRegion,
  route: RegionalRoute,
  gameName: string,
  tagLine: string,
): Promise<PlayerProfile> {
  let account;

  try {
    account = await getAccountByRiotId(route, gameName, tagLine);
  } catch (err) {
    if (err instanceof RiotNotFoundError) {
      throw new PlayerNotFoundError();
    }

    throw err;
  }

  const summonerKey = KEYS.summoner(region, account.puuid);

  let summoner = await cacheGet<CachedSummonerProfile>(summonerKey);

  if (
    summoner &&
    (typeof summoner.profileIconId !== 'number' ||
      typeof summoner.summonerLevel !== 'number' ||
      typeof summoner.summonerId !== 'string')
  ) {
    logger.warn('invalid summoner cache; deleting and refetching', {
      region,
      puuid: account.puuid,
      cachedSummoner: summoner,
    });

    await cacheDel(summonerKey);
    summoner = null;
  }

  if (!summoner) {
    try {
      const raw = await getSummonerByPuuid(region, account.puuid);

      if (
        typeof raw.profileIconId !== 'number' ||
        typeof raw.summonerLevel !== 'number'
      ) {
        logger.error('summoner api response missing required profile fields', {
          region,
          puuid: account.puuid,
          raw,
        });

        throw new Error('Summoner API response missing profile fields');
      }

      summoner = {
        profileIconId: raw.profileIconId,
        summonerLevel: raw.summonerLevel,
        summonerId: raw.id,
      };

      await cacheSet(summonerKey, summoner, TTL.summoner);
    } catch (err) {
      if (err instanceof RiotNotFoundError) {
        throw new PlayerNotFoundError();
      }

      throw err;
    }
  }

  const profileIconId = summoner.profileIconId;
  const summonerLevel = summoner.summonerLevel;
  const summonerId: string = summoner.summonerId;

  type LeagueEntry = {
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    hotStreak?: boolean;
  };

  let leagueEntries: LeagueEntry[] = [];
  let hasDefinitiveRankData = false;

  const leagueKey = KEYS.leagueEntries(region, summonerId);
  const cachedLeague = await cacheGet<LeagueEntry[]>(leagueKey);

  if (cachedLeague) {
    leagueEntries = cachedLeague;
    hasDefinitiveRankData = true;
  } else {
    try {
      const riotEntries = await getLeagueEntriesBySummonerId(region, summonerId);
      leagueEntries = riotEntries.map((e) => ({
        queueType: e.queueType,
        tier: e.tier,
        rank: e.rank,
        leaguePoints: e.leaguePoints,
        wins: e.wins,
        losses: e.losses,
        hotStreak: e.hotStreak,
      }));
      await cacheSet(leagueKey, leagueEntries, TTL.league);
      hasDefinitiveRankData = true;
    } catch (err) {
      logger.warn('league entries fetch failed, preserving existing db ranks', {
        region,
        summonerId,
        err: (err as Error).message,
      });
    }
  }

  const ranks = buildRanks(leagueEntries);
  const now = new Date();

  try {
    const player = await prisma.player.upsert({
      where: { puuid: account.puuid },
      create: {
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
        region,
        summonerId,
        profileIcon: profileIconId,
        level: summonerLevel,
        lastUpdated: now,
      },
      update: {
        gameName: account.gameName,
        tagLine: account.tagLine,
        region,
        summonerId,
        profileIcon: profileIconId,
        level: summonerLevel,
        lastUpdated: now,
      },
    });

    if (hasDefinitiveRankData) {
      await prisma.playerRank.deleteMany({ where: { playerId: player.id } });

      if (ranks.length > 0) {
        await prisma.playerRank.createMany({
          data: ranks.map((r) => ({
            playerId: player.id,
            queueType: r.queueType,
            tier: r.tier,
            rank: r.rank,
            leaguePoints: r.leaguePoints,
            wins: r.wins,
            losses: r.losses,
          })),
        });
      }
    }
  } catch (err) {
    logger.error('db persist failed', {
      err: (err as Error).message,
      puuid: account.puuid,
    });
  }

  return {
    puuid: account.puuid,
    gameName: account.gameName,
    tagLine: account.tagLine,
    region,
    regionalRoute: route,
    summonerId,
    profileIconId,
    level: summonerLevel,
    ranks,
    lastUpdated: now.toISOString(),
  };
}

/**
 * Load match-id list for a player, using cache.
 */
export async function loadMatchIds(
  route: RegionalRoute,
  puuid: string,
  count = 20,
  forceFresh = false,
): Promise<string[]> {
  const key = KEYS.matchIds(route, puuid);

  if (!forceFresh) {
    const cached = await cacheGet<string[]>(key);
    if (cached) return cached.slice(0, count);
  }

  const ids = await getMatchIdsByPuuid(route, puuid, 0, count);

  await cacheSet(key, ids, TTL.matchIds);

  return ids;
}

/**
 * Load full match details, with parallel fetching of any uncached matches.
 */
export async function loadMatchSummariesForPuuid(
  route: RegionalRoute,
  puuid: string,
  count = 20,
  forceFresh = false,
): Promise<MatchSummary[]> {
  const matchIds = await loadMatchIds(route, puuid, count, forceFresh);

  const limit = pLimit(5);

  const matchDetails = await Promise.all(
    matchIds.map((id) => limit(() => loadMatchDetail(route, id))),
  );

  const summaries: MatchSummary[] = [];
  for (const m of matchDetails) {
    try {
      summaries.push(extractSummaryForPuuid(m, puuid));
    } catch (err) {
      // Player PUUID may be missing from very old or spectator matches; skip them.
      logger.warn('skipping match: puuid not found among participants', {
        matchId: m.matchId,
        puuid,
        err: (err as Error).message,
      });
    }
  }
  return summaries;
}

/**
 * Load a single match detail object. Cached for 7 days (matches are immutable).
 */
export async function loadMatchDetail(
  route: RegionalRoute,
  matchId: string,
): Promise<MatchDetail> {
  const key = KEYS.matchDetail(route, matchId);

  const cached = await cacheGet<MatchDetail>(key);
  if (cached) return cached;

  const dbHit = await prisma.match.findUnique({ where: { id: matchId } });

  if (dbHit) {
    const detail = dbHit.rawData as unknown as MatchDetail;

    await cacheSet(key, detail, TTL.matchDetail);

    return detail;
  }

  const raw = await getMatchById(route, matchId);
  const detail = normalizeMatch(raw, route);

  await cacheSet(key, detail, TTL.matchDetail);

  try {
    await prisma.match.upsert({
      where: { id: matchId },
      create: {
        id: matchId,
        regionRoute: route,
        duration: detail.gameDuration,
        rawData: detail as unknown as object,
      },
      update: {
        regionRoute: route,
        duration: detail.gameDuration,
        rawData: detail as unknown as object,
      },
    });
  } catch (err) {
    logger.error('match persist failed', {
      matchId,
      err: (err as Error).message,
    });
  }

  // Best-effort: persist participants for champion analytics.
  // Errors are caught internally and never block the response.
  void persistMatchParticipants(matchId, raw);

  return detail;
}

function normalizeMatch(
  raw: import('@/lib/riot').RiotMatchDto,
  route: RegionalRoute,
): MatchDetail {
  const blue: MatchParticipantDetail[] = [];
  const red: MatchParticipantDetail[] = [];

  for (const p of raw.info.participants) {
    const cs = p.totalMinionsKilled + p.neutralMinionsKilled;

    const detail: MatchParticipantDetail = {
      puuid: p.puuid,
      region: raw.info.platformId,
      riotIdGameName:
        p.riotIdGameName ?? p.riotIdName ?? p.summonerName ?? 'Unknown',
      riotIdTagline: p.riotIdTagline ?? '',
      championId: p.championId,
      championName: p.championName,
      champLevel: p.champLevel,
      teamId: p.teamId,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs,
      goldEarned: p.goldEarned,
      damageToChampions: p.totalDamageDealtToChampions,
      damageTaken: p.totalDamageTaken,
      visionScore: p.visionScore,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
      summonerSpells: [p.summoner1Id, p.summoner2Id],
      teamPosition: p.teamPosition || p.individualPosition || null,
    };

    if (p.teamId === 100) {
      blue.push(detail);
    } else {
      red.push(detail);
    }
  }

  const blueWin = raw.info.teams.find((t) => t.teamId === 100)?.win ?? false;
  const redWin = raw.info.teams.find((t) => t.teamId === 200)?.win ?? false;

  return {
    matchId: raw.metadata.matchId,
    regionalRoute: route,
    queueId: raw.info.queueId,
    queueLabel: queueLabel(raw.info.queueId),
    gameMode: raw.info.gameMode,
    gameCreation: raw.info.gameCreation,
    gameDuration: raw.info.gameDuration,
    platformId: raw.info.platformId,
    blueTeam: { teamId: 100, win: blueWin, participants: blue },
    redTeam: { teamId: 200, win: redWin, participants: red },
  };
}

function extractSummaryForPuuid(
  match: MatchDetail,
  puuid: string,
): MatchSummary {
  const all = [...match.blueTeam.participants, ...match.redTeam.participants];
  const me = all.find((p) => p.puuid === puuid);

  if (!me) {
    throw new Error(`Player ${puuid} not in match ${match.matchId}`);
  }

  const kda =
    me.deaths === 0
      ? me.kills + me.assists
      : (me.kills + me.assists) / me.deaths;

  const minutes = match.gameDuration / 60;
  const csPerMin = minutes > 0 ? me.cs / minutes : 0;

  return {
    matchId: match.matchId,
    regionalRoute: match.regionalRoute,
    queueId: match.queueId,
    queueLabel: match.queueLabel,
    gameMode: match.gameMode,
    gameCreation: match.gameCreation,
    gameDuration: match.gameDuration,
    win: me.win,
    championId: me.championId,
    championName: me.championName,
    champLevel: me.champLevel,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    kda: Math.round(kda * 100) / 100,
    cs: me.cs,
    csPerMin: Math.round(csPerMin * 10) / 10,
    goldEarned: me.goldEarned,
    damageToChampions: me.damageToChampions,
    visionScore: me.visionScore,
    items: me.items,
    summonerSpells: me.summonerSpells,
    teamPosition: me.teamPosition,
  };
}

/**
 * Refresh: invalidate all caches for this player and reload.
 * Returns updated profile + matches.
 */
export async function refreshPlayer(
  region: PlatformRegion,
  gameName: string,
  tagLine: string,
): Promise<{ profile: PlayerProfile; matches: MatchSummary[] }> {
  const profile = await loadPlayerProfile(region, gameName, tagLine, {
    forceFresh: true,
  });

  await Promise.all([
    cacheDel(KEYS.summoner(region, profile.puuid)),
    profile.summonerId
      ? cacheDel(KEYS.leagueEntries(region, profile.summonerId))
      : Promise.resolve(),
    cacheDel(KEYS.matchIds(profile.regionalRoute, profile.puuid)),
  ]);

  const matches = await loadMatchSummariesForPuuid(
    profile.regionalRoute,
    profile.puuid,
    20,
    true,
  );

  return { profile, matches };
}

/**
 * Default load: profile + matches, cache-first.
 */
export async function getPlayerWithMatches(
  region: PlatformRegion,
  gameName: string,
  tagLine: string,
): Promise<{ profile: PlayerProfile; matches: MatchSummary[] }> {
  const profile = await loadPlayerProfile(region, gameName, tagLine);

  const matches = await loadMatchSummariesForPuuid(
    profile.regionalRoute,
    profile.puuid,
    20,
  );

  return { profile, matches };
}