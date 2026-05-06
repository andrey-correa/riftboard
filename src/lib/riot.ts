import {
  PlatformRegion,
  RegionalRoute,
  platformHost,
  regionalHost,
} from '@/lib/regions';
import { logger } from '@/lib/logger';

export class RiotApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
  ) {
    super(message);
    this.name = 'RiotApiError';
  }
}

export class RiotNotFoundError extends RiotApiError {
  constructor(endpoint: string) {
    super('Resource not found', 404, endpoint);
    this.name = 'RiotNotFoundError';
  }
}

export class RiotRateLimitError extends RiotApiError {
  constructor(endpoint: string, public retryAfter: number) {
    super('Rate limited by Riot API', 429, endpoint);
    this.name = 'RiotRateLimitError';
  }
}

interface RequestOptions {
  /** Used solely for log/debug context */
  endpoint: string;
  url: string;
  retries?: number;
}

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 400;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function riotRequest<T>(opts: RequestOptions): Promise<T> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw new Error('RIOT_API_KEY is not configured');
  }

  const retries = opts.retries ?? MAX_RETRIES;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(opts.url, {
        headers: {
          'X-Riot-Token': apiKey,
          Accept: 'application/json',
        },
        // Disable Next.js fetch caching - we manage cache ourselves via Redis
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      // AbortSignal.timeout() throws a DOMException (TimeoutError/AbortError).
      // Convert to RiotApiError so mapError can handle it as a structured 504.
      const isTimeout =
        err instanceof DOMException &&
        (err.name === 'TimeoutError' || err.name === 'AbortError');

      logger.warn('riot fetch network error', {
        attempt,
        endpoint: opts.endpoint,
        timeout: isTimeout,
        err: (err as Error).message,
      });

      if (attempt === retries) {
        if (isTimeout) {
          throw new RiotApiError(
            `Riot request timed out after ${MAX_RETRIES + 1} attempts`,
            504,
            opts.endpoint,
          );
        }
        throw err;
      }
      await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt));
      continue;
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (res.status === 404) {
      throw new RiotNotFoundError(opts.endpoint);
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get('Retry-After') ?? '1');
      logger.warn('riot rate limited', {
        endpoint: opts.endpoint,
        retryAfter,
        attempt,
      });
      if (attempt === retries) {
        throw new RiotRateLimitError(opts.endpoint, retryAfter);
      }
      await sleep(retryAfter * 1000);
      continue;
    }

    if (res.status >= 500 && res.status < 600) {
      logger.warn('riot server error', {
        endpoint: opts.endpoint,
        status: res.status,
        attempt,
      });
      if (attempt === retries) {
        throw new RiotApiError(
          `Riot server error ${res.status}`,
          res.status,
          opts.endpoint,
        );
      }
      await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt));
      continue;
    }

    // 4xx other than 404/429 - don't retry
    const body = await res.text().catch(() => '');
    logger.error('riot request failed', {
      endpoint: opts.endpoint,
      status: res.status,
      body: body.slice(0, 200),
    });
    throw new RiotApiError(
      `Riot API error ${res.status}`,
      res.status,
      opts.endpoint,
    );
  }
  // Unreachable, but TS needs it
  throw new RiotApiError('exhausted retries', 500, opts.endpoint);
}

// ---------- Account-V1 (regional) ----------

export interface RiotAccountDto {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export async function getAccountByRiotId(
  route: RegionalRoute,
  gameName: string,
  tagLine: string,
): Promise<RiotAccountDto> {
  const endpoint = `/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`;
  const url = `${regionalHost(route)}${endpoint.replace(
    `${gameName}/${tagLine}`,
    `${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  )}`;
  return riotRequest<RiotAccountDto>({ endpoint, url });
}

export async function getAccountByPuuid(
  route: RegionalRoute,
  puuid: string,
): Promise<RiotAccountDto> {
  const endpoint = `/riot/account/v1/accounts/by-puuid/${puuid}`;
  const url = `${regionalHost(route)}/riot/account/v1/accounts/by-puuid/${encodeURIComponent(
    puuid,
  )}`;

  return riotRequest<RiotAccountDto>({ endpoint, url });
}


// ---------- Summoner-V4 (platform) ----------

export interface RiotSummonerDto {
  id: string; // encrypted summoner id
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export async function getSummonerByPuuid(
  platform: PlatformRegion,
  puuid: string,
): Promise<RiotSummonerDto> {
  const endpoint = `/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const url = `${platformHost(platform)}${endpoint}`;
  return riotRequest<RiotSummonerDto>({ endpoint, url });
}

