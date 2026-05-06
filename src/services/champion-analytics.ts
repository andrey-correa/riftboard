/**
 * champion-analytics.ts — cache-first reads para dados de campeão.
 *
 * Fluxo: Redis → ChampionAggregate DB → InsufficientDataDto
 *
 * Nunca chama a Riot API diretamente.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { cacheGet, cacheSet, KEYS, TTL } from '@/lib/redis';
import { MIN_SAMPLES } from '@/services/champion-aggregates';
import type {
  ChampionOverviewDto,
  ChampionBuildDto,
  ChampionRuneDto,
  ChampionSpellDto,
  ChampionMatchupDto,
  ChampionTierListDto,
  ChampionTierEntryDto,
  InsufficientDataDto,
} from '@/types/domain';

export interface AnalyticsContext {
  patch: string;
  region: string;
  role: string;
  queueId: number;
}

// ---------------------------------------------------------------------------
// Patch resolution — sorts "15.10" > "15.9" correctly via numeric split
// ---------------------------------------------------------------------------

export async function resolveLatestPatch(
  region: string,
  role: string | undefined,
  queueId: number,
  championId?: number,
): Promise<string | null> {
  // Prisma.sql is required for conditional SQL fragments —
  // prisma.$queryRaw returns a PrismaPromise, not a Sql fragment,
  // and embedding it inside another $queryRaw produces a syntax error.
  const championFilter = championId != null
    ? Prisma.sql`AND "championId" = ${championId}`
    : Prisma.sql``;

  // Only filter by role when explicitly provided — omitting it lets us find
  // the latest patch regardless of role (used when role is not yet known).
  const roleFilter = role
    ? Prisma.sql`AND role = ${role}`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<{ patch: string }[]>`
    SELECT patch
    FROM "ChampionAggregate"
    WHERE region    = ${region}
      AND "queueId" = ${queueId}
      ${roleFilter}
      ${championFilter}
    GROUP BY patch
    ORDER BY
      CAST(SPLIT_PART(patch, '.', 1) AS INTEGER) DESC,
      CAST(SPLIT_PART(patch, '.', 2) AS INTEGER) DESC
    LIMIT 1
  `;
  return rows[0]?.patch ?? null;
}

/** Returns the most-played role for a champion in the given context, or null. */
export async function resolveBestRole(
  championId: number,
  patch: string,
  region: string,
  queueId: number,
): Promise<string | null> {
  const row = await prisma.championAggregate.findFirst({
    where: { championId, patch, region, queueId },
    orderBy: { games: 'desc' },
    select: { role: true },
  });
  return row?.role ?? null;
}

// ---------------------------------------------------------------------------
// Insufficient data helper
// ---------------------------------------------------------------------------

