/**
 * POST /api/admin/champions/ingest
 *
 * Popula MatchParticipant a partir de partidas reais do leaderboard,
 * depois dispara recalculateAllContexts() para gerar os agregados.
 *
 * Body (todos opcionais):
 *   region          – plataforma (default: "BR1")
 *   tier            – "challenger" | "grandmaster" | "master" (default: "challenger")
 *   queue           – queue string (default: "RANKED_SOLO_5x5")
 *   queueId         – queue ID numérico (default: 420)
 *   playerLimit     – máximo de players do leaderboard (default: 10)
 *   matchesPerPlayer – máximo de partidas por player (default: 10)
 *
 * TODO: proteger esta rota com autenticação antes de produção.
 */

import { NextRequest, NextResponse } from 'next/server';
import pLimit from 'p-limit';
import { Prisma } from '@prisma/client';
import {
  getApexLeague,
  getSummonerById,
  getMatchIdsByPuuid,
  getMatchById,
  type RiotMatchDto,
} from '@/lib/riot';
import { getRegionalRoute, isPlatformRegion } from '@/lib/regions';
import { persistMatchParticipants } from '@/services/match-participants';
import { recalculateAllContexts } from '@/services/champion-aggregates';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { ApexTier } from '@/lib/riot';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes — fine locally

// ────────────────────────────────────────────────────────────────────────────
// GET /api/admin/champions/ingest
// Re-processa matches já no banco (Match.rawData) sem chamar a Riot API.
// Útil para popular MatchParticipant a partir de partidas já armazenadas.
// ────────────────────────────────────────────────────────────────────────────

// Normalized MatchDetail shape stored in Match.rawData
interface StoredParticipant {
  puuid: string;
  region: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
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
  summonerSpells: number[];
  teamPosition?: string | null;
}
interface StoredMatchDetail {
  matchId: string;
  queueId: number;
  gameMode: string;
  platformId: string;
  gameCreation: number;
  gameDuration: number;
  blueTeam: { teamId: number; win: boolean; participants: StoredParticipant[] };
  redTeam: { teamId: number; win: boolean; participants: StoredParticipant[] };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const batchSize = Math.min(Number(sp.get('batchSize') ?? 163), 500);

  logger.info('ingest reprocess: starting', { batchSize });

  // Only process matches not yet in MatchParticipant
  const processedMatchIds = await prisma.matchParticipant
    .findMany({ distinct: ['matchId'], select: { matchId: true } })
    .then((rows) => rows.map((r) => r.matchId));

  const matches = await prisma.match.findMany({
    where: { id: { notIn: processedMatchIds } },
    select: { id: true, rawData: true },
    take: batchSize,
  });

  logger.info('ingest reprocess: matches to process', {
    total: matches.length,
    alreadyDone: processedMatchIds.length,
  });

  let matchesReprocessed = 0;
  let participantsCreated = 0;
  let skipped = 0;

  for (const match of matches) {
    try {
      const stored = match.rawData as unknown as StoredMatchDetail;
      const allParticipants = [
        ...(stored.blueTeam?.participants ?? []),
        ...(stored.redTeam?.participants ?? []),
      ];
      if (!allParticipants.length) { skipped++; continue; }

      const data = allParticipants.map((p) => ({
        matchId: match.id,
        puuid: p.puuid,
        region: p.region ?? stored.platformId,
        gameName: p.riotIdGameName ?? null,
        tagLine: p.riotIdTagline ?? null,
        championId: p.championId,
        championName: p.championName,
        teamId: p.teamId,
        win: p.win,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        cs: p.cs,
        goldEarned: p.goldEarned,
        damageToChampions: p.damageToChampions,
        damageTaken: p.damageTaken,
        visionScore: p.visionScore,
        role: p.teamPosition ?? null, // teamPosition = TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY
        lane: null,
        queueId: stored.queueId,
        gameMode: stored.gameMode,
        gameCreation: BigInt(stored.gameCreation),
        gameDuration: stored.gameDuration,
        patch: null, // gameVersion not stored in normalized format
        item0: p.items?.[0] ?? 0,
        item1: p.items?.[1] ?? 0,
        item2: p.items?.[2] ?? 0,
        item3: p.items?.[3] ?? 0,
        item4: p.items?.[4] ?? 0,
        item5: p.items?.[5] ?? 0,
        item6: p.items?.[6] ?? 0,
        summoner1Id: p.summonerSpells?.[0] ?? 0,
        summoner2Id: p.summonerSpells?.[1] ?? 0,
        primaryRuneStyle: null,
        secondaryRuneStyle: null,
        keystoneId: null,
        rawPerks: Prisma.JsonNull,
      }));

      const result = await prisma.matchParticipant.createMany({
        data,
        skipDuplicates: true,
      });

      matchesReprocessed++;
      participantsCreated += result.count;
    } catch (err) {
      logger.error('ingest reprocess: failed', { matchId: match.id, err: (err as Error).message });
      skipped++;
    }
  }

  logger.info('ingest reprocess: done', { matchesReprocessed, participantsCreated, skipped });

  // Recalculate aggregates — only contexts with non-null patch and role
  await recalculateAllContexts();

