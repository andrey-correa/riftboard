'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChampionGrid } from '@/components/ChampionGrid';
import { ChampionsSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { fetchChampions, fetchChampionTierList, ClientApiError } from '@/lib/client-api';
import { PLATFORM_REGIONS, REGION_LABELS } from '@/lib/regions';
import type { ChampionListItem, ChampionTierListDto } from '@/types/domain';

const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid', BOTTOM: 'Bot', UTILITY: 'Support',
};
const TIER_COLORS: Record<string, string> = {
  'S+': 'text-yellow-300 bg-yellow-300/10 border-yellow-300',
  S: 'text-yellow-400 bg-yellow-400/10 border-yellow-400',
  A: 'text-green-400 bg-green-400/10 border-green-400',
  B: 'text-blue-400 bg-blue-400/10 border-blue-400',
  C: 'text-text-secondary bg-bg-elevated border-border',
  D: 'text-text-muted bg-bg-elevated border-border',
};
const DDRAGON_VERSION = '15.10.1';

type ViewMode = 'grid' | 'tierlist';

function TierBadge({ label }: { label: string | null }) {
  if (!label) return <span className="text-text-muted text-xs">—</span>;
  const cls = TIER_COLORS[label] ?? 'text-text-muted border-border';
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded border font-display text-sm font-bold ${cls}`}>
      {label}
    </span>
  );
}

function WrBar({ wr }: { wr: number }) {
  const color = wr >= 55 ? 'bg-win' : wr >= 50 ? 'bg-accent' : 'bg-loss';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(wr, 100)}%` }} />
      </div>
      <span className={`text-xs font-mono ${wr >= 55 ? 'text-win' : wr >= 50 ? 'text-accent-bright' : 'text-loss'}`}>
        {wr.toFixed(1)}%
      </span>
    </div>
  );
}

function TierListView() {
  const [region, setRegion] = useState('KR');
  const [role, setRole] = useState('MIDDLE');
  const [tierList, setTierList] = useState<ChampionTierListDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchChampionTierList({ region, role, queueId: 420 })
      .then((data) => { if (!cancelled) setTierList(data); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ClientApiError ? err.message : 'Failed to load tier list.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [region, role]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="input text-sm"
          aria-label="Region"
        >
          {PLATFORM_REGIONS.map((r) => (
            <option key={r} value={r}>{REGION_LABELS[r]}</option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                role === r
                  ? 'bg-accent-dim border-accent text-accent-bright'
                  : 'border-border text-text-secondary hover:border-border-strong'
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        {tierList?.patch && (
          <span className="text-xs text-text-muted font-mono ml-auto">
            Patch <span className="text-accent">{tierList.patch}</span>
          </span>
        )}
      </div>

      {loading && (
        <div className="card p-4 space-y-3 animate-pulse">
          {[...Array(10)].map((_, i) => <div key={i} className="h-10 bg-bg-elevated rounded" />)}
        </div>
      )}

      {error && !loading && (
        <ErrorState title="Could not load tier list" message={error} />
      )}

      {!loading && tierList && tierList.entries.length === 0 && (
        <div className="card p-8 text-center text-text-muted text-sm">
          No data yet for {ROLE_LABELS[role]} in {REGION_LABELS[region as keyof typeof REGION_LABELS] ?? region}.
          Play more ranked games to populate the tier list!
        </div>
      )}

      {!loading && tierList && tierList.entries.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-10">Tier</th>
                  <th className="px-4 py-3 text-left">Champion</th>
                  <th className="px-4 py-3 text-right">Win Rate</th>
                  <th className="px-4 py-3 text-right">Pick Rate</th>
                  <th className="px-4 py-3 text-right">KDA</th>
                  <th className="px-4 py-3 text-right">Games</th>
                </tr>
              </thead>
              <tbody>
                {tierList.entries.map((entry, idx) => (
                  <tr
                    key={entry.championId}
                    className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-center">
                      <TierBadge label={entry.tierLabel} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/champions/${entry.championId}`}
                        className="flex items-center gap-2 hover:text-accent-bright transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${entry.championName}.png`}
                          alt={entry.championName}
                          className="w-8 h-8 rounded border border-border"
                          loading="lazy"
                        />
                        <span className="font-medium">
                          {entry.championName}
                        </span>
                        <span className="text-text-muted text-xs font-mono">#{idx + 1}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <WrBar wr={entry.winRate} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">
                      {entry.pickRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-accent-bright">
                      {entry.avgKda.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-muted">
                      {entry.games}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ChampionsView() {
  const [champions, setChampions] = useState<ChampionListItem[]>([]);
  const [version, setVersion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('tierlist');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChampions()
      .then((data) => {
        if (cancelled) return;
        setChampions(data.champions);
        setVersion(data.version);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ClientApiError) setError(err.message);
        else setError('Failed to load champions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <ChampionsSkeleton />;
  if (error)
    return (
      <ErrorState
        title="Could not load champions"
        message={error}
        retry={() => window.location.reload()}
      />
    );

  return (
    <div className="space-y-5 animate-fade-in">
      {version && (
        <p className="text-xs text-text-muted font-mono">
          Patch <span className="text-accent">{version}</span>
        </p>
      )}

      {/* View switcher */}
      <div className="flex gap-1">
        <button
          onClick={() => setView('tierlist')}
          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
            view === 'tierlist'
              ? 'bg-accent-dim border-accent text-accent-bright'
              : 'border-border text-text-secondary hover:border-border-strong'
          }`}
        >
          Tier List
        </button>
        <button
          onClick={() => setView('grid')}
          className={`px-4 py-2 text-sm rounded-md border transition-colors ${
            view === 'grid'
              ? 'bg-accent-dim border-accent text-accent-bright'
              : 'border-border text-text-secondary hover:border-border-strong'
          }`}
        >
          All Champions
        </button>
      </div>

      {view === 'tierlist' && <TierListView />}
      {view === 'grid' && <ChampionGrid champions={champions} />}
    </div>
  );
}
