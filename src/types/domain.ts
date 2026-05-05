/**
 * Normalized domain types. These are what our internal API exposes -
 * never the raw Riot payload.
 */

import type { PlatformRegion, RegionalRoute } from '@/lib/regions';

export interface RankInfo {
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR' | string;
  tier: string | null;
  rank: string | null;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: number;
  hotStreak?: boolean;
}

export interface PlayerProfile {
  puuid: string;
  gameName: string;
  tagLine: string;
  region: PlatformRegion;
  regionalRoute: RegionalRoute;
  summonerId: string | null;
  profileIconId: number;
  level: number;
  ranks: RankInfo[];
  lastUpdated: string; // ISO
}

export interface MatchSummary {
  matchId: string;
  regionalRoute: RegionalRoute;
  queueId: number;
  queueLabel: string;
  gameMode: string;
  gameCreation: number;
  gameDuration: number;
  win: boolean;
  championId: number;
  championName: string;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  csPerMin: number;
  goldEarned: number;
  damageToChampions: number;
  visionScore: number;
  items: number[]; // length 7 (item0..item6)
  summonerSpells: [number, number]; // (summoner1Id, summoner2Id)
  teamPosition: string | null;
}

export interface MatchParticipantDetail {
  puuid: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  champLevel: number;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  goldEarned: number;
  damageToChampions: number;
  damageTaken: number;
  visionScore: number;
  items: number[];
  summonerSpells: [number, number];
  teamPosition: string | null;
  region?: string | null;
}

export interface MatchDetail {
  matchId: string;
  regionalRoute: RegionalRoute;
  queueId: number;
  queueLabel: string;
  gameMode: string;
  gameCreation: number;
  gameDuration: number;
  platformId: string;
  blueTeam: {
    teamId: 100;
    win: boolean;
    participants: MatchParticipantDetail[];
  };
  redTeam: {
    teamId: 200;
    win: boolean;
    participants: MatchParticipantDetail[];
  };
}

export interface ChampionListItem {
  id: string; // e.g. "Aatrox"
  key: string; // numeric key as string
  name: string;
  title: string;
  blurb: string;
  tags: string[];
  difficulty: number; // 1..10
  imageUrl: string;
  splashUrl: string;
}

export interface ChampionsResponse {
  version: string;
  champions: ChampionListItem[];
}

export type LeaderboardEntry = {
  rank: number;
  region?: string | null;
  puuid?: string | null;
  summonerId?: string | null;
  gameName?: string | null;
  tagLine?: string | null;
  displayName?: string | null;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: number;
  tier: string;
  rankInTier?: string;
  hotStreak: boolean;
};

// ---------------------------------------------------------------------------
// Champion analytics DTOs
// ---------------------------------------------------------------------------

export interface InsufficientDataDto {
  isInsufficientData: true;
  games: number;
  minimumRequiredGames: number;
  message: string;
}

export interface ChampionOverviewDto {
  isInsufficientData: false;
  championId: number;
  championName: string;
  patch: string;
  region: string;
  role: string;
  queueId: number;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKda: number;
  avgCs: number;
  avgGold: number;
  avgDamage: number;
  avgVision: number;
  tierScore: number | null;
  tierLabel: string | null;
}

export interface ChampionBuildDto {
  itemBuildKey: string;
  itemIds: number[];
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  avgKda: number;
}

export interface ChampionRuneDto {
  runeKey: string;
  primaryRuneStyle: number;
  secondaryRuneStyle: number;
  keystoneId: number;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
}

export interface ChampionSpellDto {
  spellKey: string;
  summoner1Id: number;
  summoner2Id: number;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
}

export interface ChampionMatchupDto {
  opponentChampionId: number;
  opponentChampionName: string;
  games: number;
  wins: number;
  winRate: number;
  difficultyLabel: string;
}

export interface ChampionTierEntryDto {
  championId: number;
  championName: string;
  role: string;
  games: number;
  winRate: number;
  pickRate: number;
  avgKda: number;
  tierScore: number | null;
  tierLabel: string | null;
}

export interface ChampionTierListDto {
  patch: string | null;
  region: string;
  role: string;
  queueId: number;
  entries: ChampionTierEntryDto[];
}

export interface LeaderboardResponse {
  region: PlatformRegion;
  queue: string;
  tier: 'CHALLENGER' | 'GRANDMASTER' | 'MASTER';
  entries: LeaderboardEntry[];
  total: number;
}
