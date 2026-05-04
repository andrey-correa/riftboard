'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchChampionOverview,
  fetchChampionBuilds,
  fetchChampionRunes,
  fetchChampionSpells,
  fetchChampionMatchups,
  ClientApiError,
} from '@/lib/client-api';
import { ddragonChampionSplashUrl, ddragonItemUrl, ddragonSummonerSpellUrl } from '@/lib/ddragon';
import { summonerSpellName } from '@/lib/summoner-spells';
import { PLATFORM_REGIONS, REGION_LABELS } from '@/lib/regions';
import type {
  ChampionOverviewDto,
  ChampionBuildDto,
  ChampionRuneDto,
  ChampionSpellDto,
  ChampionMatchupDto,
  InsufficientDataDto,
} from '@/types/domain';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DDRAGON_VERSION = '15.10.1';

const ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'] as const;
const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'Bot',
  UTILITY: 'Support',
};

const RUNE_STYLE_NAMES: Record<number, string> = {
  8000: 'Precision',
  8100: 'Domination',
  8200: 'Sorcery',
  8300: 'Inspiration',
  8400: 'Resolve',
};
const RUNE_STYLE_COLORS: Record<number, string> = {
  8000: 'text-yellow-400',
  8100: 'text-red-400',
  8200: 'text-blue-400',
  8300: 'text-teal-400',
  8400: 'text-green-400',
};

const TIER_COLORS: Record<string, string> = {
  'S+': 'text-yellow-300 border-yellow-300 bg-yellow-300/10',
  S: 'text-yellow-400 border-yellow-400 bg-yellow-400/10',
  A: 'text-green-400 border-green-400 bg-green-400/10',
  B: 'text-blue-400 border-blue-400 bg-blue-400/10',
  C: 'text-text-secondary border-border bg-bg-elevated',
  D: 'text-text-muted border-border bg-bg-elevated',
};

type TabKey = 'builds' | 'runes' | 'spells' | 'matchups';

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function TierBadge({ label }: { label: string | null }) {
  if (!label) return null;
  const cls = TIER_COLORS[label] ?? 'text-text-muted border-border';
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-md border-2 font-display text-lg font-bold ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-bg-elevated rounded-md p-3 min-w-[72px]">
      <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      <span className="font-display text-xl text-accent-bright font-semibold">{value}</span>
      {sub && <span className="text-[10px] text-text-muted">{sub}</span>}
    </div>
  );
}

function InsufficientDataState({ data }: { data: InsufficientDataDto }) {
  return (
    <div className="card p-8 text-center space-y-2">
      <p className="text-text-secondary text-sm">{data.message}</p>
      <p className="text-text-muted text-xs font-mono">
        {data.games} / {data.minimumRequiredGames} games collected
      </p>
    </div>
  );
}

function ItemImg({ id }: { id: number }) {
  if (!id) return <div className="w-8 h-8 rounded bg-bg-elevated border border-border" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ddragonItemUrl(DDRAGON_VERSION, id)}
      alt={`Item ${id}`}
      className="w-8 h-8 rounded border border-border"
      loading="lazy"
    />
  );
}

function SpellImg({ id }: { id: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ddragonSummonerSpellUrl(DDRAGON_VERSION, summonerSpellName(id))}
      alt={`Spell ${id}`}
      title={summonerSpellName(id)}
      className="w-8 h-8 rounded border border-border"
      loading="lazy"
    />
  );
}

