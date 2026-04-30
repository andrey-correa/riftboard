import { PlayerProfileView } from './PlayerProfileView';
import { isPlatformRegion } from '@/lib/regions';
import { ErrorState } from '@/components/ErrorState';

interface Props {
  params: { region: string; gameName: string; tagLine: string };
}

export default function PlayerPage({ params }: Props) {
  const region = params.region.toUpperCase();
  if (!isPlatformRegion(region)) {
    return (
      <ErrorState
        title="Invalid region"
        message="The region in the URL is not recognized. Try BR1, NA1, EUW1, KR or another supported platform."
      />
    );
  }
  const gameName = decodeURIComponent(params.gameName);
  const tagLine = decodeURIComponent(params.tagLine);

  return (
    <PlayerProfileView region={region} gameName={gameName} tagLine={tagLine} />
  );
}
