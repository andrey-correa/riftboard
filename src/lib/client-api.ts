'use client';

import type {
  PlayerProfile,
  MatchSummary,
  MatchDetail,
  ChampionsResponse,
  LeaderboardResponse,
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
