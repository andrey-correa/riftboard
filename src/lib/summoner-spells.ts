/**
 * Summoner spell ID -> Data Dragon image filename (without extension).
 * Used to render the summoner spell icons.
 */
const SUMMONER_SPELLS: Record<number, string> = {
  1: 'SummonerBoost',          // Cleanse
  3: 'SummonerExhaust',
  4: 'SummonerFlash',
  6: 'SummonerHaste',          // Ghost
  7: 'SummonerHeal',
  11: 'SummonerSmite',
  12: 'SummonerTeleport',
  13: 'SummonerMana',          // Clarity
  14: 'SummonerDot',           // Ignite
  21: 'SummonerBarrier',
  30: 'SummonerPoroRecall',
  31: 'SummonerPoroThrow',
  32: 'SummonerSnowball',      // Mark
  39: 'SummonerSnowURFSnowball_Mark',
  54: 'Summoner_UltBookPlaceholder',
  55: 'Summoner_UltBookSmitePlaceholder',
};

export function summonerSpellName(id: number): string {
  return SUMMONER_SPELLS[id] ?? 'SummonerFlash';
}
