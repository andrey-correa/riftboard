import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface AggregateContext {
  patch: string;
  region: string;
  role: string;
  queueId: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimum sample sizes before publishing aggregates. */
export const MIN_SAMPLES = {
  overview: 20,
  build: 10,
  rune: 10,
  spell: 10,
  matchup: 5,
} as const;

function buildItemKey(
  item0: number,
  item1: number,
  item2: number,
  item3: number,
  item4: number,
  item5: number,
): string | null {
  // Take the first 3 non-zero items from slots 0-5 (slot 6 is trinket).
  const items = [item0, item1, item2, item3, item4, item5]
    .filter((i) => i > 0)
    .slice(0, 3);
  return items.length === 3 ? items.join('-') : null;
}

function buildRuneKey(
  primaryRuneStyle: number | null,
  secondaryRuneStyle: number | null,
  keystoneId: number | null,
): string | null {
  if (!primaryRuneStyle || !secondaryRuneStyle || !keystoneId) return null;
  return `${primaryRuneStyle}-${secondaryRuneStyle}-${keystoneId}`;
}

function buildSpellKey(summoner1Id: number, summoner2Id: number): string {
  return [summoner1Id, summoner2Id].sort((a, b) => a - b).join('-');
}

function difficultyLabel(winRate: number): string {
  if (winRate >= 55) return 'Easy';
  if (winRate >= 48) return 'Even';
  return 'Hard';
}

// ---------------------------------------------------------------------------
// Tier score — calculated only within the same (patch, region, role, queueId)
// ---------------------------------------------------------------------------

interface TierInput {
  winRate: number;
  pickRate: number;
  games: number;
  avgKda: number;
}

function normalizeSeries(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  return values.map((v) => (range === 0 ? 0.5 : (v - min) / range));
}

function assignTierLabels(scores: number[]): string[] {
  const sorted = [...scores].sort((a, b) => b - a);
  return scores.map((s) => {
    const rank = sorted.indexOf(s) / scores.length;
    if (rank < 0.03) return 'S+';
    if (rank < 0.10) return 'S';
    if (rank < 0.25) return 'A';
    if (rank < 0.50) return 'B';
    if (rank < 0.75) return 'C';
    return 'D';
  });
}

function applyTierScores<T extends TierInput>(rows: T[]): (T & { tierScore: number; tierLabel: string })[] {
  if (rows.length === 0) return [];
  if (rows.length === 1) {
    return [{ ...rows[0], tierScore: 0.5, tierLabel: 'B' }];
  }

  const normWin = normalizeSeries(rows.map((r) => r.winRate));
  const normPick = normalizeSeries(rows.map((r) => r.pickRate));
  const normGames = normalizeSeries(rows.map((r) => r.games));
  const normKda = normalizeSeries(rows.map((r) => r.avgKda));

  const scores = rows.map((_, i) =>
    normWin[i] * 0.50 + normPick[i] * 0.25 + normGames[i] * 0.15 + normKda[i] * 0.10,
  );
  const labels = assignTierLabels(scores);

  return rows.map((r, i) => ({ ...r, tierScore: scores[i], tierLabel: labels[i] }));
}

// ---------------------------------------------------------------------------
// ChampionAggregate — raw SQL group-by for efficiency
// ---------------------------------------------------------------------------

type RawChampionRow = {
  championId: number;
  championName: string;
  games: bigint;
  wins: bigint;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgKda: number;
  avgCs: number;
  avgGold: number;
  avgDamage: number;
  avgVision: number;
};

async function recalculateChampionAggregates(
  ctx: AggregateContext,
): Promise<void> {
  const { patch, region, role, queueId } = ctx;

  const totalParticipants = await prisma.matchParticipant.count({
    where: { patch, region, role, queueId },
  });
  if (totalParticipants < MIN_SAMPLES.overview) return;

  const rows = await prisma.$queryRaw<RawChampionRow[]>`
    SELECT
      "championId",
      MAX("championName")                                         AS "championName",
      COUNT(*)                                                    AS games,
      SUM(CASE WHEN win THEN 1 ELSE 0 END)                       AS wins,
      AVG(kills)                                                  AS "avgKills",
      AVG(deaths)                                                 AS "avgDeaths",
      AVG(assists)                                                AS "avgAssists",
      AVG((kills + assists)::float / GREATEST(deaths, 1))        AS "avgKda",
      AVG(cs)                                                     AS "avgCs",
      AVG("goldEarned")                                           AS "avgGold",
      AVG("damageToChampions")                                    AS "avgDamage",
      AVG("visionScore")                                          AS "avgVision"
    FROM "MatchParticipant"
    WHERE patch  = ${patch}
      AND region = ${region}
      AND role   = ${role}
      AND "queueId" = ${queueId}
    GROUP BY "championId"
    HAVING COUNT(*) >= ${MIN_SAMPLES.overview}
    ORDER BY COUNT(*) DESC
  `;

  const mapped = rows.map((r) => {
    const games = Number(r.games);
    const wins = Number(r.wins);
    return {
      championId: r.championId,
      championName: r.championName,
      patch,
      region,
      role,
      queueId,
      games,
      wins,
      winRate: games > 0 ? (wins / games) * 100 : 0,
      pickRate: (games / totalParticipants) * 100,
      avgKills: Number(r.avgKills ?? 0),
      avgDeaths: Number(r.avgDeaths ?? 0),
      avgAssists: Number(r.avgAssists ?? 0),
      avgKda: Number(r.avgKda ?? 0),
      avgCs: Number(r.avgCs ?? 0),
      avgGold: Number(r.avgGold ?? 0),
      avgDamage: Number(r.avgDamage ?? 0),
      avgVision: Number(r.avgVision ?? 0),
    };
  });

  const withTier = applyTierScores(mapped);

  await prisma.$transaction([
    prisma.championAggregate.deleteMany({ where: { patch, region, role, queueId } }),
    prisma.championAggregate.createMany({ data: withTier }),
  ]);

  logger.info('champion aggregates saved', { patch, region, role, queueId, count: withTier.length });
}

// ---------------------------------------------------------------------------
// ChampionBuildAggregate
// ---------------------------------------------------------------------------

async function recalculateBuildAggregates(ctx: AggregateContext): Promise<void> {
  const { patch, region, role, queueId } = ctx;

  const participants = await prisma.matchParticipant.findMany({
    where: { patch, region, role, queueId },
    select: {
      championId: true, championName: true, win: true,
      kills: true, deaths: true, assists: true,
      item0: true, item1: true, item2: true,
      item3: true, item4: true, item5: true,
    },
  });

  // Group by championId + itemBuildKey
  const map = new Map<string, { championId: number; championName: string; itemBuildKey: string; itemIds: number[]; games: number; wins: number; kdaSum: number }>();

  for (const p of participants) {
    const key = buildItemKey(p.item0, p.item1, p.item2, p.item3, p.item4, p.item5);
    if (!key) continue;
    const mapKey = `${p.championId}||${key}`;
    const existing = map.get(mapKey);
    const kda = (p.kills + p.assists) / Math.max(p.deaths, 1);
    if (existing) {
      existing.games++;
      if (p.win) existing.wins++;
      existing.kdaSum += kda;
    } else {
      const itemIds = key.split('-').map(Number);
      map.set(mapKey, {
        championId: p.championId,
        championName: p.championName,
        itemBuildKey: key,
        itemIds,
        games: 1,
        wins: p.win ? 1 : 0,
        kdaSum: kda,
      });
    }
  }

  const totalByChampion = new Map<number, number>();
  for (const v of map.values()) {
    totalByChampion.set(v.championId, (totalByChampion.get(v.championId) ?? 0) + v.games);
  }

  const data = Array.from(map.values())
    .filter((v) => v.games >= MIN_SAMPLES.build)
    .map((v) => ({
      championId: v.championId,
      championName: v.championName,
      patch, region, role, queueId,
      itemBuildKey: v.itemBuildKey,
      itemIds: v.itemIds,
      games: v.games,
      wins: v.wins,
      winRate: (v.wins / v.games) * 100,
      pickRate: (v.games / (totalByChampion.get(v.championId) ?? 1)) * 100,
      avgKda: v.kdaSum / v.games,
    }));

  await prisma.$transaction([
    prisma.championBuildAggregate.deleteMany({ where: { patch, region, role, queueId } }),
    prisma.championBuildAggregate.createMany({ data }),
  ]);

  logger.info('build aggregates saved', { patch, region, role, queueId, count: data.length });
}

// ---------------------------------------------------------------------------
// ChampionRuneAggregate
// ---------------------------------------------------------------------------

async function recalculateRuneAggregates(ctx: AggregateContext): Promise<void> {
  const { patch, region, role, queueId } = ctx;

  const participants = await prisma.matchParticipant.findMany({
    where: { patch, region, role, queueId },
    select: {
      championId: true, championName: true, win: true,
      primaryRuneStyle: true, secondaryRuneStyle: true, keystoneId: true,
    },
  });

  const map = new Map<string, { championId: number; championName: string; runeKey: string; primaryRuneStyle: number; secondaryRuneStyle: number; keystoneId: number; games: number; wins: number }>();

  for (const p of participants) {
    const key = buildRuneKey(p.primaryRuneStyle, p.secondaryRuneStyle, p.keystoneId);
    if (!key) continue;
    const mapKey = `${p.championId}||${key}`;
    const existing = map.get(mapKey);
    if (existing) {
      existing.games++;
      if (p.win) existing.wins++;
    } else {
      map.set(mapKey, {
        championId: p.championId,
        championName: p.championName,
        runeKey: key,
        primaryRuneStyle: p.primaryRuneStyle!,
        secondaryRuneStyle: p.secondaryRuneStyle!,
        keystoneId: p.keystoneId!,
        games: 1,
        wins: p.win ? 1 : 0,
      });
    }
  }

  const totalByChampion = new Map<number, number>();
  for (const v of map.values()) {
    totalByChampion.set(v.championId, (totalByChampion.get(v.championId) ?? 0) + v.games);
  }

  const data = Array.from(map.values())
    .filter((v) => v.games >= MIN_SAMPLES.rune)
    .map((v) => ({
      ...v,
      patch, region, role, queueId,
      winRate: (v.wins / v.games) * 100,
      pickRate: (v.games / (totalByChampion.get(v.championId) ?? 1)) * 100,
    }));

  await prisma.$transaction([
    prisma.championRuneAggregate.deleteMany({ where: { patch, region, role, queueId } }),
    prisma.championRuneAggregate.createMany({ data }),
  ]);

  logger.info('rune aggregates saved', { patch, region, role, queueId, count: data.length });
}

// ---------------------------------------------------------------------------
// ChampionSpellAggregate
// ---------------------------------------------------------------------------

async function recalculateSpellAggregates(ctx: AggregateContext): Promise<void> {
  const { patch, region, role, queueId } = ctx;

  const participants = await prisma.matchParticipant.findMany({
    where: { patch, region, role, queueId },
    select: {
      championId: true, championName: true, win: true,
      summoner1Id: true, summoner2Id: true,
    },
  });

  const map = new Map<string, { championId: number; championName: string; spellKey: string; summoner1Id: number; summoner2Id: number; games: number; wins: number }>();

  for (const p of participants) {
    const key = buildSpellKey(p.summoner1Id, p.summoner2Id);
    const mapKey = `${p.championId}||${key}`;
    const existing = map.get(mapKey);
    if (existing) {
      existing.games++;
      if (p.win) existing.wins++;
    } else {
      const sorted = [p.summoner1Id, p.summoner2Id].sort((a, b) => a - b);
      map.set(mapKey, {
        championId: p.championId,
        championName: p.championName,
        spellKey: key,
        summoner1Id: sorted[0],
        summoner2Id: sorted[1],
        games: 1,
        wins: p.win ? 1 : 0,
      });
    }
  }

  const totalByChampion = new Map<number, number>();
  for (const v of map.values()) {
    totalByChampion.set(v.championId, (totalByChampion.get(v.championId) ?? 0) + v.games);
  }

  const data = Array.from(map.values())
    .filter((v) => v.games >= MIN_SAMPLES.spell)
    .map((v) => ({
      ...v,
      patch, region, role, queueId,
      winRate: (v.wins / v.games) * 100,
      pickRate: (v.games / (totalByChampion.get(v.championId) ?? 1)) * 100,
    }));

  await prisma.$transaction([
    prisma.championSpellAggregate.deleteMany({ where: { patch, region, role, queueId } }),
    prisma.championSpellAggregate.createMany({ data }),
  ]);

  logger.info('spell aggregates saved', { patch, region, role, queueId, count: data.length });
}

// ---------------------------------------------------------------------------
// ChampionMatchupAggregate
// ---------------------------------------------------------------------------

async function recalculateMatchupAggregates(ctx: AggregateContext): Promise<void> {
  const { patch, region, role, queueId } = ctx;

  // Fetch all participants for this context, grouped by matchId + teamId.
  const participants = await prisma.matchParticipant.findMany({
    where: { patch, region, role, queueId },
    select: { matchId: true, teamId: true, championId: true, championName: true, win: true },
    orderBy: [{ matchId: 'asc' }, { teamId: 'asc' }],
  });

  // Group by matchId to find blue (100) vs red (200) participants per role.
  const byMatch = new Map<string, { blue: typeof participants[number][]; red: typeof participants[number][] }>();
  for (const p of participants) {
    let entry = byMatch.get(p.matchId);
    if (!entry) { entry = { blue: [], red: [] }; byMatch.set(p.matchId, entry); }
    if (p.teamId === 100) entry.blue.push(p); else entry.red.push(p);
  }

  // For each match, pair blue[0] vs red[0] (same role, same match).
  const map = new Map<string, { championId: number; championName: string; oppId: number; oppName: string; games: number; wins: number }>();

  for (const { blue, red } of byMatch.values()) {
    const b = blue[0];
    const r = red[0];
    if (!b || !r) continue;

    const addMatchup = (attacker: typeof b, defender: typeof b) => {
      const key = `${attacker.championId}||${defender.championId}`;
      const existing = map.get(key);
      if (existing) {
        existing.games++;
        if (attacker.win) existing.wins++;
      } else {
        map.set(key, {
          championId: attacker.championId,
          championName: attacker.championName,
          oppId: defender.championId,
          oppName: defender.championName,
          games: 1,
          wins: attacker.win ? 1 : 0,
        });
      }
    };

    addMatchup(b, r);
    addMatchup(r, b);
  }

  const data = Array.from(map.values())
    .filter((v) => v.games >= MIN_SAMPLES.matchup)
    .map((v) => {
      const wr = (v.wins / v.games) * 100;
      return {
        championId: v.championId,
        championName: v.championName,
        opponentChampionId: v.oppId,
        opponentChampionName: v.oppName,
        patch, region, role, queueId,
        games: v.games,
        wins: v.wins,
        winRate: wr,
        difficultyLabel: difficultyLabel(wr),
      };
    });

  await prisma.$transaction([
    prisma.championMatchupAggregate.deleteMany({ where: { patch, region, role, queueId } }),
    prisma.championMatchupAggregate.createMany({ data }),
  ]);

  logger.info('matchup aggregates saved', { patch, region, role, queueId, count: data.length });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Recalculates ALL champion aggregates for a given context.
 *
 * Designed to be called:
 *   - via the admin endpoint POST /api/admin/champions/recalculate
 *   - or in a scheduled background job
 *
 * Each sub-aggregate uses deleteMany + createMany inside a transaction,
 * so failures are isolated and leave the previous data intact.
 */
export async function recalculateForContext(ctx: AggregateContext): Promise<void> {
  logger.info('starting champion aggregate recalculation', { ...ctx });
  const t0 = Date.now();

  await Promise.allSettled([
    recalculateChampionAggregates(ctx).catch((err) =>
      logger.error('champion aggregate failed', { ...ctx, err: (err as Error).message }),
    ),
    recalculateBuildAggregates(ctx).catch((err) =>
      logger.error('build aggregate failed', { ...ctx, err: (err as Error).message }),
    ),
    recalculateRuneAggregates(ctx).catch((err) =>
      logger.error('rune aggregate failed', { ...ctx, err: (err as Error).message }),
    ),
    recalculateSpellAggregates(ctx).catch((err) =>
      logger.error('spell aggregate failed', { ...ctx, err: (err as Error).message }),
    ),
    recalculateMatchupAggregates(ctx).catch((err) =>
      logger.error('matchup aggregate failed', { ...ctx, err: (err as Error).message }),
    ),
  ]);

  logger.info('champion aggregate recalculation done', { ...ctx, ms: Date.now() - t0 });
}

/**
 * Recalculates aggregates for every distinct (patch, region, role, queueId)
 * context present in MatchParticipant.
 */
export async function recalculateAllContexts(): Promise<void> {
  const contexts = await prisma.matchParticipant.findMany({
    where: {
      patch: { not: null },
      role: { not: null },
    },
    distinct: ['patch', 'region', 'role', 'queueId'],
    select: { patch: true, region: true, role: true, queueId: true },
  });

  logger.info('recalculating all contexts', { total: contexts.length });

  for (const ctx of contexts) {
    if (!ctx.patch || !ctx.role) continue;
    await recalculateForContext({
      patch: ctx.patch,
      region: ctx.region,
      role: ctx.role,
      queueId: ctx.queueId,
    });
  }
}
