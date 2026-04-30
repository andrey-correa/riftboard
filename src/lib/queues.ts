/**
 * Riot queue ID -> human label.
 * Trimmed list, expand as needed.
 */
const QUEUES: Record<number, string> = {
  400: 'Normal Draft',
  420: 'Ranked Solo/Duo',
  430: 'Normal Blind',
  440: 'Ranked Flex',
  450: 'ARAM',
  700: 'Clash',
  720: 'ARAM Clash',
  830: 'Co-op vs AI Intro',
  840: 'Co-op vs AI Beginner',
  850: 'Co-op vs AI Intermediate',
  900: 'URF',
  1020: 'One for All',
  1300: 'Nexus Blitz',
  1400: 'Ultimate Spellbook',
  1700: 'Arena',
  1900: 'URF',
};

export function queueLabel(queueId: number): string {
  return QUEUES[queueId] ?? `Queue ${queueId}`;
}

export const QUEUE_BY_NAME = {
  RANKED_SOLO_5x5: 'RANKED_SOLO_5x5',
  RANKED_FLEX_SR: 'RANKED_FLEX_SR',
  RANKED_FLEX_TT: 'RANKED_FLEX_TT',
} as const;
