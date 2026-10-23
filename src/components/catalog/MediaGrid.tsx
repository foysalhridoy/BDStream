import React from 'react';
import { MediaItem } from '../../types/media';
import { MediaCard } from './MediaCard';
import { Film, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface MediaGridProps {
  items: MediaItem[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelect: (item: MediaItem) => void;
  onPlayDirect?: (item: MediaItem) => void;
  onRetry?: () => void;
}

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onSelect,
  onPlayDirect,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[2/3] bg-white border border-neutral-200/90 rounded-2xl animate-pulse shadow-xs"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
        <Film className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-neutral-900 mb-2">No Media Discovered</h3>
        <p className="text-sm text-neutral-500 mb-6">
          No media matching your selected filters were found on the connected ISP sources.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-extrabold rounded-full inline-flex items-center gap-2 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Catalog
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onSelect={onSelect}
            onPlayDirect={onPlayDirect}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-2.5 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-xs"
            title="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="font-mono text-xs text-neutral-500">
            Page <strong className="text-neutral-900 font-bold">{page}</strong> of{' '}
            <strong className="text-neutral-900 font-bold">{totalPages}</strong>
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-2.5 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-xs"
            title="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
