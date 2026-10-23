import React, { useState } from 'react';
import { Play, Film } from 'lucide-react';
import { MediaItem } from '../../types/media';
import { ApiService } from '../../services/api';
import { StorageService } from '../../services/storage';

interface MediaCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onPlayDirect?: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onSelect, onPlayDirect }) => {
  const [imgAttempt, setImgAttempt] = useState(0);

  // Check saved watch progress
  const progress = StorageService.getProgress(item.id);
  const progressPercent = progress && progress.duration > 0
    ? (progress.currentTime / progress.duration) * 100
    : 0;

  // Primary: proxy URL for a_AL_.jpg; Secondary: direct URL
  const proxyPoster = item.posterUrl ? ApiService.getProxyAssetUrl(item.posterUrl) : undefined;
  const directPoster = item.posterUrl;
  const currentPosterSrc = imgAttempt === 0 ? proxyPoster : imgAttempt === 1 ? directPoster : null;

  return (
    <div
      onClick={() => onSelect(item)}
      className="group relative bg-white border border-neutral-200/90 hover:border-[#d4ff00] hover:ring-2 hover:ring-[#d4ff00]/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col select-none shadow-xs"
    >
      {/* Poster / Banner Image Container */}
      <div className="relative aspect-[2/3] w-full bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 overflow-hidden flex items-center justify-center">
        {currentPosterSrc ? (
          <img
            src={currentPosterSrc}
            alt={item.title}
            loading="lazy"
            onError={() => setImgAttempt(prev => prev + 1)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Stylish Fallback Banner */
          <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-neutral-100 via-white to-neutral-200 text-left">
            <div className="flex justify-between items-start">
              <span className="w-7 h-7 bg-[#d4ff00] text-black font-extrabold rounded-lg flex items-center justify-center text-xs tracking-tighter shadow-xs">
                BD
              </span>
              {item.year && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/90 text-neutral-700 border border-neutral-200 shadow-xs">
                  {item.year}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <Film className="w-8 h-8 text-neutral-400 mb-2" />
              <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-tight">
                {item.title}
              </h4>
              <span className="text-[10px] text-[#709900] uppercase font-bold tracking-wider">
                {item.category}
              </span>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          {item.qualityBadge && (
            <span className="bg-black/85 backdrop-blur-md text-[#d4ff00] border border-[#d4ff00]/30 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {item.qualityBadge}
            </span>
          )}
        </div>

        {/* Hover Overlay with Electric Lime Play Button */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onPlayDirect) onPlayDirect(item);
              else onSelect(item);
            }}
            className="w-12 h-12 bg-[#d4ff00] hover:bg-[#c4ec00] text-black rounded-full flex items-center justify-center shadow-xl shadow-lime-500/30 transform transition-transform hover:scale-110 active:scale-95"
            title="Play Stream"
          >
            <Play className="w-6 h-6 ml-0.5 fill-black text-black" />
          </button>
        </div>

        {/* Continue Watching Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-200">
            <div
              className="h-full bg-[#d4ff00] shadow-[0_0_8px_rgba(212,255,0,0.6)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3
            className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-black transition-colors line-clamp-1"
            title={item.title}
          >
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-medium">
            {item.year && <span className="font-mono text-neutral-700 font-semibold">{item.year}</span>}
            {item.year && <span>&bull;</span>}
            <span className="truncate text-neutral-500">{item.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
