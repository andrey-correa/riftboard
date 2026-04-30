import { cacheGet, cacheSet, KEYS, TTL } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { DDRAGON_BASE_URL, ddragonChampionSplashUrl } from '@/lib/ddragon';
import type { ChampionListItem, ChampionsResponse } from '@/types/domain';

const VERSIONS_URL = `${DDRAGON_BASE_URL}/api/versions.json`;
const DDRAGON_VERSION_KEY = 'champions:ddragon-version';
const DDRAGON_VERSION_TTL = 60 * 60; // 1 hora — patches saem a cada 2 semanas

interface DDragonChampionEntry {
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  tags: string[];
  info: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
  image: { full: string };
}

interface DDragonChampionsPayload {
  type: string;
  format: string;
  version: string;
  data: Record<string, DDragonChampionEntry>;
}

async function fetchLatestVersion(): Promise<string> {
  const cached = await cacheGet<string>(DDRAGON_VERSION_KEY);
  if (cached) return cached;

  const res = await fetch(VERSIONS_URL, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`DDragon versions fetch failed: ${res.status}`);
  const versions = (await res.json()) as string[];
  const version = versions[0];

  await cacheSet(DDRAGON_VERSION_KEY, version, DDRAGON_VERSION_TTL);
  logger.debug('ddragon version cached', { version });

  return version;
}

async function fetchChampionsFromDDragon(
  version: string,
): Promise<ChampionListItem[]> {
  const url = `${DDRAGON_BASE_URL}/cdn/${version}/data/en_US/champion.json`;
  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`DDragon champions fetch failed: ${res.status}`);
  }
  const payload = (await res.json()) as DDragonChampionsPayload;

  return Object.values(payload.data)
    .map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      title: c.title,
      blurb: c.blurb,
      tags: c.tags,
      difficulty: c.info.difficulty,
      imageUrl: `${DDRAGON_BASE_URL}/cdn/${version}/img/champion/${c.image.full}`,
      splashUrl: ddragonChampionSplashUrl(c.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get all champions, cached for 24h. Always reflects latest patch.
 */
export async function getAllChampions(): Promise<ChampionsResponse> {
  // We use a single key per version. We discover the version, then look up by version.
  const version = await fetchLatestVersion();
  const key = KEYS.champions(version);

  const cached = await cacheGet<ChampionListItem[]>(key);
  if (cached) {
    return { version, champions: cached };
  }

  try {
    const champions = await fetchChampionsFromDDragon(version);
    await cacheSet(key, champions, TTL.champions);
    return { version, champions };
  } catch (err) {
    logger.error('champions fetch failed', { err: (err as Error).message });
    throw err;
  }
}

// Re-export client-safe URL builders for convenience.
export {
  ddragonChampionSquareUrl,
  ddragonItemUrl,
  ddragonProfileIconUrl,
  ddragonSummonerSpellUrl,
} from '@/lib/ddragon';
