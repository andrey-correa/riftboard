import Link from 'next/link';
import { SearchBar } from './SearchBar';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center font-display font-bold text-bg">
            R
          </div>
          <span className="font-display text-lg tracking-wider text-accent-bright group-hover:text-accent transition-colors">
            RIFTBOARD
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="px-3 py-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            Search
          </Link>
          <Link
            href="/champions"
            className="px-3 py-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            Champions
          </Link>
          <Link
            href="/rankings"
            className="px-3 py-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            Rankings
          </Link>
        </nav>

        <div className="flex-1 max-w-md ml-auto hidden sm:block">
          <SearchBar compact />
        </div>
      </div>
    </header>
  );
}
