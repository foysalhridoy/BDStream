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
      className="group relative bg-bdstream-card border border-bdstream-border/80 hover:border-vlc-orange/60 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-vlc-orange/15 hover:-translate-y-1 flex flex-col select-none"
    >
      {/* Poster / Banner Image Container */}
      <div className="relative aspect-[2/3] w-full bg-gradient-to-br from-gray-900 via-gray-950 to-black overflow-hidden flex items-center justify-center">
        {currentPosterSrc ? (
          <img
            src={currentPosterSrc}
            alt={item.title}
            loading="lazy"
            onError={() => setImgAttempt(prev => prev + 1)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Stylish Cinematic Fallback Banner if image file is absent */
          <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-gray-800 via-gray-900 to-black text-left">
            <div className="flex justify-between items-start">
              <span className="w-7 h-7 bg-vlc-orange/20 text-vlc-orange rounded-lg flex items-center justify-center font-bold text-xs">
                DF
              </span>
              {item.year && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/60 text-gray-300">
                  {item.year}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <Film className="w-8 h-8 text-vlc-orange/60 mb-2" />
              <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                {item.title}
              </h4>
              <span className="text-[10px] text-vlc-orange uppercase font-semibold">
                {item.category}
              </span>
            </div>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          {item.qualityBadge && (
            <span className="bg-black/75 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow">
              {item.qualityBadge}
            </span>
          )}
        </div>

        {/* Hover Overlay with VLC Orange Play Button */}
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onPlayDirect) onPlayDirect(item);
              else onSelect(item);
            }}
            className="w-12 h-12 bg-vlc-orange hover:bg-vlc-darkOrange text-white rounded-full flex items-center justify-center shadow-xl shadow-vlc-orange/30 transform transition-transform hover:scale-110 active:scale-95"
            title="Play Stream"
          >
            <Play className="w-6 h-6 ml-0.5 fill-white" />
          </button>
        </div>

        {/* Continue Watching Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-950/80">
            <div
              className="h-full bg-vlc-orange"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <h3
            className="text-xs sm:text-sm font-semibold text-gray-100 group-hover:text-vlc-orange transition-colors line-clamp-1"
            title={item.title}
          >
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 font-medium">
            {item.year && <span className="font-mono text-gray-300">{item.year}</span>}
            {item.year && <span>&bull;</span>}
            <span className="truncate text-gray-400">{item.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
