import { MatchDetailView } from './MatchDetailView';
import { REGIONAL_ROUTES, type RegionalRoute } from '@/lib/regions';
import { ErrorState } from '@/components/ErrorState';

interface Props {
  params: { regionalRoute: string; matchId: string };
}

function isRegionalRoute(value: string): value is RegionalRoute {
  return (REGIONAL_ROUTES as readonly string[]).includes(value);
}

export default function MatchPage({ params }: Props) {
  if (!isRegionalRoute(params.regionalRoute)) {
    return (
      <ErrorState
        title="Invalid route"
        message="The regional route in the URL is not valid. Use americas, europe, asia or sea."
      />
    );
  }
  return (
    <MatchDetailView
      regionalRoute={params.regionalRoute}
      matchId={params.matchId}
    />
  );
}
