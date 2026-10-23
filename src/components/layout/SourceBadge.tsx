import React from 'react';
import { SourceId } from '../../types/media';

interface SourceBadgeProps {
  source?: SourceId;
  size?: 'sm' | 'md';
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ size = 'sm' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } bg-amber-500/15 text-amber-400 border border-amber-500/30`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      DhakaFlix
    </span>
  );
};
