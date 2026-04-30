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
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ddragonProfileIconUrl(ddragonVersion, profile.profileIconId)}
            alt={`${profile.gameName} icon`}
            className="w-24 h-24 rounded-md border-2 border-accent-dim"
            loading="eager"
          />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-accent-dim text-accent-bright text-xs font-mono font-medium border border-accent">
            {profile.level}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl sm:text-3xl text-accent-bright tracking-wide truncate">
              {profile.gameName}
            </h1>
            <span className="font-mono text-text-muted text-lg">
              #{profile.tagLine}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary">
            <span className="font-mono px-1.5 py-0.5 rounded bg-bg-elevated text-accent">
              {REGION_LABELS[profile.region]}
            </span>
            <span>·</span>
            <span>
              Updated {formatRelativeTime(new Date(profile.lastUpdated).getTime())}
            </span>
          </div>
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

interface RankCardProps {
  rank: RankInfo | null;
  queueType: 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR';
}

export function RankCard({ rank, queueType }: RankCardProps) {
  if (!rank) {
    return (
      <div className="card p-5">
        <h3 className="font-display text-sm text-text-secondary uppercase tracking-wider mb-3">
          {queueShortLabel(queueType)}
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center">
            <span className="text-text-muted text-xs">—</span>
          </div>
          <div>
            <p className="font-display text-lg text-text-muted">Unranked</p>
          </div>
        </div>
      </div>
    );
  }

  const total = rank.wins + rank.losses;
  const tierClass = tierColorClass(rank.tier);

  return (
    <div className="card p-5">
      <h3 className="font-display text-sm text-text-secondary uppercase tracking-wider mb-3">
        {queueShortLabel(queueType)}
      </h3>
      <div className="flex items-center gap-4">
        <div
          className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center font-display ${tierClass}`}
          style={{ borderColor: 'currentColor' }}
        >
          <span className="text-[10px] uppercase tracking-wider opacity-80">
            {rank.tier}
          </span>
          <span className="text-base font-bold leading-none mt-0.5">
            {rank.rank}
          </span>
        </div>
        <div className="flex-1">
          <p className={`font-display text-xl ${tierClass}`}>
            {rank.tier} {rank.rank}
          </p>
          <p className="text-sm text-text-secondary mt-0.5">
            <span className="font-mono text-accent-bright">
              {rank.leaguePoints}
            </span>{' '}
            LP
          </p>
          <div className="text-xs text-text-secondary mt-1">
            <span className="text-win">{rank.wins}W</span>{' '}
            <span className="text-loss">{rank.losses}L</span>{' '}
            <span className="text-text-muted">·</span>{' '}
            <span className={rank.winRate >= 50 ? 'text-win' : 'text-loss'}>
              {rank.winRate}%
            </span>{' '}
            <span className="text-text-muted">({total} games)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
