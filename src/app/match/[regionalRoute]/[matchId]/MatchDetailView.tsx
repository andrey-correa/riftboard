'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ddragonChampionSquareUrl,
  ddragonItemUrl,
  ddragonSummonerSpellUrl,
} from '@/lib/ddragon';
import { summonerSpellName } from '@/lib/summoner-spells';
import { formatDuration, formatNumber, formatRelativeTime } from '@/lib/format';
import { fetchMatch, fetchChampions, ClientApiError } from '@/lib/client-api';
import { buildPlayerProfilePath } from '@/lib/player-url';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import type { MatchDetail, MatchParticipantDetail } from '@/types/domain';
import type { RegionalRoute } from '@/lib/regions';

interface Props {
  regionalRoute: RegionalRoute;
  matchId: string;
}

export function MatchDetailView({ regionalRoute, matchId }: Props) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [version, setVersion] = useState('14.20.1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchMatch(regionalRoute, matchId), fetchChampions()])
      .then(([m, c]) => {
        if (cancelled) return;
        setMatch(m);
        setVersion(c.version);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ClientApiError) setError(err.message);
        else setError('Could not load match.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [regionalRoute, matchId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton className="h-24" />
        <LoadingSkeleton className="h-96" />
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  if (error) return <ErrorState title="Match unavailable" message={error} />;
  if (!match) return null;

  const blueWin = match.blueTeam.win;
  const winnerLabel = blueWin ? 'Blue' : 'Red';
  const winnerClass = blueWin ? 'text-win' : 'text-loss';

  const blueTotals = sumTeam(match.blueTeam.participants);
  const redTotals = sumTeam(match.redTeam.participants);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.2em] text-text-secondary">
              {match.queueLabel} · {match.gameMode}
            </p>
            <h1 className={`font-display text-2xl mt-1 ${winnerClass}`}>
              {winnerLabel} Team Victory
            </h1>
            <p className="text-xs text-text-muted mt-1 font-mono">
              {match.matchId}
            </p>
          </div>

          <div className="text-right text-sm text-text-secondary">
            <p>{formatDuration(match.gameDuration)}</p>
            <p className="text-xs text-text-muted">
              {formatRelativeTime(match.gameCreation)}
            </p>
          </div>
        </div>
      </div>

      <TeamComparison blue={blueTotals} red={redTotals} />

      <TeamTable
        title="Blue Team"
        accent="blue"
        win={match.blueTeam.win}
        participants={match.blueTeam.participants}
        version={version}
        totals={blueTotals}
        platformId={match.platformId}
      />

      <TeamTable
        title="Red Team"
        accent="red"
        win={match.redTeam.win}
        participants={match.redTeam.participants}
        version={version}
        totals={redTotals}
        platformId={match.platformId}
      />
    </div>
  );
}

interface Totals {
  kills: number;
  gold: number;
  damage: number;
}

function sumTeam(ps: MatchParticipantDetail[]): Totals {
  return ps.reduce(
    (acc, p) => ({
      kills: acc.kills + p.kills,
      gold: acc.gold + p.goldEarned,
      damage: acc.damage + p.damageToChampions,
    }),
    { kills: 0, gold: 0, damage: 0 },
  );
}

function TeamComparison({ blue, red }: { blue: Totals; red: Totals }) {
  return (
    <div className="card p-4 space-y-3">
      <ComparisonRow
        label="Kills"
        leftValue={blue.kills}
        rightValue={red.kills}
      />

      <ComparisonRow
        label="Gold"
        leftValue={blue.gold}
        rightValue={red.gold}
        format={formatNumber}
      />

      <ComparisonRow
        label="Damage"
        leftValue={blue.damage}
        rightValue={red.damage}
        format={formatNumber}
      />
    </div>
  );
}

function ComparisonRow({
  label,
  leftValue,
  rightValue,
  format = (n) => n.toLocaleString(),
}: {
  label: string;
  leftValue: number;
  rightValue: number;
  format?: (n: number) => string;
}) {
  const total = leftValue + rightValue || 1;
  const leftPct = (leftValue / total) * 100;
  const rightPct = (rightValue / total) * 100;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-win font-mono">{format(leftValue)}</span>
        <span className="text-text-muted uppercase tracking-wider">
          {label}
        </span>
        <span className="text-loss font-mono">{format(rightValue)}</span>
      </div>

      <div className="flex h-2 rounded-full overflow-hidden bg-bg">
        <div className="bg-win" style={{ width: `${leftPct}%` }} />
        <div className="bg-loss" style={{ width: `${rightPct}%` }} />
      </div>
    </div>
  );
}

