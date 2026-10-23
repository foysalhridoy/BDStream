import React from 'react';
import { SourceId } from '../../types/media';

interface SourceBadgeProps {
  source?: SourceId;
  size?: 'sm' | 'md';
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source = 'dhakaflix', size = 'sm' }) => {
  if (source === 'cineplex') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        } bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-2xs`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 animate-pulse" />
        CinePlex
      </span>
    );
  }

  if (source === 'basplay') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        } bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
        BAS Play
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
      DhakaFlix
    </span>
  );
};
