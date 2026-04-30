'use client';

import { useEffect, useState } from 'react';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { fetchRankings, ClientApiError } from '@/lib/client-api';
import {
  PLATFORM_REGIONS,
  REGION_LABELS,
  type PlatformRegion,
} from '@/lib/regions';
import type { LeaderboardResponse } from '@/types/domain';

const QUEUES = [
  { value: 'RANKED_SOLO_5x5', label: 'Solo/Duo' },
  { value: 'RANKED_FLEX_SR', label: 'Flex' },
] as const;

const TIERS = ['CHALLENGER', 'GRANDMASTER', 'MASTER'] as const;

export function RankingsView() {
  const [region, setRegion] = useState<PlatformRegion>('BR1');
  const [queue, setQueue] = useState<string>('RANKED_SOLO_5x5');
  const [tier, setTier] = useState<(typeof TIERS)[number]>('CHALLENGER');

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRankings(region, queue, tier)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ClientApiError) setError(err.message);
        else setError('Failed to load leaderboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region, queue, tier]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">
            Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as PlatformRegion)}
            className="input font-mono text-sm cursor-pointer"
          >
            {PLATFORM_REGIONS.map((r) => (
              <option key={r} value={r}>
                {REGION_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">
            Queue
          </label>
          <div className="flex gap-1">
            {QUEUES.map((q) => (
              <button
                key={q.value}
                onClick={() => setQueue(q.value)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  queue === q.value
                    ? 'bg-accent-dim border-accent text-accent-bright'
                    : 'border-border text-text-secondary hover:border-border-strong'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">
            Tier
          </label>
          <div className="flex gap-1">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  tier === t
                    ? 'bg-accent-dim border-accent text-accent-bright'
                    : 'border-border text-text-secondary hover:border-border-strong'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {data && (
          <p className="ml-auto text-xs text-text-muted font-mono">
            {data.total} entries
          </p>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-10" />
          ))}
        </div>
      ) : error ? (
        <ErrorState title="Could not load rankings" message={error} />
      ) : (
        data && <LeaderboardTable entries={data.entries} />
      )}
    </div>
  );
}
