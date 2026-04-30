'use client';

import { useEffect, useState } from 'react';
import { PlayerHeader, RankCard } from '@/components/PlayerHeader';
import { MatchList } from '@/components/MatchList';
import { ErrorState } from '@/components/ErrorState';
import { PlayerProfileSkeleton } from '@/components/LoadingSkeleton';
import {
  fetchPlayer,
  refreshPlayerApi,
  ClientApiError,
  fetchChampions,
} from '@/lib/client-api';
import type { PlayerProfile, MatchSummary } from '@/types/domain';
import type { PlatformRegion } from '@/lib/regions';

interface Props {
  region: PlatformRegion;
  gameName: string;
  tagLine: string;
}

export function PlayerProfileView({ region, gameName, tagLine }: Props) {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [version, setVersion] = useState<string>('14.20.1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchPlayer(region, gameName, tagLine),
      fetchChampions(),
    ])
      .then(([data, champs]) => {
        if (cancelled) return;
        setProfile(data.profile);
        setMatches(data.matches);
        setVersion(champs.version);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ClientApiError) {
          if (err.code === 'PLAYER_NOT_FOUND') {
            setError({
              title: 'Player not found',
              message: `No summoner with Riot ID ${gameName}#${tagLine} on ${region}.`,
            });
          } else if (err.code === 'RATE_LIMITED') {
            setError({
              title: 'Slow down',
              message: 'You are sending too many requests. Wait a moment and retry.',
            });
          } else if (err.code === 'UPSTREAM_RATE_LIMITED') {
            setError({
              title: 'Riot API busy',
              message:
                'Riot API is rate limiting us. Try again in a few seconds.',
            });
          } else {
            setError({
              title: 'Could not load profile',
              message: err.message,
            });
          }
        } else {
          setError({
            title: 'Network error',
            message: 'Unable to reach the server. Check your connection.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [region, gameName, tagLine]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const data = await refreshPlayerApi(region, gameName, tagLine);
      setProfile(data.profile);
      setMatches(data.matches);
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.code === 'REFRESH_COOLDOWN') {
          setRefreshError(
            `Cooldown active${err.retryAfter ? ` — ${err.retryAfter}s left` : ''}.`,
          );
        } else {
          setRefreshError(err.message);
        }
      } else {
        setRefreshError('Refresh failed.');
      }
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) return <PlayerProfileSkeleton />;
  if (error)
    return <ErrorState title={error.title} message={error.message} />;
  if (!profile) return null;

  const solo =
    profile.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5') ?? null;
  const flex =
    profile.ranks.find((r) => r.queueType === 'RANKED_FLEX_SR') ?? null;

  return (
    <div className="space-y-5 animate-fade-in">
      <PlayerHeader
        profile={profile}
        ddragonVersion={version}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        refreshError={refreshError}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <RankCard rank={solo} queueType="RANKED_SOLO_5x5" />
        <RankCard rank={flex} queueType="RANKED_FLEX_SR" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl tracking-wide">Recent Matches</h2>
          <p className="text-xs text-text-muted">
            Last {matches.length} games
          </p>
        </div>
        <MatchList matches={matches} ddragonVersion={version} />
      </section>
    </div>
  );
}
