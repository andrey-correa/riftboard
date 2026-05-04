'use client';

import type {
  PlayerProfile,
  MatchSummary,
  MatchDetail,
  ChampionsResponse,
  LeaderboardResponse,
  ChampionOverviewDto,
  ChampionBuildDto,
  ChampionRuneDto,
  ChampionSpellDto,
  ChampionMatchupDto,
  ChampionTierListDto,
  InsufficientDataDto,
} from '@/types/domain';

export interface ApiError {
  code: string;
  message: string;
  retryAfter?: number;
}

export class ClientApiError extends Error implements ApiError {
  code: string;
  retryAfter?: number;
  constructor(code: string, message: string, retryAfter?: number) {
    super(message);
    this.code = code;
    this.retryAfter = retryAfter;
    this.name = 'ClientApiError';
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let body: { error?: ApiError } = {};
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  throw new ClientApiError(
    body.error?.code ?? 'UNKNOWN',
    body.error?.message ?? `Request failed (${res.status})`,
    body.error?.retryAfter,
  );
}

export async function fetchPlayer(
  region: string,
  gameName: string,
  tagLine: string,
): Promise<{ profile: PlayerProfile; matches: MatchSummary[] }> {
  const res = await fetch(
    `/api/players/${region}/${encodeURIComponent(
      gameName,
    )}/${encodeURIComponent(tagLine)}`,
    { cache: 'no-store' },
  );
  return handle(res);
}

export async function refreshPlayerApi(
  region: string,
  gameName: string,
  tagLine: string,
): Promise<{ profile: PlayerProfile; matches: MatchSummary[] }> {
  const res = await fetch(
    `/api/players/${region}/${encodeURIComponent(
      gameName,
    )}/${encodeURIComponent(tagLine)}/refresh`,
    { method: 'POST' },
  );
  return handle(res);
}

export async function fetchMatch(
  regionalRoute: string,
  matchId: string,
): Promise<MatchDetail> {
  const res = await fetch(`/api/matches/${regionalRoute}/${matchId}`, {
    cache: 'no-store',
  });
  return handle(res);
}

export async function fetchChampions(): Promise<ChampionsResponse> {
  const res = await fetch('/api/champions', { cache: 'no-store' });
  return handle(res);
}

export async function fetchRankings(
  region: string,
  queue: string,
  tier: string,
): Promise<LeaderboardResponse> {
  const res = await fetch(`/api/rankings/${region}/${queue}/${tier}`, {
    cache: 'no-store',
  });
  return handle(res);
}

// ---------------------------------------------------------------------------
// Champion analytics
// ---------------------------------------------------------------------------

export interface ChampionQueryParams {
  region?: string;
  role?: string;
  queueId?: number;
  patch?: string;
}

function buildChampionQs(params: ChampionQueryParams): string {
  const sp = new URLSearchParams();
  if (params.region) sp.set('region', params.region);
  if (params.role) sp.set('role', params.role);
  if (params.queueId) sp.set('queueId', String(params.queueId));
  if (params.patch) sp.set('patch', params.patch);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchChampionOverview(
  championId: number | string,
  params: ChampionQueryParams = {},
): Promise<ChampionOverviewDto | InsufficientDataDto> {
  const res = await fetch(
    `/api/champions/${championId}/overview${buildChampionQs(params)}`,
    { cache: 'no-store' },
  );
  return handle<ChampionOverviewDto | InsufficientDataDto>(res);
}

export async function fetchChampionBuilds(
  championId: number | string,
  params: ChampionQueryParams = {},
): Promise<ChampionBuildDto[] | InsufficientDataDto> {
  const res = await fetch(
    `/api/champions/${championId}/builds${buildChampionQs(params)}`,
    { cache: 'no-store' },
  );
  return handle<ChampionBuildDto[] | InsufficientDataDto>(res);
}

export async function fetchChampionRunes(
  championId: number | string,
  params: ChampionQueryParams = {},
): Promise<ChampionRuneDto[] | InsufficientDataDto> {
  const res = await fetch(
    `/api/champions/${championId}/runes${buildChampionQs(params)}`,
    { cache: 'no-store' },
  );
  return handle<ChampionRuneDto[] | InsufficientDataDto>(res);
}

export async function fetchChampionSpells(
  championId: number | string,
  params: ChampionQueryParams = {},
): Promise<ChampionSpellDto[] | InsufficientDataDto> {
  const res = await fetch(
    `/api/champions/${championId}/spells${buildChampionQs(params)}`,
    { cache: 'no-store' },
  );
  return handle<ChampionSpellDto[] | InsufficientDataDto>(res);
}

export async function fetchChampionMatchups(
  championId: number | string,
  params: ChampionQueryParams = {},
): Promise<ChampionMatchupDto[] | InsufficientDataDto> {
  const res = await fetch(
    `/api/champions/${championId}/matchups${buildChampionQs(params)}`,
    { cache: 'no-store' },
  );
  return handle<ChampionMatchupDto[] | InsufficientDataDto>(res);
}

export async function fetchChampionTierList(params: {
  region?: string;
  role?: string;
  queueId?: number;
  patch?: string;
} = {}): Promise<ChampionTierListDto> {
  const sp = new URLSearchParams();
  if (params.region) sp.set('region', params.region);
  if (params.role) sp.set('role', params.role);
  if (params.queueId) sp.set('queueId', String(params.queueId));
  if (params.patch) sp.set('patch', params.patch);
  const qs = sp.toString();
  const res = await fetch(
    `/api/champions/tier-list${qs ? `?${qs}` : ''}`,
    { cache: 'no-store' },
  );
  return handle<ChampionTierListDto>(res);
}
