import { ChampionsView } from './ChampionsView';

export const metadata = {
  title: 'Champions — Riftboard',
};

export default function ChampionsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Roster
        </p>
        <h1 className="font-display text-3xl mt-1">Champions</h1>
        <p className="text-text-secondary mt-1 text-sm">
          The full League of Legends roster, sourced live from Riot&apos;s Data Dragon.
        </p>
      </header>
      <ChampionsView />
    </div>
  );
}
