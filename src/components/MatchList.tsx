'use client';

import Link from 'next/link';
import {
  ddragonChampionSquareUrl,
  ddragonItemUrl,
  ddragonSummonerSpellUrl,
} from '@/lib/ddragon';
import { summonerSpellName } from '@/lib/summoner-spells';
import { formatDuration, formatRelativeTime } from '@/lib/format';
import type { MatchSummary } from '@/types/domain';

interface MatchCardProps {
  match: MatchSummary;
  ddragonVersion: string;
}

export function MatchCard({ match, ddragonVersion }: MatchCardProps) {
  const accent = match.win ? 'border-l-win bg-win/5' : 'border-l-loss bg-loss/5';
  const resultText = match.win ? 'Victory' : 'Defeat';
  const resultColor = match.win ? 'text-win' : 'text-loss';

  return (
    <Link
      href={`/match/${match.regionalRoute}/${match.matchId}`}
      className={`card card-hover block p-3 sm:p-4 border-l-4 ${accent}`}
    >
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Result + queue */}
        <div className="sm:w-28 shrink-0">
          <p className={`font-display text-sm ${resultColor}`}>{resultText}</p>
          <p className="text-xs text-text-secondary truncate">
            {match.queueLabel}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {formatRelativeTime(match.gameCreation)}
          </p>
          <p className="text-xs text-text-muted">
            {formatDuration(match.gameDuration)}
          </p>
        </div>

        {/* Champion + spells */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ddragonChampionSquareUrl(ddragonVersion, match.championName)}
              alt={match.championName}
              className="w-12 h-12 rounded border border-border"
              loading="lazy"
            />
            <span className="absolute -bottom-1 -right-1 px-1 rounded bg-bg text-[10px] font-mono border border-border">
              {match.champLevel}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {match.summonerSpells.map((spellId, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={ddragonSummonerSpellUrl(
                  ddragonVersion,
                  summonerSpellName(spellId),
                )}
                alt=""
                className="w-5 h-5 rounded-sm border border-border"
                loading="lazy"
              />
            ))}
          </div>
        </div>

        {/* KDA */}
        <div className="flex flex-col items-start sm:items-center sm:w-24">
          <p className="font-mono text-sm">
            <span className="text-text-primary">{match.kills}</span>
            <span className="text-text-muted mx-0.5">/</span>
            <span className="text-loss">{match.deaths}</span>
            <span className="text-text-muted mx-0.5">/</span>
            <span className="text-text-primary">{match.assists}</span>
          </p>
          <p className="text-xs text-text-secondary">
            <span className="font-mono">{match.kda.toFixed(2)}</span> KDA
          </p>
        </div>

        {/* CS / vision */}
        <div className="flex flex-col text-xs text-text-secondary sm:w-28">
          <span>
            CS{' '}
            <span className="text-text-primary font-mono">{match.cs}</span>{' '}
            <span className="text-text-muted">
              ({match.csPerMin.toFixed(1)}/m)
            </span>
          </span>
          <span>
            Vision{' '}
            <span className="text-text-primary font-mono">
              {match.visionScore}
            </span>
          </span>
        </div>

        {/* Items */}
        <div className="flex gap-0.5 ml-auto">
          {match.items.map((id, i) => (
            <ItemSlot key={i} itemId={id} version={ddragonVersion} />
          ))}
        </div>
      </div>
    </Link>
  );
}

function ItemSlot({ itemId, version }: { itemId: number; version: string }) {
  if (!itemId)
    return (
      <div className="w-7 h-7 rounded-sm bg-bg-elevated border border-border" />
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ddragonItemUrl(version, itemId)}
      alt=""
      className="w-7 h-7 rounded-sm border border-border"
      loading="lazy"
    />
  );
}

export function MatchList({
  matches,
  ddragonVersion,
}: {
  matches: MatchSummary[];
  ddragonVersion: string;
}) {
  if (matches.length === 0) {
    return (
      <div className="card p-8 text-center text-text-secondary">
        <p>No recent matches found.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 stagger-children">
      {matches.map((m) => (
        <MatchCard
          key={m.matchId}
          match={m}
          ddragonVersion={ddragonVersion}
        />
      ))}
    </div>
  );
}
