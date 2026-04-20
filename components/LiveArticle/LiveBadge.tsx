import React from 'react';

type Props = {
  className?: string;
};

/**
 * Small-caps "LIVE" pill — white text on solid accent red.
 * Reuses the site accent token so it adapts to theme changes.
 */
export const LiveBadge: React.FC<Props> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-[3px] font-meta text-[11px] font-bold uppercase tracking-[0.12em] text-white ${className}`}
      aria-label="Live coverage"
    >
      <span
        aria-hidden="true"
        className="inline-block h-[6px] w-[6px] rounded-full bg-white/90"
      />
      Live
    </span>
  );
};

export default LiveBadge;
