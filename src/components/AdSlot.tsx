interface AdSlotProps {
  id: string;
  className?: string;
}

/**
 * Empty placeholder. Renders nothing in production until AdSense is wired up.
 * Reserved as named slot so we know where ads will live.
 */
export function AdSlot({ id, className }: AdSlotProps) {
  if (process.env.NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS !== 'true') return null;

  return (
    <div
      data-ad-slot={id}
      className={`border border-dashed border-border rounded-md min-h-[60px] flex items-center justify-center text-text-muted text-xs ${
        className ?? ''
      }`}
    >
      ad slot — {id}
    </div>
  );
}
