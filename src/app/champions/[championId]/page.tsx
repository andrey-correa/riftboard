import type { Metadata } from 'next';
import { ChampionDetailView } from './ChampionDetailView';

interface Props {
  params: { championId: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: `Champion ${params.championId} — Riftboard`,
  };
}

export default function ChampionDetailPage({ params }: Props) {
  const id = Number(params.championId);
  if (!Number.isInteger(id) || id <= 0) {
    return (
      <div className="card p-6 text-center text-text-secondary">
        Invalid champion ID.
      </div>
    );
  }
  return <ChampionDetailView championId={id} />;
}