export async function getSummonerById(
  platform: PlatformRegion,
  summonerId: string,
): Promise<RiotSummonerDto> {
  const endpoint = `/lol/summoner/v4/summoners/${encodeURIComponent(summonerId)}`;
  const url = `${platformHost(platform)}${endpoint}`;

  return riotRequest<RiotSummonerDto>({ endpoint, url });
}

// ---------- League-V4 (platform) ----------

export interface RiotLeagueEntryDto {
  leagueId?: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran?: boolean;
  inactive?: boolean;
  freshBlood?: boolean;
  hotStreak?: boolean;
}

export async function getLeagueEntriesBySummonerId(
  platform: PlatformRegion,
  summonerId: string,
): Promise<RiotLeagueEntryDto[]> {
  const endpoint = `/lol/league/v4/entries/by-summoner/${summonerId}`;
  const url = `${platformHost(platform)}${endpoint}`;
  return riotRequest<RiotLeagueEntryDto[]>({ endpoint, url });
}

export interface RiotLeagueListItem {
  puuid?: string;
  summonerId?: string;
  leaguePoints: number;
  rank: string;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface RiotLeagueListDto {
  tier: string;
  leagueId: string;
  queue: string;
  name: string;
  entries: RiotLeagueListItem[];
}

export type ApexTier = 'challenger' | 'grandmaster' | 'master';

export async function getApexLeague(
  platform: PlatformRegion,
  tier: ApexTier,
  queue: string,
): Promise<RiotLeagueListDto> {
  const endpoint = `/lol/league/v4/${tier}leagues/by-queue/${queue}`;
  const url = `${platformHost(platform)}${endpoint}`;
  return riotRequest<RiotLeagueListDto>({ endpoint, url });
}

// ---------- Match-V5 (regional) ----------

export async function getMatchIdsByPuuid(
  route: RegionalRoute,
  puuid: string,
  start = 0,
  count = 20,
  queue?: number,
): Promise<string[]> {
  let qs = `start=${start}&count=${count}`;
  if (queue != null) qs += `&queue=${queue}`;
  const endpoint = `/lol/match/v5/matches/by-puuid/${puuid}/ids?${qs}`;
  const url = `${regionalHost(route)}${endpoint}`;
  return riotRequest<string[]>({ endpoint, url });
}

// We only model the fields we actually use downstream.
export interface RiotMatchDto {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameStartTimestamp: number;
    gameEndTimestamp?: number;
    gameMode: string;
    gameType: string;
    gameVersion?: string;
    queueId: number;
    mapId: number;
    platformId: string;
    participants: RiotMatchParticipantDto[];
    teams: RiotMatchTeamDto[];
  };
}

export interface RiotMatchParticipantDto {
  puuid: string;
  summonerId?: string;
  summonerName?: string;
  riotIdGameName?: string;
  riotIdName?: string;
  riotIdTagline?: string;
  championId: number;
  championName: string;
  champLevel: number;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  visionScore: number;
  summoner1Id: number;
  summoner2Id: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  perks?: unknown;
  teamPosition?: string;
  individualPosition?: string;
  lane?: string;
  role?: string;
}

export interface RiotMatchTeamDto {
  teamId: number;
  win: boolean;
  objectives?: unknown;
  bans?: { championId: number; pickTurn: number }[];
}

export async function getMatchById(
  route: RegionalRoute,
  matchId: string,
): Promise<RiotMatchDto> {
  const endpoint = `/lol/match/v5/matches/${matchId}`;
  const url = `${regionalHost(route)}${endpoint}`;
  return riotRequest<RiotMatchDto>({ endpoint, url });
}
