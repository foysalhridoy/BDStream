import React, { useEffect, useState } from 'react';
import { Play, Info, Sparkles, Clock, ArrowRight } from 'lucide-react';
import { MediaItem, SourceHealth, WatchProgress } from '../types/media';
import { MediaCard } from '../components/catalog/MediaCard';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';

interface HomePageProps {
  onSelectItem: (item: MediaItem) => void;
  onPlayDirect: (item: MediaItem) => void;
  onNavigateCategory: (category: string) => void;
  sourcesHealth: Record<string, SourceHealth> | null;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectItem,
  onPlayDirect,
  onNavigateCategory
}) => {
  const [featuredItem, setFeaturedItem] = useState<MediaItem | null>(null);
  const [recentItems, setRecentItems] = useState<MediaItem[]>([]);
  const [hindiItems, setHindiItems] = useState<MediaItem[]>([]);
  const [seriesItems, setSeriesItems] = useState<MediaItem[]>([]);
  const [animations, setAnimations] = useState<MediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setContinueWatching(StorageService.getAllWatchProgress());

    ApiService.getCatalog({ limit: 60, sortBy: 'discoveredAt', sortOrder: 'desc' })
      .then((res) => {
        if (res.items.length > 0) {
          // Find an item with a clean title for featured banner
          const feat = res.items.find(i => i.posterUrl && !i.title.includes('?')) || res.items[0];
          setFeaturedItem(feat);
          setRecentItems(res.items.filter(i => i.category.includes('English')).slice(0, 6));
          setHindiItems(res.items.filter(i => i.category.includes('Hindi') || i.category.includes('South')).slice(0, 6));
          setSeriesItems(res.items.filter(i => i.type === 'series' || i.category.includes('Series')).slice(0, 6));
          setAnimations(res.items.filter(i => i.category.includes('Animation')).slice(0, 6));
        }
      })
      .catch((err) => console.warn('Catalog load error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 pb-16">
      {/* Minimal Hero Spotlight Banner */}
      {featuredItem && (
        <div className="relative rounded-3xl overflow-hidden border border-bdstream-border/80 bg-gradient-to-r from-gray-950 via-gray-900 to-bdstream-card shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent z-10" />

          {featuredItem.posterUrl && (
            <div
              className="absolute right-0 top-0 bottom-0 w-full md:w-3/5 bg-cover bg-center opacity-40 blur-[1px]"
              style={{
                backgroundImage: `url(${ApiService.getProxyAssetUrl(featuredItem.posterUrl)})`,
              }}
            />
          )}

          <div className="relative z-20 p-6 sm:p-10 md:p-12 max-w-xl flex flex-col justify-end min-h-[340px]">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-vlc-orange/20 text-vlc-orange border border-vlc-orange/30">
                <Sparkles className="w-3.5 h-3.5" />
                Featured on DhakaFlix
              </span>
              {featuredItem.qualityBadge && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-white/10 text-white">
                  {featuredItem.qualityBadge}
                </span>
              )}
              {featuredItem.year && (
                <span className="font-mono text-xs text-gray-400">
                  {featuredItem.year}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-2.5">
              {featuredItem.title}
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 mb-6 font-medium line-clamp-2">
              Stream directly from DhakaFlix storage with instant seeking and high bitrate playback.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onPlayDirect(featuredItem)}
                className="px-5 py-2.5 bg-vlc-orange hover:bg-vlc-darkOrange text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-vlc-orange/30 transition-transform hover:scale-105 active:scale-95 text-xs sm:text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                Watch Now
              </button>
              <button
                onClick={() => onSelectItem(featuredItem)}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl flex items-center gap-2 backdrop-blur-md border border-white/10 transition-colors text-xs sm:text-sm"
              >
                <Info className="w-4 h-4" />
                Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-vlc-orange" />
              <h2 className="text-base sm:text-lg font-bold text-white">Continue Watching</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {continueWatching.slice(0, 4).map((p) => (
              <div
                key={p.itemId}
                onClick={() => onSelectItem({
                  id: p.itemId,
                  title: p.title,
                  type: 'movie',
                  category: p.category || 'DhakaFlix',
                  source: 'dhakaflix',
                  folderUrl: '',
                  discoveredAt: p.lastWatchedAt,
                  rawTitle: p.title,
                  posterUrl: p.posterUrl
                })}
                className="bg-bdstream-card border border-bdstream-border hover:border-vlc-orange/50 rounded-2xl p-3 flex items-center gap-3 cursor-pointer group transition-all"
              >
                <div className="w-16 h-20 bg-gray-900 rounded-xl overflow-hidden flex-shrink-0 relative">
                  {p.posterUrl ? (
                    <img
                      src={ApiService.getProxyAssetUrl(p.posterUrl)}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-vlc-orange font-bold text-xs bg-gray-950">
                      DF
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-vlc-orange transition-colors">
                    {p.title}
                  </h4>
                  <div className="mt-2 w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-vlc-orange h-full"
                      style={{ width: `${(p.currentTime / p.duration) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* English Movies Shelf */}
      <section>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">English Movies</h2>
            <p className="text-xs text-gray-400">Latest releases from DhakaFlix English collection</p>
          </div>
          <button
            onClick={() => onNavigateCategory('English Movies')}
            className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-bdstream-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onSelect={onSelectItem}
                onPlayDirect={onPlayDirect}
              />
            ))}
          </div>
        )}
      </section>

      {/* TV & Web Series Shelf */}
      {seriesItems.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">TV & Web Series</h2>
              <p className="text-xs text-gray-400">Complete seasons and multi-episode web series</p>
            </div>
            <button
              onClick={() => onNavigateCategory('TV & Web Series')}
              className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
            >
              All Series <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {seriesItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onSelect={onSelectItem}
                onPlayDirect={onPlayDirect}
              />
            ))}
          </div>
        </section>
      )}

      {/* Hindi & South Indian Shelf */}
      {hindiItems.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Hindi & South Indian Movies</h2>
              <p className="text-xs text-gray-400">Bollywood blockbusters and South Hindi dubbed releases</p>
            </div>
            <button
              onClick={() => onNavigateCategory('Hindi Movies')}
              className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {hindiItems.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onSelect={onSelectItem}
                onPlayDirect={onPlayDirect}
              />
            ))}
          </div>
        </section>
      )}

      {/* Animations Shelf */}
      {animations.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Animation & Family</h2>
              <p className="text-xs text-gray-400">Full animated features and family movies</p>
            </div>
            <button
              onClick={() => onNavigateCategory('Animation Movies')}
              className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
            >
              View Animations <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {animations.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onSelect={onSelectItem}
                onPlayDirect={onPlayDirect}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
