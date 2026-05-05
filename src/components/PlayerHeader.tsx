'use client';

import { useState } from 'react';
import { ddragonProfileIconUrl } from '@/lib/ddragon';
import {
  formatRelativeTime,
  queueShortLabel,
  tierColorClass,
} from '@/lib/format';
import { REGION_LABELS } from '@/lib/regions';
import type { PlayerProfile, RankInfo } from '@/types/domain';

// ---------------------------------------------------------------------------
// Rank emblem helpers
// ---------------------------------------------------------------------------

const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER']);

function rankEmblemUrl(tier: string | null): string {
  if (!tier) return '';
  const t = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
  return `https://ddragon.leagueoflegends.com/cdn/img/ranked-emblems/Emblem_${t}.png`;
}

// ---------------------------------------------------------------------------
// PlayerHeader
// ---------------------------------------------------------------------------

interface PlayerHeaderProps {
  profile: PlayerProfile;
  ddragonVersion: string;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  refreshError: string | null;
}

export function PlayerHeader({
  profile,
  ddragonVersion,
  onRefresh,
  refreshing,
  refreshError,
}: PlayerHeaderProps) {
  const solo = profile.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5') ?? null;

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        {/* Avatar */}
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ddragonProfileIconUrl(ddragonVersion, profile.profileIconId)}
            alt={`${profile.gameName} icon`}
            className="w-24 h-24 rounded-md border-2 border-accent-dim"
            loading="eager"
          />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-accent-dim text-accent-bright text-xs font-mono font-medium border border-accent whitespace-nowrap">
            {profile.level}
          </div>
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl sm:text-3xl text-accent-bright tracking-wide truncate">
              {profile.gameName}
            </h1>
            <span className="font-mono text-text-muted text-lg">
              #{profile.tagLine}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary flex-wrap">
            <span className="font-mono px-1.5 py-0.5 rounded bg-bg-elevated text-accent">
              {REGION_LABELS[profile.region]}
            </span>
            <span>·</span>
            <span>
              Updated {formatRelativeTime(new Date(profile.lastUpdated).getTime())}
            </span>
          </div>

          {/* Inline Solo/Duo rank badge */}
          {solo?.tier ? (
            <div className={`flex items-center gap-2 mt-2 text-sm ${tierColorClass(solo.tier)}`}>
              <span className="font-display font-semibold">
                {solo.tier} {!APEX_TIERS.has(solo.tier) && solo.rank}
              </span>
              <span className="font-mono text-accent-bright">{solo.leaguePoints} LP</span>
              {solo.hotStreak && (
                <span title="Hot Streak" className="text-orange-400 text-xs">🔥</span>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-text-muted">Unranked</p>
          )}
        </div>

        <RefreshButton
          onRefresh={onRefresh}
          refreshing={refreshing}
          error={refreshError}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RefreshButton
// ---------------------------------------------------------------------------

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  error: string | null;
}

export function RefreshButton({
  onRefresh,
  refreshing,
  error,
}: RefreshButtonProps) {
  return (
    <div className="flex flex-col items-end gap-1 self-stretch sm:self-auto">
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="btn-primary"
        aria-label="Atualizar perfil"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={refreshing ? 'animate-spin' : ''}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        Atualizar
      </button>
      {error && (
        <span className="text-xs text-loss max-w-[200px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RankCard
// ---------------------------------------------------------------------------

interface RankCardProps {
  rank: RankInfo | null;
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR';
}

export function RankCard({ rank, queueType }: RankCardProps) {
  const label = queueShortLabel(queueType);

  if (!rank?.tier) {
    return (
      <div className="card p-5">
        <p className="text-xs font-display text-text-secondary uppercase tracking-wider mb-4">
          {label}
        </p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center shrink-0">
            <span className="text-text-muted text-xs">—</span>
          </div>
          <p className="font-display text-lg text-text-muted">Unranked</p>
        </div>
      </div>
    );
  }

  const tierClass = tierColorClass(rank.tier);
  const total = rank.wins + rank.losses;
  const isApex = APEX_TIERS.has(rank.tier);
  const wrPct = total > 0 ? (rank.wins / total) * 100 : 0;

  return (
    <div className="card p-5">
      {/* Queue label */}
      <p className="text-xs font-display text-text-secondary uppercase tracking-wider mb-4">
        {label}
      </p>

      <div className="flex items-center gap-4">
        {/* Rank emblem */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={rankEmblemUrl(rank.tier)}
          alt={rank.tier}
          className="w-16 h-16 shrink-0 drop-shadow-lg"
          loading="lazy"
        />

        <div className="flex-1 min-w-0">
          {/* Tier + rank */}
          <div className={`font-display text-xl font-semibold ${tierClass} flex items-center gap-1.5 flex-wrap`}>
            <span>{rank.tier}</span>
            {!isApex && <span>{rank.rank}</span>}
            {rank.hotStreak && (
              <span title="Hot Streak" className="text-orange-400 text-base">🔥</span>
            )}
          </div>

          {/* LP */}
          <p className="text-sm text-text-secondary mt-0.5">
            <span className="font-mono text-accent-bright font-semibold">
              {rank.leaguePoints}
            </span>{' '}
            LP
          </p>

          {/* W / L / WR */}
          <div className="text-xs text-text-secondary mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-win font-mono">{rank.wins}W</span>
            <span className="text-loss font-mono">{rank.losses}L</span>
            <span className="text-text-muted">·</span>
            <span className={rank.winRate >= 50 ? 'text-win font-semibold' : 'text-loss'}>
              {rank.winRate}%
            </span>
            <span className="text-text-muted">({total} games)</span>
          </div>

          {/* Win rate bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-bg-elevated overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${rank.winRate >= 55 ? 'bg-win' : rank.winRate >= 50 ? 'bg-accent' : 'bg-loss'}`}
              style={{ width: `${Math.min(wrPct, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
