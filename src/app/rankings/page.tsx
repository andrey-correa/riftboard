import { RankingsView } from './RankingsView';

export const metadata = {
  title: 'Rankings — Riftboard',
};

export default function RankingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
          Apex tiers
        </p>
        <h1 className="font-display text-3xl mt-1">Rankings</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Live Challenger, Grandmaster and Master ladders by region and queue.
        </p>
      </header>
      <RankingsView />
    </div>
  );
}
