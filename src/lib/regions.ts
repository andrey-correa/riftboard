/**
 * Riot API has two routing systems:
 *  - "platform" routes for summoner/league endpoints (e.g. br1.api.riotgames.com)
 *  - "regional" routes for account/match endpoints (e.g. americas.api.riotgames.com)
 */

export const PLATFORM_REGIONS = [
  'BR1',
  'NA1',
  'EUW1',
  'EUN1',
  'KR',
  'JP1',
  'LA1',
  'LA2',
  'OC1',
  'TR1',
  'RU',
] as const;

export type PlatformRegion = (typeof PLATFORM_REGIONS)[number];

export const REGIONAL_ROUTES = ['americas', 'europe', 'asia', 'sea'] as const;
export type RegionalRoute = (typeof REGIONAL_ROUTES)[number];

const PLATFORM_TO_REGIONAL: Record<PlatformRegion, RegionalRoute> = {
  BR1: 'americas',
  NA1: 'americas',
  LA1: 'americas',
  LA2: 'americas',
  EUW1: 'europe',
  EUN1: 'europe',
  TR1: 'europe',
  RU: 'europe',
  KR: 'asia',
  JP1: 'asia',
  OC1: 'sea',
};

export const REGION_LABELS: Record<PlatformRegion, string> = {
  BR1: 'BR',
  NA1: 'NA',
  EUW1: 'EUW',
  EUN1: 'EUNE',
  KR: 'KR',
  JP1: 'JP',
  LA1: 'LAN',
  LA2: 'LAS',
  OC1: 'OCE',
  TR1: 'TR',
  RU: 'RU',
};

export function isPlatformRegion(value: string): value is PlatformRegion {
  return (PLATFORM_REGIONS as readonly string[]).includes(value.toUpperCase());
}

export function normalizePlatform(value: string): PlatformRegion | null {
  const up = value.toUpperCase();
  return isPlatformRegion(up) ? (up as PlatformRegion) : null;
}

export function getRegionalRoute(platform: string): RegionalRoute {
  const normalized = normalizePlatform(platform);
  if (!normalized) {
    throw new Error(`Invalid platform region: ${platform}`);
  }
  return PLATFORM_TO_REGIONAL[normalized];
}

export function platformHost(platform: PlatformRegion): string {
  return `https://${platform.toLowerCase()}.api.riotgames.com`;
}

export function regionalHost(route: RegionalRoute): string {
  return `https://${route}.api.riotgames.com`;
}
