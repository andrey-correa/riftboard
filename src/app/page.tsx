import { SearchBar } from '@/components/SearchBar';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="relative pt-12 sm:pt-20 pb-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
            League of Legends · Stats · Match History
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-text-primary text-balance">
            Look up any{' '}
            <span className="text-accent-bright">summoner</span>
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto text-balance">
            Riot ID, region, recent matches, ranked progress. Everything you need
            to size up your next game.
          </p>
        </div>

        <div className="mt-10 max-w-2xl mx-auto">
          <SearchBar />
          <p className="mt-3 text-xs text-text-muted text-center">
            Use the format <span className="font-mono">Name#TAG</span> — for
            example <span className="font-mono text-accent">Hide on bush#KR1</span>
          </p>
        </div>
      </section>

      {/* Feature tiles */}
      <section className="grid sm:grid-cols-3 gap-4">
        <FeatureTile
          href="/champions"
          eyebrow="Browse"
          title="Champions"
          description="Roster, roles, difficulty and lore."
        />
        <FeatureTile
          href="/rankings"
          eyebrow="Compete"
          title="Rankings"
          description="Challenger, Grandmaster and Master ladders."
        />
        <FeatureTile
          eyebrow="Discover"
          title="Match details"
          description="Full team breakdowns, builds, gold and damage."
        />
      </section>
    </div>
  );
}

function FeatureTile({
  href,
  eyebrow,
  title,
  description,
}: {
  href?: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const inner = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
        {eyebrow}
      </p>
      <h3 className="font-display text-2xl text-text-primary mt-2">{title}</h3>
      <p className="text-sm text-text-secondary mt-2">{description}</p>
    </>
  );
  if (!href) return <div className="card p-5">{inner}</div>;
  return (
    <Link href={href} className="card card-hover p-5 block">
      {inner}
    </Link>
  );
}
