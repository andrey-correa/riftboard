'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import {
  PLATFORM_REGIONS,
  REGION_LABELS,
  type PlatformRegion,
} from '@/lib/regions';
import { parseDisplayName } from '@/lib/player-url';

interface SearchBarProps {
  compact?: boolean;
  defaultRegion?: PlatformRegion;
  defaultGameName?: string;
  defaultTagLine?: string;
}

export function SearchBar({
  compact = false,
  defaultRegion = 'BR1',
  defaultGameName = '',
  defaultTagLine = '',
}: SearchBarProps) {
  const router = useRouter();
  const [region, setRegion] = useState<PlatformRegion>(defaultRegion);
  const [riotId, setRiotId] = useState(
    defaultGameName && defaultTagLine
      ? `${defaultGameName}#${defaultTagLine}`
      : '',
  );
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = riotId.trim();
    const { gameName, tagLine } = parseDisplayName(trimmed);
    if (!gameName || !tagLine) {
      setError('Use format Name#TAG');
      return;
    }
    router.push(
      `/player/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(
        tagLine,
      )}`,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`relative flex items-stretch gap-1.5 ${
        compact ? '' : 'shadow-2xl shadow-accent/5'
      }`}
    >
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value as PlatformRegion)}
        aria-label="Region"
        className={`input border-r-0 rounded-r-none font-mono uppercase font-medium tracking-wider cursor-pointer ${
          compact ? 'text-xs px-2 py-1.5' : ''
        }`}
      >
        {PLATFORM_REGIONS.map((r) => (
          <option key={r} value={r}>
            {REGION_LABELS[r]}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={riotId}
        onChange={(e) => setRiotId(e.target.value)}
        placeholder="Game name#TAG"
        autoComplete="off"
        spellCheck={false}
        className={`input flex-1 rounded-none border-x-0 ${
          compact ? 'text-sm py-1.5' : 'text-base py-2.5'
        }`}
      />
      <button
        type="submit"
        className={`btn-primary rounded-l-none border-l-0 ${
          compact ? 'text-xs px-3' : 'px-5'
        }`}
        aria-label="Search"
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
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        {!compact && <span>Search</span>}
      </button>
      {error && (
        <p className="absolute top-full mt-1 left-0 text-xs text-loss">
          {error}
        </p>
      )}
    </form>
  );
}
