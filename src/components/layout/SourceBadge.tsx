import React from 'react';
import { SourceId } from '../../types/media';

interface SourceBadgeProps {
  source: SourceId;
  size?: 'sm' | 'md';
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source, size = 'sm' }) => {
  const isDhakaFlix = source === 'dhakaflix';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      } ${
        isDhakaFlix
          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isDhakaFlix ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'
        }`}
      />
      {isDhakaFlix ? 'DhakaFlix' : 'ICC Media'}
    </span>
  );
};
