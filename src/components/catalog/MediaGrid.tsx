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
            className="aspect-[2/3] bg-bdstream-card border border-bdstream-border rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-12 text-center max-w-lg mx-auto my-12">
        <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-200 mb-2">No Media Discovered</h3>
        <p className="text-sm text-gray-400 mb-6">
          No media matching your selected filters were found on the connected ISP sources.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-vlc-orange hover:bg-vlc-darkOrange text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 transition-colors"
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
            className="p-2 rounded-lg bg-bdstream-surface border border-bdstream-border text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="font-mono text-xs text-gray-400">
            Page <strong className="text-white">{page}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong>
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-2 rounded-lg bg-bdstream-surface border border-bdstream-border text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
