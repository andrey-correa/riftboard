/**
 * UI formatting utilities.
 */

export function formatRelativeTime(timestampMs: number): string {
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  if (diffSec < 86400 * 30)
    return `${Math.floor(diffSec / (86400 * 7))}w ago`;
  return `${Math.floor(diffSec / (86400 * 30))}mo ago`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

export function tierColorClass(tier: string | null | undefined): string {
  if (!tier) return 'text-text-muted';
  const t = tier.toUpperCase();
  switch (t) {
    case 'IRON':
      return 'text-rank-iron';
    case 'BRONZE':
      return 'text-rank-bronze';
    case 'SILVER':
      return 'text-rank-silver';
    case 'GOLD':
      return 'text-rank-gold';
    case 'PLATINUM':
      return 'text-rank-platinum';
    case 'EMERALD':
      return 'text-rank-emerald';
    case 'DIAMOND':
      return 'text-rank-diamond';
    case 'MASTER':
      return 'text-rank-master';
    case 'GRANDMASTER':
      return 'text-rank-grandmaster';
    case 'CHALLENGER':
      return 'text-rank-challenger';
    default:
      return 'text-text-muted';
  }
}

export function queueShortLabel(queueType: string): string {
  if (queueType === 'RANKED_SOLO_5x5') return 'Solo/Duo';
  if (queueType === 'RANKED_FLEX_SR') return 'Flex';
  if (queueType === 'RANKED_FLEX_TT') return 'Flex 3v3';
  return queueType;
}
