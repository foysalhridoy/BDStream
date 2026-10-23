import React, { useState } from 'react';
import { Play, Film } from 'lucide-react';
import { MediaItem } from '../../types/media';
import { SourceBadge } from '../layout/SourceBadge';
import { ApiService } from '../../services/api';
import { StorageService } from '../../services/storage';

interface MediaCardProps {
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onPlayDirect?: (item: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onSelect, onPlayDirect }) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check saved progress
  const progress = StorageService.getProgress(item.id);
  const progressPercent = progress && progress.duration > 0
    ? (progress.currentTime / progress.duration) * 100
    : 0;

  const posterSrc = item.posterUrl ? ApiService.getProxyAssetUrl(item.posterUrl) : undefined;

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-bdstream-card border border-bdstream-border hover:border-vlc-orange/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-vlc-orange/10 hover:-translate-y-1 flex flex-col"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full bg-gray-900 overflow-hidden flex items-center justify-center">
        {posterSrc && !imageError ? (
          <img
            src={posterSrc}
            alt={item.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-gray-500">
            <Film className="w-12 h-12 mb-2 text-gray-600 group-hover:text-vlc-orange transition-colors" />
            <span className="text-xs font-medium text-gray-400 line-clamp-2">{item.title}</span>
          </div>
        )}

        {/* Quality Badge Overlay */}
        {item.qualityBadge && (
          <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
            {item.qualityBadge}
          </span>
        )}

        {/* Source Badge Top Left */}
        <div className="absolute top-2 left-2">
          <SourceBadge source={item.source} size="sm" />
        </div>

        {/* Hover Overlay with Big Play Button */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onPlayDirect) onPlayDirect(item);
              else onSelect(item);
            }}
            className="w-12 h-12 bg-vlc-orange hover:bg-vlc-darkOrange text-white rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 active:scale-95"
            title="Stream Now"
          >
            <Play className="w-6 h-6 ml-0.5 fill-white" />
          </button>
        </div>

        {/* Continue Watching Progress Bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800">
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
            className="text-sm font-semibold text-gray-100 group-hover:text-vlc-orange transition-colors line-clamp-1"
            title={item.title}
          >
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 font-medium">
            {item.year && <span>{item.year}</span>}
            {item.year && <span>&bull;</span>}
            <span className="truncate">{item.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
