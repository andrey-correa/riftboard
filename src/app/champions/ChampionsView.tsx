'use client';

import { useEffect, useState } from 'react';
import { ChampionGrid } from '@/components/ChampionGrid';
import { ChampionsSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { fetchChampions, ClientApiError } from '@/lib/client-api';
import type { ChampionListItem } from '@/types/domain';

export function ChampionsView() {
  const [champions, setChampions] = useState<ChampionListItem[]>([]);
  const [version, setVersion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
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
    <div className="space-y-3 animate-fade-in">
      {version && (
        <p className="text-xs text-text-muted font-mono">
          Patch <span className="text-accent">{version}</span>
        </p>
      )}
      <ChampionGrid champions={champions} />
    </div>
  );
}
