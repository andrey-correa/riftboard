'use client';

import Link from 'next/link';
import { tierColorClass } from '@/lib/format';
import { buildPlayerProfilePath } from '@/lib/player-url';
import type { LeaderboardEntry } from '@/types/domain';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center text-text-secondary">
        No entries found for this tier.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated border-b border-border text-xs uppercase tracking-wider text-text-secondary">
            <tr>
              <th className="text-left p-3 font-medium w-16">#</th>
              <th className="text-left p-3 font-medium">Summoner</th>
              <th className="text-right p-3 font-medium">LP</th>
              <th className="text-right p-3 font-medium hidden sm:table-cell">
                Wins
              </th>
              <th className="text-right p-3 font-medium hidden sm:table-cell">
                Losses
              </th>
              <th className="text-right p-3 font-medium">Win Rate</th>
            </tr>
          </thead>

          <tbody>
            {entries.slice(0, 200).map((e, index) => {
              const displayName = e.displayName ?? 'Summoner desconhecido';

              const profilePath = buildPlayerProfilePath({
                region: e.region,
                gameName: e.gameName,
                tagLine: e.tagLine,
              });

              return (
                <tr
                  key={`${e.puuid ?? e.summonerId ?? displayName ?? 'summoner'}-${
                    e.rank ?? index
                  }`}
                  className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                >
                  <td className="p-3 font-mono text-text-secondary">
                    {e.rank}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-display text-xs ${tierColorClass(
                          e.tier,
                        )}`}
                      >
                        {e.tier[0]}
                      </span>

                      {profilePath ? (
                        <Link
                          href={profilePath}
                          className="text-text-primary truncate max-w-[200px] hover:text-accent-bright transition-colors"
                          title={`Ver perfil de ${displayName}`}
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <span className="text-text-primary truncate max-w-[200px]">
                          {displayName}
                        </span>
                      )}

                      {e.hotStreak && (
                        <span title="Hot streak" className="text-accent">
                          🔥
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 text-right font-mono text-accent-bright">
                    {e.leaguePoints.toLocaleString()}
                  </td>

                  <td className="p-3 text-right text-win hidden sm:table-cell font-mono">
                    {e.wins}
                  </td>

                  <td className="p-3 text-right text-loss hidden sm:table-cell font-mono">
                    {e.losses}
                  </td>

                  <td
                    className={`p-3 text-right font-mono ${
                      e.winRate >= 55
                        ? 'text-win'
                        : e.winRate >= 50
                          ? 'text-accent-bright'
                          : 'text-loss'
                    }`}
                  >
                    {e.winRate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {entries.length > 200 && (
        <p className="p-3 text-xs text-text-muted text-center border-t border-border">
          Showing top 200 of {entries.length} entries.
        </p>
      )}
    </div>
  );
}