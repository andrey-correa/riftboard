'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ChampionListItem } from '@/types/domain';

interface ChampionGridProps {
  champions: ChampionListItem[];
}

const ROLES = ['All', 'Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support'];

export function ChampionGrid({ champions }: ChampionGridProps) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');

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
          <Link
            key={c.id}
            href={`/champions/${c.key}`}
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
          </Link>
        ))}
      </div>
    </div>
  );
}
