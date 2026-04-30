'use client';

import { useState, useMemo } from 'react';
import type { ChampionListItem } from '@/types/domain';

interface ChampionGridProps {
  champions: ChampionListItem[];
}

const ROLES = ['All', 'Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support'];

export function ChampionGrid({ champions }: ChampionGridProps) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [selected, setSelected] = useState<ChampionListItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return champions.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (role !== 'All' && !c.tags.includes(role)) return false;
      return true;
    });
  }, [champions, search, role]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search champions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
          aria-label="Search champions"
        />
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
              {r}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Showing {filtered.length} of {champions.length} champions
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className="group flex flex-col items-center gap-1 focus:outline-none"
          >
            <div className="relative w-full aspect-square overflow-hidden rounded-md border border-border group-hover:border-accent transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.imageUrl}
                alt={c.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs text-text-secondary group-hover:text-text-primary truncate w-full text-center">
              {c.name}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <ChampionModal
          champion={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ChampionModal({
  champion,
  onClose,
}: {
  champion: ChampionListItem;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card max-w-2xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-48 sm:h-64 bg-cover bg-center"
          style={{ backgroundImage: `url(${champion.splashUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg/80 hover:bg-bg flex items-center justify-center text-text-primary"
          >
            ✕
          </button>
          <div className="absolute bottom-3 left-4">
            <h2 className="font-display text-3xl text-accent-bright">
              {champion.name}
            </h2>
            <p className="text-text-secondary italic text-sm">
              {champion.title}
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex gap-1">
              {champion.tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded bg-accent-dim text-accent-bright border border-accent"
                >
                  {t}
                </span>
              ))}
            </div>
            <span className="text-text-muted">·</span>
            <span className="text-text-secondary">
              Difficulty:{' '}
              <span className="text-accent-bright font-mono">
                {champion.difficulty}/10
              </span>
            </span>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            {champion.blurb}
          </p>
        </div>
      </div>
    </div>
  );
}
