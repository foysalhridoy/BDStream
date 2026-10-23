import React, { useEffect, useState } from 'react';
import { Play, Info, Sparkles, Server, Wifi, Clock, ArrowRight } from 'lucide-react';
import { MediaItem, SourceHealth, WatchProgress } from '../types/media';
import { MediaCard } from '../components/catalog/MediaCard';
import { SourceBadge } from '../components/layout/SourceBadge';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';

interface HomePageProps {
  onSelectItem: (item: MediaItem) => void;
  onPlayDirect: (item: MediaItem) => void;
  onNavigateTab: (tab: string, categoryFilter?: string) => void;
  sourcesHealth: Record<string, SourceHealth> | null;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectItem,
  onPlayDirect,
  onNavigateTab,
  sourcesHealth
}) => {
  const [featuredItem, setFeaturedItem] = useState<MediaItem | null>(null);
  const [recentItems, setRecentItems] = useState<MediaItem[]>([]);
  const [movies1080p, setMovies1080p] = useState<MediaItem[]>([]);
  const [animations, setAnimations] = useState<MediaItem[]>([]);
  const [tvSeries, setTvSeries] = useState<MediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load continue watching
    setContinueWatching(StorageService.getAllWatchProgress());

    // Fetch initial catalog shelves
    ApiService.getCatalog({ limit: 48, sortBy: 'discoveredAt', sortOrder: 'desc' })
      .then((res) => {
        if (res.items.length > 0) {
          setFeaturedItem(res.items[0]);
          setRecentItems(res.items.slice(0, 12));
          setMovies1080p(res.items.filter(i => i.category.includes('1080p')).slice(0, 6));
          setAnimations(res.items.filter(i => i.category.toLowerCase().includes('animation')).slice(0, 6));
          setTvSeries(res.items.filter(i => i.type === 'series').slice(0, 6));
        }
      })
      .catch((err) => console.warn('Home catalog load error:', err))
      .finally(() => setLoading(false));
  }, []);

  const dfHealth = sourcesHealth?.dhakaflix;
  const iccHealth = sourcesHealth?.icc;

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Featured Banner */}
      {featuredItem && (
        <div className="relative rounded-3xl overflow-hidden border border-bdstream-border bg-gradient-to-r from-gray-950 via-gray-900 to-bdstream-card shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent z-10" />

          {/* Hero background image */}
          {featuredItem.posterUrl && (
            <div
              className="absolute right-0 top-0 bottom-0 w-full md:w-2/3 bg-cover bg-center opacity-30 blur-[1px] mask-gradient"
              style={{
                backgroundImage: `url(${ApiService.getProxyAssetUrl(featuredItem.posterUrl)})`,
              }}
            />
          )}

          <div className="relative z-20 p-6 sm:p-10 md:p-14 max-w-2xl flex flex-col justify-end min-h-[380px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-vlc-orange/20 text-vlc-orange border border-vlc-orange/30">
                <Sparkles className="w-3.5 h-3.5" />
                Featured Discovery
              </span>
              <SourceBadge source={featuredItem.source} size="sm" />
              {featuredItem.qualityBadge && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                  {featuredItem.qualityBadge}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              {featuredItem.title}
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 mb-6 line-clamp-2">
              Ready to stream directly from verified local ISP storage nodes with full HTTP 206 byte-range seeking.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onPlayDirect(featuredItem)}
                className="px-6 py-3 bg-vlc-orange hover:bg-vlc-darkOrange text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-vlc-orange/30 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-white" />
                Watch Now
              </button>
              <button
                onClick={() => onSelectItem(featuredItem)}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl flex items-center gap-2 backdrop-blur-md border border-white/10 transition-colors"
              >
                <Info className="w-4 h-4" />
                Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Connection Status Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DhakaFlix Card */}
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">DhakaFlix Media</h3>
                <span className={`w-2 h-2 rounded-full ${dfHealth?.isAccessible ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {dfHealth?.message || 'Connecting to 172.16.50.4...'}
              </p>
              <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-gray-400">
                <span>Latency: <strong className="text-gray-200">{dfHealth?.latencyMs ?? 0}ms</strong></span>
                <span>&bull;</span>
                <span>Type: <strong className="text-gray-200">h5ai Storage Clusters</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('catalog')}
            className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
          >
            Explore &rarr;
          </button>
        </div>

        {/* ICC Card */}
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-5 flex items-start justify-between shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">ICC Media Portal</h3>
                <span className={`w-2 h-2 rounded-full ${iccHealth?.isAccessible ? 'bg-blue-400' : 'bg-yellow-400'}`} />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {iccHealth?.message || 'Probing 10.16.100.244...'}
              </p>
              <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-gray-400">
                <span>Auth: <strong className="text-yellow-400">Subscriber Session Required</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('diagnostics')}
            className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
          >
            Diagnostics &rarr;
          </button>
        </div>
      </div>

      {/* Continue Watching Shelf */}
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-vlc-orange" />
              <h2 className="text-lg font-bold text-white">Continue Watching</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {continueWatching.slice(0, 4).map((p) => (
              <div
                key={p.itemId}
                onClick={() => onNavigateTab('watch')}
                className="bg-bdstream-card border border-bdstream-border hover:border-vlc-orange/50 rounded-xl p-3 flex items-center gap-3 cursor-pointer group transition-all"
              >
                <div className="w-16 h-20 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {p.posterUrl ? (
                    <img
                      src={ApiService.getProxyAssetUrl(p.posterUrl)}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-xs">
                      VLC
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate group-hover:text-vlc-orange transition-colors">
                    {p.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <SourceBadge source={p.source} size="sm" />
                  </div>
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

      {/* Recently Added Shelf */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Recently Added</h2>
            <p className="text-xs text-gray-400">Discovered directly from local ISP repositories</p>
          </div>
          <button
            onClick={() => onNavigateTab('catalog')}
            className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-bdstream-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentItems.slice(0, 6).map((item) => (
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

      {/* 1080p Movies Shelf */}
      {movies1080p.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">1080p High Definition</h2>
              <p className="text-xs text-gray-400">Full HD movies with high bitrate direct streaming</p>
            </div>
            <button
              onClick={() => onNavigateTab('catalog', 'English 1080p')}
              className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
            >
              Explore 1080p <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {movies1080p.map((item) => (
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Animation & Family</h2>
              <p className="text-xs text-gray-400">Animated movies and family entertainment</p>
            </div>
            <button
              onClick={() => onNavigateTab('catalog', 'Animation')}
              className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
            >
              Explore Animations <ArrowRight className="w-3.5 h-3.5" />
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

      {/* TV Series Shelf */}
      {tvSeries.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">TV & Web Series</h2>
              <p className="text-xs text-gray-400">Trending serialized shows and seasons</p>
            </div>
            <button
              onClick={() => onNavigateTab('series')}
              className="text-xs font-semibold text-vlc-orange hover:underline flex items-center gap-1"
            >
              Explore Series <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tvSeries.map((item) => (
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