  return NextResponse.json({
    ok: true,
    matchesReprocessed,
    participantsCreated,
    skipped,
  });
}

const VALID_TIERS = new Set<ApexTier>(['challenger', 'grandmaster', 'master']);

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — all params have defaults
  }

  const region = String(body.region ?? 'BR1').toUpperCase();
  if (!isPlatformRegion(region)) {
    return NextResponse.json({ error: `Invalid region: ${region}` }, { status: 400 });
  }

  const tierRaw = String(body.tier ?? 'challenger').toLowerCase() as ApexTier;
  if (!VALID_TIERS.has(tierRaw)) {
    return NextResponse.json(
      { error: 'tier must be challenger | grandmaster | master' },
      { status: 400 },
    );
  }

  const queue = String(body.queue ?? 'RANKED_SOLO_5x5');
  const queueId = Number(body.queueId ?? 420);
  const playerLimit = Math.min(Number(body.playerLimit ?? 10), 50);
  const matchesPerPlayer = Math.min(Number(body.matchesPerPlayer ?? 10), 20);

  const route = getRegionalRoute(region as Parameters<typeof getRegionalRoute>[0]);

  logger.info('champion ingest started', { region, tier: tierRaw, queue, playerLimit, matchesPerPlayer });

  // ── 1. Fetch leaderboard ────────────────────────────────────────────────────
  let league;
  try {
    league = await getApexLeague(region as Parameters<typeof getApexLeague>[0], tierRaw, queue);
  } catch (err) {
    logger.error('ingest: failed to fetch leaderboard', { err: (err as Error).message });
    return NextResponse.json({ error: 'Failed to fetch leaderboard from Riot API' }, { status: 502 });
  }

  const topPlayers = [...league.entries]
    .sort((a, b) => b.leaguePoints - a.leaguePoints)
    .slice(0, playerLimit);

  logger.info('ingest: leaderboard fetched', { total: league.entries.length, processing: topPlayers.length });

  // ── 2. Resolve PUUIDs ───────────────────────────────────────────────────────
  // The apex league response may include puuid directly (new Riot API behavior).
  // Fall back to getSummonerById when puuid is absent.
  const puuidLimit = pLimit(3);

  const playerPuuids = await Promise.all(
    topPlayers.map((p) =>
      puuidLimit(async () => {
        if (p.puuid) return p.puuid;
        if (!p.summonerId) return null;
        try {
          const summoner = await getSummonerById(
            region as Parameters<typeof getSummonerById>[0],
            p.summonerId,
          );
          return summoner.puuid;
        } catch (err) {
          logger.warn('ingest: failed to resolve puuid', {
            summonerId: p.summonerId,
            err: (err as Error).message,
          });
          return null;
        }
      }),
    ),
  );

  const validPuuids = playerPuuids.filter((p): p is string => p !== null);
  logger.info('ingest: puuids resolved', { resolved: validPuuids.length });

  // ── 3. Fetch match IDs per player ───────────────────────────────────────────
  const matchLimit = pLimit(2); // conservative concurrency to respect rate limits

  let matchesProcessed = 0;
  let participantsCreated = 0;
  const errors: string[] = [];

  for (const puuid of validPuuids) {
    let matchIds: string[];
    try {
      matchIds = await getMatchIdsByPuuid(route, puuid, 0, matchesPerPlayer, queueId);
    } catch (err) {
      logger.warn('ingest: failed to fetch match ids', { puuid, err: (err as Error).message });
      errors.push(`match-ids:${puuid.slice(0, 8)}: ${(err as Error).message}`);
      continue;
    }

    // ── 4. Fetch raw match + upsert Match + persist participants ─────────────
    const results = await Promise.allSettled(
      matchIds.map((matchId) =>
        matchLimit(async () => {
          const raw = await getMatchById(route, matchId);

          // MatchParticipant has a FK to Match — upsert the Match row first
          // so persistMatchParticipants never fails with a FK constraint error.
          await prisma.match.upsert({
            where: { id: matchId },
            create: {
              id: matchId,
              regionRoute: route,
              duration: raw.info.gameDuration,
              rawData: raw as unknown as object,
            },
            update: {
              duration: raw.info.gameDuration,
            },
          });

          await persistMatchParticipants(matchId, raw);
          return raw.info.participants.length;
        }),
      ),
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        matchesProcessed++;
        participantsCreated += r.value;
      } else {
        errors.push((r.reason as Error).message?.slice(0, 80) ?? 'unknown');
      }
    }

    logger.info('ingest: player done', { puuid: puuid.slice(0, 8), matchIds: matchIds.length });
  }

  logger.info('ingest: persistence complete', { matchesProcessed, participantsCreated, errors: errors.length });

  // ── 5. Recalculate all analytics aggregates ─────────────────────────────────
  try {
    await recalculateAllContexts();
    logger.info('ingest: recalculation complete');
  } catch (err) {
    logger.error('ingest: recalculation failed', { err: (err as Error).message });
    errors.push(`recalculate: ${(err as Error).message}`);
  }

  return NextResponse.json({
    ok: true,
    region,
    tier: tierRaw,
    queue,
    playersProcessed: validPuuids.length,
    matchesProcessed,
    participantsCreated,
    errors: errors.slice(0, 20),
  });
}
