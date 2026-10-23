import React, { useEffect, useState, useRef } from 'react';
import {
  Play,
  ArrowRight,
  Search,
  ChevronDown,
  Film
} from 'lucide-react';
import { MediaItem, SourceHealth, WatchProgress } from '../types/media';
import { MediaCard } from '../components/catalog/MediaCard';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { HeroCoverflow } from '../components/home/HeroCoverflow';

interface HomePageProps {
  onSelectItem: (item: MediaItem) => void;
  onPlayDirect: (item: MediaItem) => void;
  onNavigateCategory: (category: string) => void;
  sourcesHealth: Record<string, SourceHealth> | null;
}

interface ContinueWatchingCardProps {
  progress: WatchProgress;
  onPlayDirect: (item: MediaItem) => void;
}

const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ progress: p, onPlayDirect }) => {
  const [imgAttempt, setImgAttempt] = useState(0);

  const proxyPoster = p.posterUrl ? ApiService.getProxyAssetUrl(p.posterUrl) : undefined;
  const directPoster = p.posterUrl;
  const currentPosterSrc = imgAttempt === 0 ? proxyPoster : imgAttempt === 1 ? directPoster : null;

  const progressPercent = Math.min(100, Math.floor((p.currentTime / (p.duration || 1)) * 100));

  return (
    <div
      onClick={() => onPlayDirect({
        id: p.itemId,
        title: p.title,
        type: 'movie',
        category: p.category || 'Resume',
        source: p.source || 'dhakaflix',
        folderUrl: '',
        discoveredAt: p.lastWatchedAt,
        rawTitle: p.title,
        posterUrl: p.posterUrl
      })}
      className="bg-white border border-neutral-200/90 hover:border-[#d4ff00] p-0 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-center sm:gap-3 cursor-pointer transition-all hover:-translate-y-0.5 group shadow-xs hover:shadow-lg hover:shadow-lime-500/10 min-w-0 overflow-hidden"
    >
      {/* Poster Box: on mobile occupies the full card (aspect-[2/3]), on desktop fixed 56x80px */}
      <div className="w-full aspect-[2/3] sm:aspect-auto sm:w-14 sm:h-20 sm:min-w-[56px] sm:max-w-[56px] bg-neutral-100 rounded-xl overflow-hidden shrink-0 relative border-0 sm:border border-neutral-200/60 shadow-2xs">
        {currentPosterSrc ? (
          <img
            src={currentPosterSrc}
            alt={p.title}
            onError={() => setImgAttempt(prev => prev + 1)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 p-1 text-center">
            <Film className="w-5 h-5 text-neutral-400 mb-0.5" />
            <span className="text-[8px] sm:text-[9px] font-black tracking-tight text-neutral-600 line-clamp-1 px-0.5 uppercase">
              {p.title.slice(0, 6)}
            </span>
          </div>
        )}

        {/* Hover play icon */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#d4ff00] flex items-center justify-center shadow-md">
            <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-black text-black ml-0.5" />
          </div>
        </div>

        {/* Mobile-only slim electric lime progress indicator overlaid at bottom of poster */}
        <div className="absolute bottom-0 inset-x-0 h-1 sm:hidden bg-black/60 overflow-hidden">
          <div
            className="bg-[#d4ff00] h-full shadow-[0_0_6px_rgba(212,255,0,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Desktop-only details: title, progress info, and progress bar */}
      <div className="hidden sm:block flex-1 min-w-0">
        <h4 className="text-xs font-bold text-neutral-900 truncate group-hover:text-black transition-colors" title={p.title}>
          {p.title}
        </h4>
        <p className="text-[10px] text-neutral-500 font-mono mt-0.5 flex items-center justify-between">
          <span>Progress</span>
          <span className="font-semibold text-neutral-700">{progressPercent}%</span>
        </p>
        <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden mt-1.5 sm:mt-2 border border-neutral-200/60">
          <div
            className="bg-[#d4ff00] h-full rounded-full shadow-[0_0_8px_rgba(212,255,0,0.6)] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const HomePage: React.FC<HomePageProps> = ({
  onSelectItem,
  onPlayDirect,
  onNavigateCategory
}) => {
  const [featuredList, setFeaturedList] = useState<MediaItem[]>([]);
  const [recentItems, setRecentItems] = useState<MediaItem[]>([]);
  const [hindiItems, setHindiItems] = useState<MediaItem[]>([]);
  const [animations, setAnimations] = useState<MediaItem[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // A to Z Serialized Catalog State
  const [atozItems, setAtozItems] = useState<MediaItem[]>([]);
  const [atozTotal, setAtozTotal] = useState<number>(0);
  const [atozPage, setAtozPage] = useState<number>(1);
  const [selectedLetter, setSelectedLetter] = useState<string>('All');
  const [visibleCount, setVisibleCount] = useState<number>(18);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [atozSearch, setAtozSearch] = useState<string>('');

  // Gesture swiping refs for Continue Watching on mobile & touch devices
  const continueScrollRef = useRef<HTMLDivElement>(null);
  const continueDragStartXRef = useRef<number | null>(null);
  const continueScrollLeftRef = useRef<number>(0);
  const isContinueDraggingRef = useRef<boolean>(false);

  const handleContinuePointerDown = (e: React.PointerEvent) => {
    if (!continueScrollRef.current) return;
    continueDragStartXRef.current = e.clientX;
    continueScrollLeftRef.current = continueScrollRef.current.scrollLeft;
    isContinueDraggingRef.current = true;
  };

  const handleContinuePointerMove = (e: React.PointerEvent) => {
    if (!isContinueDraggingRef.current || continueDragStartXRef.current === null || !continueScrollRef.current) return;
    const diff = (e.clientX - continueDragStartXRef.current) * 1.25;
    continueScrollRef.current.scrollLeft = continueScrollLeftRef.current - diff;
  };

  const handleContinuePointerUp = () => {
    isContinueDraggingRef.current = false;
    continueDragStartXRef.current = null;
  };

  const alphabet = ['All', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

  const fetchAtoZData = async (letter: string, pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      const queryOptions: any = {
        limit: 36,
        sortBy: 'title',
        sortOrder: 'asc',
        page: pageNum
      };

      if (letter && letter !== 'All') {
        queryOptions.letter = letter;
      }

      const res = await ApiService.getCatalog(queryOptions);

      if (append) {
        setAtozItems(prev => [...prev, ...res.items]);
      } else {
        setAtozItems(res.items);
        setVisibleCount(18);
      }
      setAtozTotal(res.total);
      setAtozPage(pageNum);
    } catch (err) {
      console.warn('A-Z load error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch initial catalog data
  useEffect(() => {
    setContinueWatching(StorageService.getAllWatchProgress());

    // 1. Fetch direct BAS Play live coverflow updates
    ApiService.getCatalog({ source: 'basplay', limit: 20 })
      .then((basRes) => {
        if (basRes.items && basRes.items.length > 0) {
          const vsCards = basRes.items.filter(i => i.category === 'Featured (BAS Play)');
          const candidates = vsCards.length >= 3 ? vsCards : basRes.items.filter(i => i.posterUrl);
          if (candidates.length > 0) {
            setFeaturedList(candidates.slice(0, 7));
          }
        }
      })
      .catch((e) => console.warn('BAS Play direct featured load warning:', e));

    // 2. Fetch general catalog for shelves
    ApiService.getCatalog({ limit: 100, sortBy: 'discoveredAt', sortOrder: 'desc' })
      .then((res) => {
        if (res.items.length > 0) {
          // Fallback if BAS Play hasn't loaded
          setFeaturedList((prev) => (prev.length > 0 ? prev : res.items.filter(i => i.posterUrl && !i.title.includes('?')).slice(0, 14)));

          // Shelves
          setRecentItems(res.items.slice(0, 8));
          setHindiItems(res.items.filter(i => i.category.includes('Hindi') || i.category.includes('South')).slice(0, 8));
          setAnimations(res.items.filter(i => i.category.includes('Animation')).slice(0, 8));
        }
      })
      .catch((err) => console.warn('Catalog load error:', err))
      .finally(() => setLoading(false));

    // 2. Initial A to Z load
    fetchAtoZData('All', 1, false);
  }, []);

  // Auto-hydrate missing poster URLs for watch progress from loaded catalogs or search
  useEffect(() => {
    const list = StorageService.getAllWatchProgress();
    if (!list.length) return;

    const pool = [...featuredList, ...recentItems, ...hindiItems, ...animations, ...atozItems];
    let localUpdated = false;
    const remainingToFetch: WatchProgress[] = [];

    list.forEach((p) => {
      if (!p.posterUrl) {
        const found = pool.find(
          item => item.id === p.itemId || item.title.toLowerCase().trim() === p.title.toLowerCase().trim()
        );
        if (found?.posterUrl) {
          StorageService.saveProgress({ ...p, posterUrl: found.posterUrl });
          localUpdated = true;
        } else {
          remainingToFetch.push(p);
        }
      }
    });

    if (localUpdated) {
      setContinueWatching(StorageService.getAllWatchProgress());
    }

    if (remainingToFetch.length > 0) {
      Promise.all(
        remainingToFetch.slice(0, 6).map(async (item) => {
          try {
            const searchRes = await ApiService.getCatalog({ search: item.title, limit: 1 });
            if (searchRes.items?.[0]?.posterUrl) {
              return { itemId: item.itemId, posterUrl: searchRes.items[0].posterUrl };
            }
            const details = await ApiService.getItemDetails(item.itemId);
            if (details.posterUrl) {
              return { itemId: item.itemId, posterUrl: details.posterUrl };
            }
          } catch {
            // Best effort
          }
          return null;
        })
      ).then((results) => {
        let asyncUpdated = false;
        results.forEach((res) => {
          if (res) {
            const current = StorageService.getProgress(res.itemId);
            if (current && !current.posterUrl) {
              StorageService.saveProgress({ ...current, posterUrl: res.posterUrl });
              asyncUpdated = true;
            }
          }
        });
        if (asyncUpdated) {
          setContinueWatching(StorageService.getAllWatchProgress());
        }
      });
    }
  }, [featuredList, recentItems, hindiItems, animations, atozItems]);

  const handleSelectLetter = (letter: string) => {
    setSelectedLetter(letter);
    fetchAtoZData(letter, 1, false);
  };

  const handleSeeMore = () => {
    if (visibleCount + 18 <= atozItems.length) {
      setVisibleCount(prev => prev + 18);
    } else {
      fetchAtoZData(selectedLetter, atozPage + 1, true);
      setVisibleCount(prev => prev + 18);
    }
  };

  // Filtered A-Z items
  const displayedAtoZ = atozItems.filter((item) => {
    if (!atozSearch.trim()) return true;
    const q = atozSearch.trim().toLowerCase();
    return item.title.toLowerCase().includes(q) || item.rawTitle.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 sm:space-y-10 pb-6 sm:pb-8">
      {/* 3D Coverflow Hero Showcase */}
      {featuredList.length > 0 ? (
        <HeroCoverflow
          items={featuredList}
          onPlayDirect={onPlayDirect}
          onSelectItem={onSelectItem}
        />
      ) : loading ? (
        <div className="h-56 sm:h-96 rounded-3xl bg-bdstream-card/60 border border-bdstream-border animate-pulse flex flex-col justify-end p-8 space-y-4">
          <div className="w-32 h-6 bg-white/10 rounded-full" />
          <div className="w-72 h-10 bg-white/10 rounded-xl" />
          <div className="w-48 h-4 bg-white/10 rounded-lg" />
        </div>
      ) : null}

      {/* Continue Watching Section */}
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2.5 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4ff00] inline-block shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
              <h2 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-1.5 tracking-tight">
                <span>Continue</span>
                <span className="bg-[#d4ff00] text-black px-2.5 py-0.5 rounded-lg font-black text-[0.85em] shadow-2xs">Watching</span>
              </h2>
            </div>
            {continueWatching.length > 4 && (
              <span className="text-[11px] font-bold text-neutral-400 sm:hidden">
                Swipe &rarr;
              </span>
            )}
          </div>

          {/* Mobile Swipeable Track (Swipable Left/Right with hand/mouse) / Desktop Responsive Grid */}
          <div
            ref={continueScrollRef}
            onPointerDown={handleContinuePointerDown}
            onPointerMove={handleContinuePointerMove}
            onPointerUp={handleContinuePointerUp}
            onPointerCancel={handleContinuePointerUp}
            className="flex sm:grid overflow-x-auto sm:overflow-visible gap-2 sm:gap-4 snap-x snap-mandatory scroll-smooth touch-pan-x select-none pb-1 sm:pb-0 scrollbar-none sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 cursor-grab active:cursor-grabbing"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {continueWatching.slice(0, 12).map((p) => (
              <div
                key={p.itemId}
                className="w-[calc(25%-6px)] min-w-[72px] sm:min-w-0 sm:w-auto shrink-0 snap-start"
              >
                <ContinueWatchingCard
                  progress={p}
                  onPlayDirect={onPlayDirect}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Added Shelf */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-2 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4ff00] inline-block shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
              <span>Recently Added</span>
              <span className="bg-[#d4ff00] text-black px-2.5 py-0.5 rounded-lg font-black text-[0.85em] shadow-2xs">Releases</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Freshly indexed movies and series from ISP servers</p>
          </div>
          <button
            onClick={() => onNavigateCategory('English Movies')}
            className="text-xs font-black text-black bg-[#d4ff00] hover:bg-[#c4ec00] px-3.5 py-1.5 rounded-full shadow-2xs inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
          >
            Explore All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
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
      </section>

      {/* A to Z Serialized Movies & Web Series Section */}
      <section className="bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 flex items-center gap-2 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4ff00] inline-block shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
              <span>All Movies &</span>
              <span className="bg-[#d4ff00] text-black px-2.5 py-0.5 rounded-lg font-black text-[0.85em] shadow-2xs">Web Series (A to Z)</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Browse movies & series alphabetically from A to Z serially
            </p>
          </div>

          {/* Quick Search inside A-Z */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search title..."
              value={atozSearch}
              onChange={(e) => setAtozSearch(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-[#d4ff00] focus:ring-2 focus:ring-[#d4ff00]/40 focus:bg-white transition-colors"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* A-Z Alphabet Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {alphabet.map((letter) => (
            <button
              key={letter}
              onClick={() => handleSelectLetter(letter)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-black transition-all flex-shrink-0 ${
                selectedLetter === letter
                  ? 'bg-[#d4ff00] text-black font-black shadow-sm scale-105'
                  : 'bg-white text-neutral-600 hover:text-black hover:bg-neutral-100 border border-neutral-200 shadow-2xs'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Media Grid */}
        {displayedAtoZ.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayedAtoZ.slice(0, visibleCount).map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onSelect={onSelectItem}
                onPlayDirect={onPlayDirect}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-neutral-500 font-mono bg-neutral-50 rounded-2xl border border-neutral-200">
            No titles starting with "{selectedLetter}" found.
          </div>
        )}

        {/* See More Button */}
        {displayedAtoZ.length > 0 && (
          <div className="flex flex-col items-center justify-center mt-8 gap-2">
            {visibleCount < displayedAtoZ.length || atozItems.length < atozTotal ? (
              <button
                onClick={handleSeeMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full bg-[#d4ff00] hover:bg-[#c4ec00] text-black font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-lime-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <span>Loading more movies...</span>
                ) : (
                  <>
                    <span>See More Movies & Series</span>
                    <ChevronDown className="w-4 h-4 animate-bounce" />
                  </>
                )}
              </button>
            ) : (
              <span className="text-xs text-neutral-500 font-mono">
                Showing all {displayedAtoZ.length} titles
              </span>
            )}
            <span className="text-[11px] text-neutral-400 font-mono">
              Displaying {Math.min(visibleCount, displayedAtoZ.length)} of {atozTotal} titles
            </span>
          </div>
        )}
      </section>

      {/* Hindi & South Indian Shelf */}
      {hindiItems.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-2 tracking-tight">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d4ff00] inline-block shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
                <span>Hindi & South</span>
                <span className="bg-[#d4ff00] text-black px-2.5 py-0.5 rounded-lg font-black text-[0.85em] shadow-2xs">Indian Hits</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">Bollywood blockbusters and South Indian dubbed media</p>
            </div>
            <button
              onClick={() => onNavigateCategory('Hindi Movies')}
              className="text-xs font-black text-black bg-[#d4ff00] hover:bg-[#c4ec00] px-3.5 py-1.5 rounded-full shadow-2xs inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-2 tracking-tight">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d4ff00] inline-block shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
                <span>Animation &</span>
                <span className="bg-[#d4ff00] text-black px-2.5 py-0.5 rounded-lg font-black text-[0.85em] shadow-2xs">Family</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">High quality animated movies and series</p>
            </div>
            <button
              onClick={() => onNavigateCategory('Animation Movies')}
              className="text-xs font-black text-black bg-[#d4ff00] hover:bg-[#c4ec00] px-3.5 py-1.5 rounded-full shadow-2xs inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
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