function TeamTable({
  title,
  accent,
  win,
  participants,
  version,
  totals,
  platformId,
}: {
  title: string;
  accent: 'blue' | 'red';
  win: boolean;
  participants: MatchParticipantDetail[];
  version: string;
  totals: Totals;
  platformId: string;
}) {
  const accentClass = accent === 'blue' ? 'text-win' : 'text-loss';
  const borderClass = accent === 'blue' ? 'border-win/30' : 'border-loss/30';

  return (
    <div className={`card border-t-2 ${borderClass} overflow-hidden`}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-bg-elevated">
        <h2 className={`font-display text-lg ${accentClass}`}>
          {title} {win ? '· Victory' : '· Defeat'}
        </h2>

        <p className="text-xs text-text-muted font-mono">
          {totals.kills} kills · {formatNumber(totals.gold)} gold ·{' '}
          {formatNumber(totals.damage)} dmg
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-text-secondary uppercase tracking-wider">
            <tr className="border-b border-border">
              <th className="text-left p-2 pl-4 font-medium">Player</th>
              <th className="text-center p-2 font-medium">KDA</th>
              <th className="text-right p-2 font-medium hidden sm:table-cell">
                Damage
              </th>
              <th className="text-right p-2 font-medium hidden sm:table-cell">
                Gold
              </th>
              <th className="text-right p-2 font-medium hidden md:table-cell">
                CS
              </th>
              <th className="text-right p-2 pr-4 font-medium">Items</th>
            </tr>
          </thead>

          <tbody>
            {participants.map((p) => (
              <ParticipantRow
                key={p.puuid}
                participant={p}
                version={version}
                platformId={platformId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ParticipantRow({
  participant: p,
  version,
  platformId,
}: {
  participant: MatchParticipantDetail;
  version: string;
  platformId: string;
}) {
  const displayName = p.riotIdGameName || 'Unknown';
  const displayTag = p.riotIdTagline || '';

  const profilePath = buildPlayerProfilePath({
    region: p.region ?? platformId,
    gameName: displayName,
    tagLine: displayTag,
  });

  return (
    <tr className="border-b border-border/50 hover:bg-bg-hover transition-colors">
      <td className="p-2 pl-4">
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ddragonChampionSquareUrl(version, p.championName)}
              alt={p.championName}
              className="w-10 h-10 rounded border border-border"
            />

            <span className="absolute -bottom-1 -right-1 px-1 rounded bg-bg text-[10px] font-mono border border-border">
              {p.champLevel}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            {p.summonerSpells.map((sid, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${p.puuid}-spell-${sid}-${i}`}
                src={ddragonSummonerSpellUrl(version, summonerSpellName(sid))}
                alt=""
                className="w-4 h-4 rounded-sm border border-border"
              />
            ))}
          </div>

          <div className="min-w-0">
            {profilePath ? (
              <Link
                href={profilePath}
                className="block truncate text-text-primary text-sm hover:text-accent-bright transition-colors underline-offset-2 hover:underline"
                title={`Ver perfil de ${displayName}${
                  displayTag ? `#${displayTag}` : ''
                }`}
              >
                {displayName}
                {displayTag && (
                  <span className="text-text-muted text-xs ml-1">
                    #{displayTag}
                  </span>
                )}
              </Link>
            ) : (
              <p className="truncate text-text-primary text-sm">
                {displayName}
                {displayTag && (
                  <span className="text-text-muted text-xs ml-1">
                    #{displayTag}
                  </span>
                )}
              </p>
            )}

            <p className="text-xs text-text-muted">{p.championName}</p>
          </div>
        </div>
      </td>

      <td className="p-2 text-center font-mono">
        <span className="text-text-primary">{p.kills}</span>
        <span className="text-text-muted">/</span>
        <span className="text-loss">{p.deaths}</span>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary">{p.assists}</span>
      </td>

      <td className="p-2 text-right hidden sm:table-cell font-mono text-text-primary">
        {formatNumber(p.damageToChampions)}
      </td>

      <td className="p-2 text-right hidden sm:table-cell font-mono text-accent-bright">
        {formatNumber(p.goldEarned)}
      </td>

      <td className="p-2 text-right hidden md:table-cell font-mono text-text-secondary">
        {p.cs}
      </td>

      <td className="p-2 pr-4">
        <div className="flex justify-end gap-0.5">
          {p.items.map((id, i) => (
            <ItemSlot
              key={`${p.puuid}-item-${id}-${i}`}
              itemId={id}
              version={version}
            />
          ))}
        </div>
      </td>
    </tr>
  );
}

function ItemSlot({ itemId, version }: { itemId: number; version: string }) {
  if (!itemId) {
    return (
      <div className="w-6 h-6 rounded-sm bg-bg-elevated border border-border" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ddragonItemUrl(version, itemId)}
      alt=""
      className="w-6 h-6 rounded-sm border border-border"
      loading="lazy"
    />
  );
}