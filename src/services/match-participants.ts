import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getPatchFromGameVersion } from '@/lib/patch';
import type { RiotMatchDto } from '@/lib/riot';

interface RawPerksStyle {
  description: string;
  style: number;
  selections: Array<{ perk: number; var1: number; var2: number; var3: number }>;
}

interface RawPerks {
  statPerks?: Record<string, number>;
  styles?: RawPerksStyle[];
}

function extractRuneData(perks: unknown): {
  primaryRuneStyle: number | null;
  secondaryRuneStyle: number | null;
  keystoneId: number | null;
} {
  if (!perks || typeof perks !== 'object') {
    return { primaryRuneStyle: null, secondaryRuneStyle: null, keystoneId: null };
  }

  const p = perks as RawPerks;
  const styles = p.styles;

  if (!Array.isArray(styles) || styles.length < 2) {
    return { primaryRuneStyle: null, secondaryRuneStyle: null, keystoneId: null };
  }

  const primary = styles.find((s) => s.description === 'primaryStyle');
  const secondary = styles.find((s) => s.description === 'subStyle');

  return {
    primaryRuneStyle: primary?.style ?? null,
    keystoneId: primary?.selections?.[0]?.perk ?? null,
    secondaryRuneStyle: secondary?.style ?? null,
  };
}

/**
 * Persists all 10 participants of a match to the MatchParticipant table.
 * Uses createMany + skipDuplicates so it's safe to call multiple times
 * for the same match (idempotent via the unique constraint on matchId + puuid).
 *
 * Best-effort: errors are logged but never rethrown, so a persistence failure
 * never blocks the player profile response.
 */
export async function persistMatchParticipants(
  matchId: string,
  raw: RiotMatchDto,
): Promise<void> {
  const { info } = raw;
  const patch = getPatchFromGameVersion(info.gameVersion ?? null);
  const region = info.platformId; // e.g. "KR", "BR1", "EUW1"

  // gameCreation is in milliseconds (~1.7 × 10¹²) — must be BigInt.
  const gameCreation = BigInt(info.gameCreation);

  const data = info.participants.map((p) => {
    const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
    const { primaryRuneStyle, secondaryRuneStyle, keystoneId } =
      extractRuneData(p.perks);

    return {
      matchId,
      puuid: p.puuid,
      region,
      gameName: p.riotIdGameName ?? p.riotIdName ?? p.summonerName ?? null,
      tagLine: p.riotIdTagline ?? null,
      championId: p.championId,
      championName: p.championName,
      teamId: p.teamId,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs,
      goldEarned: p.goldEarned,
      damageToChampions: p.totalDamageDealtToChampions,
      damageTaken: p.totalDamageTaken,
      visionScore: p.visionScore,
      // teamPosition is the reliable in-game position: TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY.
      // p.role is a deprecated Riot field ("CARRY", "SUPPORT") and must not be used.
      role: p.teamPosition ?? p.individualPosition ?? null,
      lane: p.lane ?? null,
      queueId: info.queueId,
      gameMode: info.gameMode,
      gameCreation,
      gameDuration: info.gameDuration,
      patch,
      item0: p.item0,
      item1: p.item1,
      item2: p.item2,
      item3: p.item3,
      item4: p.item4,
      item5: p.item5,
      item6: p.item6,
      summoner1Id: p.summoner1Id,
      summoner2Id: p.summoner2Id,
      primaryRuneStyle,
      secondaryRuneStyle,
      keystoneId,
      // Store raw perks for future use (e.g. full rune build display).
      // Prisma requires Prisma.JsonNull (not JS null) for nullable Json fields.
      rawPerks: p.perks
        ? (p.perks as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    };
  });

  try {
    const result = await prisma.matchParticipant.createMany({
      data,
      skipDuplicates: true, // idempotent — safe to call again after a retry
    });
    logger.debug('match participants persisted', {
      matchId,
      created: result.count,
      total: data.length,
    });
  } catch (err) {
    logger.error('failed to persist match participants', {
      matchId,
      err: (err as Error).message,
    });
    // Don't rethrow — participant persistence is best-effort and must never
    // block the player profile response.
  }
}
