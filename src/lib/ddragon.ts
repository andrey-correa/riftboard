/**
 * Pure URL builders for Riot's Data Dragon CDN.
 * No server-only dependencies - safe to import from client components.
 */

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';

export function ddragonChampionSquareUrl(
  version: string,
  championName: string,
): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${championName}.png`;
}

export function ddragonItemUrl(version: string, itemId: number): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/item/${itemId}.png`;
}

export function ddragonProfileIconUrl(
  version: string,
  iconId: number,
): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/profileicon/${iconId}.png`;
}

export function ddragonSummonerSpellUrl(
  version: string,
  spellName: string,
): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/spell/${spellName}.png`;
}

export function ddragonChampionSplashUrl(championId: string): string {
  return `${DDRAGON_BASE}/cdn/img/champion/splash/${championId}_0.jpg`;
}

export const DDRAGON_BASE_URL = DDRAGON_BASE;
