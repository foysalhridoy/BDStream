import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, HardDrive } from 'lucide-react';
import { MediaItem, MediaItemDetails, PlaybackDescriptor } from '../types/media';
import { VlcPlayer } from '../components/player/VlcPlayer';
import { ApiService } from '../services/api';
import { SourceBadge } from '../components/layout/SourceBadge';

interface WatchPageProps {
  item: MediaItem;
  versionId?: string;
  onBack: () => void;
}

export const WatchPage: React.FC<WatchPageProps> = ({ item, versionId: initialVersionId, onBack }) => {
  const [details, setDetails] = useState<MediaItemDetails | null>(null);
  const [playback, setPlayback] = useState<PlaybackDescriptor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>(initialVersionId);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  // Load item details (including seasons and episodes)
  useEffect(() => {
    let isMounted = true;
    ApiService.getItemDetails(item.id)
      .then((d) => {
        if (!isMounted) return;
        setDetails(d);
        if (d.seasons && d.seasons.length > 0) {
          // Find Season 1 (or earliest season)
          const sortedSeasons = [...d.seasons].sort((a, b) => a.seasonNumber - b.seasonNumber);
          const firstSeason = sortedSeasons[0];
          setSelectedSeason(firstSeason.seasonNumber);
          // If no specific episode was chosen, start at Episode 1 of the first season
          if (!initialVersionId && firstSeason.episodes.length > 0) {
            setActiveVersionId(firstSeason.episodes[0].fileUrl);
          }
        }
      })
      .catch((e) => console.warn('Could not load details:', e.message));

    return () => { isMounted = false; };
  }, [item.id, initialVersionId]);

  // Load playback descriptor
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    ApiService.resolvePlayback(item.id, activeVersionId)
      .then((desc) => {
        if (!isMounted) return;
        desc.posterUrl = desc.posterUrl || item.posterUrl;
        setPlayback(desc);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to resolve playable media stream from storage.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.id, activeVersionId]);

  const handleEpisodeSelect = (fileUrl: string) => {
    setActiveVersionId(fileUrl);
  };

  const currentSeason = details?.seasons?.find(s => s.seasonNumber === selectedSeason) || details?.seasons?.[0];
  const isSeries = Boolean(details?.seasons && details.seasons.length > 0);

  return (
    <div className={`pb-16 ${isCinemaMode ? 'fixed inset-0 z-50 bg-black overflow-y-auto' : ''}`}>
      {/* Top Header / Breadcrumb */}
      {!isCinemaMode && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </button>
          <div className="flex items-center gap-2">
            <SourceBadge source={item.source} size="sm" />
            {item.qualityBadge && (
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                {item.qualityBadge}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Streaming Layout: Full-Width Cinematic Player */}
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
        {/* Title on top of video */}
        {!isCinemaMode && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
              <span>{item.title}</span>
              {details?.year && <span className="text-neutral-500 font-normal text-base">({details.year})</span>}
            </h1>
            {isSeries && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#d4ff00] text-black font-black self-start sm:self-auto shadow-2xs">
                TV Series &bull; {details?.seasons?.length || 1} Season{(details?.seasons?.length || 1) > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Video Player */}
        <div className="w-full">
          {loading && (
            <div className="w-full aspect-video bg-white border border-neutral-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-pulse shadow-sm">
              <div className="w-12 h-12 border-4 border-[#d4ff00] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-bold text-neutral-900">Connecting to High-Speed Media Storage...</p>
              <p className="text-xs text-neutral-500 font-mono mt-1">Direct HTTP 206 Byte-Range Protocol</p>
            </div>
          )}

          {error && (
            <div className="w-full aspect-video bg-white border border-red-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-2">Playback Notice</h3>
              <p className="text-xs text-neutral-500 max-w-md mb-6">{error}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-[#d4ff00] hover:bg-[#c4ec00] text-black rounded-full text-xs font-black transition-colors shadow-sm"
                >
                  Retry Stream
                </button>
                <button
                  onClick={onBack}
                  className="px-5 py-2.5 bg-neutral-100 text-neutral-800 rounded-full text-xs font-bold hover:bg-neutral-200 transition-colors border border-neutral-200"
                >
                  Return to Catalog
                </button>
              </div>
            </div>
          )}

          {playback && !loading && (
            <VlcPlayer
              playback={playback}
              isCinemaMode={isCinemaMode}
              onToggleCinemaMode={() => setIsCinemaMode(!isCinemaMode)}
              onClose={isCinemaMode ? () => setIsCinemaMode(false) : onBack}
            />
          )}
        </div>

        {/* Series Seasons & Episodes Shelf (Directly Below Player) */}
        {isSeries && !isCinemaMode && (
          <div className="bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#d4ff00] text-black flex items-center justify-center font-black text-xs sm:text-sm shadow-2xs">
                  S{selectedSeason}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900">
                    Season {String(selectedSeason).padStart(2, '0')} Episodes
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-500 font-mono">
                    Total {currentSeason?.episodes.length || 0} Episodes available
                  </p>
                </div>
              </div>

              {/* Season Selector Tabs/Pills */}
              {details?.seasons && details.seasons.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {details.seasons.map((s) => (
                    <button
                      key={s.seasonNumber}
                      onClick={() => setSelectedSeason(s.seasonNumber)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-black whitespace-nowrap transition-all ${
                        selectedSeason === s.seasonNumber
                          ? 'bg-[#d4ff00] text-black font-black shadow-sm scale-105'
                          : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200 border border-neutral-200'
                      }`}
                    >
                      Season {String(s.seasonNumber).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Episodes Grid: Responsive grid */}
            <div className="pt-3.5">
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 max-h-[420px] overflow-y-auto pr-1">
                {currentSeason?.episodes.map((ep) => {
                  const isPlayingEp = playback?.directUrl === ep.fileUrl || activeVersionId === ep.fileUrl;
                  return (
                    <button
                      key={ep.fileUrl}
                      onClick={() => handleEpisodeSelect(ep.fileUrl)}
                      title={`Play Episode ${ep.episodeNumber}: ${ep.title}`}
                      className={`p-2.5 sm:p-3 rounded-xl font-mono text-left transition-all duration-200 border flex flex-col justify-between group ${
                        isPlayingEp
                          ? 'bg-[#d4ff00] border-[#d4ff00] text-black ring-2 ring-[#d4ff00] shadow-md'
                          : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800 hover:text-black hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[11px] sm:text-xs font-black ${isPlayingEp ? 'text-black' : 'text-neutral-600 group-hover:text-black'}`}>
                          EP {String(ep.episodeNumber).padStart(2, '0')}
                        </span>
                        {isPlayingEp ? (
                          <div className="flex items-end gap-0.5 h-3.5">
                            <span className="w-1 bg-black animate-[pulse_0.6s_ease-in-out_infinite] h-2.5 rounded-full" />
                            <span className="w-1 bg-black animate-[pulse_0.4s_ease-in-out_infinite] h-3.5 rounded-full" />
                            <span className="w-1 bg-black animate-[pulse_0.8s_ease-in-out_infinite] h-2 rounded-full" />
                          </div>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 group-hover:bg-[#d4ff00] transition-colors" />
                        )}
                      </div>
                      <p className={`text-[10px] sm:text-[11px] font-sans font-medium line-clamp-1 truncate ${isPlayingEp ? 'text-neutral-900 font-bold' : 'text-neutral-600 group-hover:text-black'}`}>
                        {ep.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Video Metadata & Quick Action Card */}
        {!isCinemaMode && (
          <div className="bg-white border border-neutral-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase font-mono px-2.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded-full text-neutral-700 font-bold">
                    {item.category}
                  </span>
                  {item.year && (
                    <span className="text-xs font-mono text-neutral-500 font-semibold">
                      {item.year}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-xl font-bold text-neutral-900">
                  {item.title}
                </h2>
                <p className="text-xs text-neutral-500 mt-1 font-mono">
                  {item.rawTitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {playback && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(playback.directUrl);
                      alert('Copied direct stream link! Open VLC Desktop -> Media -> Open Network Stream (Ctrl+N) to watch directly with 100% audio codecs.');
                    }}
                    className="px-4 py-2 bg-[#d4ff00] text-black hover:bg-[#c4ec00] rounded-full text-xs font-black inline-flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Copy Link for VLC Player
                  </button>
                )}
                {item.folderUrl && (
                  <a
                    href={item.folderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-full text-xs font-bold text-neutral-700 hover:text-neutral-900 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Source Folder
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