function insufficientData(games: number, min: number): InsufficientDataDto {
  return {
    isInsufficientData: true,
    games,
    minimumRequiredGames: min,
    message: `Dados insuficientes para este campeão neste patch. (${games}/${min} partidas)`,
  };
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export async function getChampionOverview(
  championId: number,
  ctx: AnalyticsContext,
): Promise<ChampionOverviewDto | InsufficientDataDto> {
  const cacheKey = KEYS.championOverview(ctx.patch, ctx.region, ctx.role, ctx.queueId, championId);
  const cached = await cacheGet<ChampionOverviewDto | InsufficientDataDto>(cacheKey);
  if (cached) return cached;

  const row = await prisma.championAggregate.findUnique({
    where: {
      championId_patch_region_role_queueId: {
        championId, patch: ctx.patch, region: ctx.region,
        role: ctx.role, queueId: ctx.queueId,
      },
    },
  });

  const result: ChampionOverviewDto | InsufficientDataDto = row && row.games >= MIN_SAMPLES.overview
    ? {
        isInsufficientData: false,
        championId: row.championId,
        championName: row.championName,
        patch: row.patch,
        region: row.region,
        role: row.role,
        queueId: row.queueId,
        games: row.games,
        wins: row.wins,
        winRate: row.winRate,
        pickRate: row.pickRate,
        avgKills: row.avgKills,
        avgDeaths: row.avgDeaths,
        avgAssists: row.avgAssists,
        avgKda: row.avgKda,
        avgCs: row.avgCs,
        avgGold: row.avgGold,
        avgDamage: row.avgDamage,
        avgVision: row.avgVision,
        tierScore: row.tierScore,
        tierLabel: row.tierLabel,
      }
    : insufficientData(row?.games ?? 0, MIN_SAMPLES.overview);

  await cacheSet(cacheKey, result, TTL.championAnalytics);
  return result;
}

// ---------------------------------------------------------------------------
// Builds
// ---------------------------------------------------------------------------

export async function getChampionBuilds(
  championId: number,
  ctx: AnalyticsContext,
): Promise<ChampionBuildDto[] | InsufficientDataDto> {
  const cacheKey = KEYS.championBuilds(ctx.patch, ctx.region, ctx.role, ctx.queueId, championId);
  const cached = await cacheGet<ChampionBuildDto[] | InsufficientDataDto>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.championBuildAggregate.findMany({
    where: { championId, patch: ctx.patch, region: ctx.region, role: ctx.role, queueId: ctx.queueId },
    orderBy: { games: 'desc' },
    take: 10,
  });

  const result: ChampionBuildDto[] | InsufficientDataDto = rows.length > 0
    ? rows.map((r) => ({
        itemBuildKey: r.itemBuildKey,
        itemIds: r.itemIds,
        games: r.games,
        wins: r.wins,
        winRate: r.winRate,
        pickRate: r.pickRate,
        avgKda: r.avgKda,
      }))
    : insufficientData(0, MIN_SAMPLES.build);

  await cacheSet(cacheKey, result, TTL.championAnalytics);
  return result;
}

// ---------------------------------------------------------------------------
// Runes
// ---------------------------------------------------------------------------

export async function getChampionRunes(
  championId: number,
  ctx: AnalyticsContext,
): Promise<ChampionRuneDto[] | InsufficientDataDto> {
  const cacheKey = KEYS.championRunes(ctx.patch, ctx.region, ctx.role, ctx.queueId, championId);
  const cached = await cacheGet<ChampionRuneDto[] | InsufficientDataDto>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.championRuneAggregate.findMany({
    where: { championId, patch: ctx.patch, region: ctx.region, role: ctx.role, queueId: ctx.queueId },
    orderBy: { games: 'desc' },
    take: 10,
  });

  const result: ChampionRuneDto[] | InsufficientDataDto = rows.length > 0
    ? rows.map((r) => ({
        runeKey: r.runeKey,
        primaryRuneStyle: r.primaryRuneStyle,
        secondaryRuneStyle: r.secondaryRuneStyle,
        keystoneId: r.keystoneId,
        games: r.games,
        wins: r.wins,
        winRate: r.winRate,
        pickRate: r.pickRate,
      }))
    : insufficientData(0, MIN_SAMPLES.rune);

  await cacheSet(cacheKey, result, TTL.championAnalytics);
  return result;
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

export async function getChampionSpells(
  championId: number,
  ctx: AnalyticsContext,
): Promise<ChampionSpellDto[] | InsufficientDataDto> {
  const cacheKey = KEYS.championSpells(ctx.patch, ctx.region, ctx.role, ctx.queueId, championId);
  const cached = await cacheGet<ChampionSpellDto[] | InsufficientDataDto>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.championSpellAggregate.findMany({
    where: { championId, patch: ctx.patch, region: ctx.region, role: ctx.role, queueId: ctx.queueId },
    orderBy: { games: 'desc' },
    take: 10,
  });

  const result: ChampionSpellDto[] | InsufficientDataDto = rows.length > 0
    ? rows.map((r) => ({
        spellKey: r.spellKey,
        summoner1Id: r.summoner1Id,
        summoner2Id: r.summoner2Id,
        games: r.games,
        wins: r.wins,
        winRate: r.winRate,
        pickRate: r.pickRate,
      }))
    : insufficientData(0, MIN_SAMPLES.spell);

  await cacheSet(cacheKey, result, TTL.championAnalytics);
  return result;
}

// ---------------------------------------------------------------------------
// Matchups
// ---------------------------------------------------------------------------

export async function getChampionMatchups(
  championId: number,
  ctx: AnalyticsContext,
): Promise<ChampionMatchupDto[] | InsufficientDataDto> {
  const cacheKey = KEYS.championMatchups(ctx.patch, ctx.region, ctx.role, ctx.queueId, championId);
  const cached = await cacheGet<ChampionMatchupDto[] | InsufficientDataDto>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.championMatchupAggregate.findMany({
    where: { championId, patch: ctx.patch, region: ctx.region, role: ctx.role, queueId: ctx.queueId },
    orderBy: { games: 'desc' },
    take: 20,
  });

  const result: ChampionMatchupDto[] | InsufficientDataDto = rows.length > 0
    ? rows.map((r) => ({
        opponentChampionId: r.opponentChampionId,
        opponentChampionName: r.opponentChampionName,
        games: r.games,
        wins: r.wins,
        winRate: r.winRate,
        difficultyLabel: r.difficultyLabel,
      }))
    : insufficientData(0, MIN_SAMPLES.matchup);

  await cacheSet(cacheKey, result, TTL.championAnalytics);
  return result;
}

// ---------------------------------------------------------------------------
// Tier list
// ---------------------------------------------------------------------------

export async function getChampionTierList(
  ctx: AnalyticsContext,
): Promise<ChampionTierListDto> {
  const cacheKey = KEYS.championTierList(ctx.patch, ctx.region, ctx.role, ctx.queueId);
  const cached = await cacheGet<ChampionTierListDto>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.championAggregate.findMany({
    where: {
      patch: ctx.patch,
      region: ctx.region,
      role: ctx.role,
      queueId: ctx.queueId,
      games: { gte: MIN_SAMPLES.overview },
    },
    orderBy: [{ tierScore: 'desc' }, { winRate: 'desc' }],
  });

  const entries: ChampionTierEntryDto[] = rows.map((r) => ({
    championId: r.championId,
    championName: r.championName,
    role: r.role,
    games: r.games,
    winRate: r.winRate,
    pickRate: r.pickRate,
    avgKda: r.avgKda,
    tierScore: r.tierScore,
    tierLabel: r.tierLabel,
  }));

  const result: ChampionTierListDto = {
    patch: ctx.patch,
    region: ctx.region,
    role: ctx.role,
    queueId: ctx.queueId,
    entries,
  };

  await cacheSet(cacheKey, result, TTL.championTierList);
  return result;
}
