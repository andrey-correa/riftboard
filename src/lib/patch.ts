/**
 * Extrai o patch semântico (major.minor) de uma gameVersion da Riot API.
 *
 * Exemplos:
 *   "15.23.702.9214" → "15.23"
 *   "14.1.412.5678"  → "14.1"
 *   null             → null
 */
export function getPatchFromGameVersion(gameVersion?: string | null): string | null {
  if (!gameVersion) return null;
  const parts = gameVersion.split('.');
  if (parts.length < 2) return null;
  return `${parts[0]}.${parts[1]}`;
}