function WrBar({ wr }: { wr: number }) {
  const color = wr >= 55 ? 'bg-win' : wr >= 50 ? 'bg-accent' : 'bg-loss';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(wr, 100)}%` }} />
      </div>
      <span className={`text-xs font-mono ${wr >= 55 ? 'text-win' : wr >= 50 ? 'text-accent-bright' : 'text-loss'}`}>
        {wr.toFixed(1)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab components
// ---------------------------------------------------------------------------

function BuildsTab({ data }: { data: ChampionBuildDto[] | InsufficientDataDto | null }) {
  if (!data) return <TabSkeleton />;
  if ('isInsufficientData' in data) return <InsufficientDataState data={data} />;
  if (data.length === 0) return <EmptyTab label="No build data available." />;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Items</th>
              <th className="px-4 py-3 text-right">Games</th>
              <th className="px-4 py-3 text-right">Win Rate</th>
              <th className="px-4 py-3 text-right">Pick Rate</th>
              <th className="px-4 py-3 text-right">KDA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr
                key={b.itemBuildKey}
                className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {b.itemIds.map((id, i) => (
                      <ItemImg key={i} id={id} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-secondary">{b.games}</td>
                <td className="px-4 py-3 text-right">
                  <WrBar wr={b.winRate} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-secondary">
                  {b.pickRate.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-accent-bright">
                  {b.avgKda.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RunesTab({ data }: { data: ChampionRuneDto[] | InsufficientDataDto | null }) {
  if (!data) return <TabSkeleton />;
  if ('isInsufficientData' in data) return <InsufficientDataState data={data} />;
  if (data.length === 0) return <EmptyTab label="No rune data available." />;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Primary</th>
              <th className="px-4 py-3 text-left">Secondary</th>
              <th className="px-4 py-3 text-right">Games</th>
              <th className="px-4 py-3 text-right">Win Rate</th>
              <th className="px-4 py-3 text-right">Pick Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr
                key={r.runeKey}
                className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <span className={`text-sm font-semibold ${RUNE_STYLE_COLORS[r.primaryRuneStyle] ?? 'text-text-primary'}`}>
                      {RUNE_STYLE_NAMES[r.primaryRuneStyle] ?? r.primaryRuneStyle}
                    </span>
                    <p className="text-xs text-text-muted font-mono">Keystone #{r.keystoneId}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${RUNE_STYLE_COLORS[r.secondaryRuneStyle] ?? 'text-text-secondary'}`}>
                    {RUNE_STYLE_NAMES[r.secondaryRuneStyle] ?? r.secondaryRuneStyle}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-secondary">{r.games}</td>
                <td className="px-4 py-3 text-right">
                  <WrBar wr={r.winRate} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-secondary">
                  {r.pickRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpellsTab({ data }: { data: ChampionSpellDto[] | InsufficientDataDto | null }) {
  if (!data) return <TabSkeleton />;
  if ('isInsufficientData' in data) return <InsufficientDataState data={data} />;
  if (data.length === 0) return <EmptyTab label="No summoner spell data available." />;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Spells</th>
              <th className="px-4 py-3 text-right">Games</th>
              <th className="px-4 py-3 text-right">Win Rate</th>
              <th className="px-4 py-3 text-right">Pick Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr
                key={s.spellKey}
                className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <SpellImg id={s.summoner1Id} />
                    <SpellImg id={s.summoner2Id} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-secondary">{s.games}</td>
                <td className="px-4 py-3 text-right">
                  <WrBar wr={s.winRate} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-secondary">
                  {s.pickRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchupsTab({ data }: { data: ChampionMatchupDto[] | InsufficientDataDto | null }) {
  if (!data) return <TabSkeleton />;
  if ('isInsufficientData' in data) return <InsufficientDataState data={data} />;
  if (data.length === 0) return <EmptyTab label="No matchup data available." />;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Opponent</th>
              <th className="px-4 py-3 text-right">Games</th>
              <th className="px-4 py-3 text-right">Win Rate</th>
              <th className="px-4 py-3 text-center">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr
                key={m.opponentChampionId}
                className="border-b border-border/50 hover:bg-bg-elevated/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${m.opponentChampionName}.png`}
                      alt={m.opponentChampionName}
                      className="w-7 h-7 rounded border border-border"
                      loading="lazy"
                    />
                    <span className="text-text-primary">{m.opponentChampionName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-text-secondary">{m.games}</td>
                <td className="px-4 py-3 text-right">
                  <WrBar wr={m.winRate} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    m.difficultyLabel === 'Easy'
                      ? 'text-win bg-win/10'
                      : m.difficultyLabel === 'Hard'
                      ? 'text-loss bg-loss/10'
                      : 'text-text-secondary bg-bg-elevated'
                  }`}>
                    {m.difficultyLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-bg-elevated rounded" />
      ))}
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="card p-8 text-center text-text-muted text-sm">{label}</div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

interface Props {
  championId: number;
}

export function ChampionDetailView({ championId }: Props) {
  const [region, setRegion] = useState('KR');
  const [roleFilter, setRoleFilter] = useState(''); // '' = auto-resolve
  const [activeTab, setActiveTab] = useState<TabKey>('builds');

  const [overview, setOverview] = useState<ChampionOverviewDto | InsufficientDataDto | null>(null);
  const [builds, setBuilds] = useState<ChampionBuildDto[] | InsufficientDataDto | null>(null);
  const [runes, setRunes] = useState<ChampionRuneDto[] | InsufficientDataDto | null>(null);
  const [spells, setSpells] = useState<ChampionSpellDto[] | InsufficientDataDto | null>(null);
  const [matchups, setMatchups] = useState<ChampionMatchupDto[] | InsufficientDataDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOverview(null);
    setBuilds(null);
    setRunes(null);
    setSpells(null);
    setMatchups(null);

    const params = { region, role: roleFilter || undefined, queueId: 420 };

    const [ovRes, bldRes, runRes, splRes, muRes] = await Promise.allSettled([
      fetchChampionOverview(championId, params),
      fetchChampionBuilds(championId, params),
      fetchChampionRunes(championId, params),
      fetchChampionSpells(championId, params),
      fetchChampionMatchups(championId, params),
    ]);

    if (ovRes.status === 'fulfilled') {
      setOverview(ovRes.value);
    } else {
      const err = ovRes.reason;
      setError(err instanceof ClientApiError ? err.message : 'Failed to load champion data.');
    }

    if (bldRes.status === 'fulfilled') setBuilds(bldRes.value);
    if (runRes.status === 'fulfilled') setRunes(runRes.value);
    if (splRes.status === 'fulfilled') setSpells(splRes.value);
    if (muRes.status === 'fulfilled') setMatchups(muRes.value);

    setLoading(false);
  }, [championId, region, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const ov = overview && overview.isInsufficientData === false ? overview : null;
  const championName = ov?.championName ?? '';
  const resolvedRole = ov?.role ?? roleFilter;
  const resolvedPatch = ov?.patch ?? '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Champion header ── */}
      <div className="card overflow-hidden">
        {championName && (
          <div
            className="h-40 sm:h-56 bg-cover bg-center bg-no-repeat relative"
            style={{ backgroundImage: `url(${ddragonChampionSplashUrl(championName)})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/30 to-transparent" />
            <div className="absolute bottom-4 left-5 flex items-end gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championName}.png`}
                alt={championName}
                className="w-16 h-16 rounded-md border-2 border-accent-dim shadow-lg"
              />
              <div>
                <h1 className="font-display text-3xl text-accent-bright leading-tight">
                  {championName}
                </h1>
                {resolvedPatch && (
                  <p className="text-xs text-text-muted font-mono">Patch {resolvedPatch}</p>
                )}
              </div>
              {ov?.tierLabel && (
                <div className="mb-1">
                  <TierBadge label={ov.tierLabel} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center border-t border-border">
          {/* Region */}
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

          {/* Role tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setRoleFilter('')}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                !roleFilter
                  ? 'bg-accent-dim border-accent text-accent-bright'
                  : 'border-border text-text-secondary hover:border-border-strong'
              }`}
            >
              Best
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  roleFilter === r
                    ? 'bg-accent-dim border-accent text-accent-bright'
                    : 'border-border text-text-secondary hover:border-border-strong'
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>

          {resolvedRole && (
            <span className="text-xs text-text-muted font-mono ml-auto">
              Role: <span className="text-accent">{ROLE_LABELS[resolvedRole] ?? resolvedRole}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && !loading && (
        <div className="card p-5 border-loss/30 text-center">
          <p className="text-loss text-sm">{error}</p>
          <button onClick={() => void load()} className="btn-primary mt-3 text-xs">Retry</button>
        </div>
      )}

      {/* ── Overview stats ── */}
      {loading && !ov && (
        <div className="flex flex-wrap gap-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 w-20 bg-bg-elevated rounded-md" />
          ))}
        </div>
      )}

      {overview && overview.isInsufficientData === true && (
        <InsufficientDataState data={overview} />
      )}

      {ov && (
        <div className="flex flex-wrap gap-3">
          <StatCard label="WR" value={`${ov.winRate.toFixed(1)}%`} sub={`${ov.games} games`} />
          <StatCard label="Pick" value={`${ov.pickRate.toFixed(1)}%`} />
          <StatCard label="KDA" value={ov.avgKda.toFixed(2)} sub={`${ov.avgKills}/${ov.avgDeaths}/${ov.avgAssists}`} />
          <StatCard label="CS/g" value={ov.avgCs.toFixed(1)} />
          <StatCard label="Gold" value={`${(ov.avgGold / 1000).toFixed(1)}k`} />
          <StatCard label="Dmg" value={`${(ov.avgDamage / 1000).toFixed(1)}k`} />
        </div>
      )}

      {/* ── Tabs ── */}
      {(ov || loading) && (
        <>
          <nav className="flex gap-1 border-b border-border">
            {(['builds', 'runes', 'spells', 'matchups'] as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-accent text-accent-bright font-medium'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>

          <div>
            {activeTab === 'builds' && <BuildsTab data={builds} />}
            {activeTab === 'runes' && <RunesTab data={runes} />}
            {activeTab === 'spells' && <SpellsTab data={spells} />}
            {activeTab === 'matchups' && <MatchupsTab data={matchups} />}
          </div>
        </>
      )}
    </div>
  );
}
