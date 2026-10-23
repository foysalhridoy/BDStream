import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, HardDrive, Tv, Play, Check } from 'lucide-react';
import { MediaItem, MediaItemDetails, PlaybackDescriptor } from '../types/media';
import { VlcPlayer } from '../components/player/VlcPlayer';
import { ApiService } from '../services/api';

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
          setSelectedSeason(d.seasons[0].seasonNumber);
        }
      })
      .catch((e) => console.warn('Could not load details:', e.message));

    return () => { isMounted = false; };
  }, [item.id]);

  // Load playback descriptor
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    ApiService.resolvePlayback(item.id, activeVersionId)
      .then((desc) => {
        if (!isMounted) return;
        setPlayback(desc);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to resolve playable media stream from DhakaFlix.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.id, activeVersionId]);

  const handleEpisodeSelect = (fileUrl: string) => {
    const vId = btoa(fileUrl);
    setActiveVersionId(vId);
  };

  const currentSeason = details?.seasons?.find(s => s.seasonNumber === selectedSeason) || details?.seasons?.[0];

  return (
    <div className={`pb-12 ${isCinemaMode ? 'fixed inset-0 z-50 bg-black overflow-y-auto' : ''}`}>
      {/* Top Header */}
      {!isCinemaMode && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full">
              DhakaFlix
            </span>
            {item.qualityBadge && (
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                {item.qualityBadge}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Video Player */}
      <div className="mb-6">
        {loading && (
          <div className="w-full aspect-video bg-bdstream-card border border-bdstream-border rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-pulse">
            <div className="w-12 h-12 border-4 border-vlc-orange border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-gray-200">Connecting to DhakaFlix Storage...</p>
            <p className="text-xs text-gray-500 font-mono mt-1">Preparing HTTP 206 range stream</p>
          </div>
        )}

        {error && (
          <div className="w-full aspect-video bg-bdstream-card border border-red-500/40 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Playback Notice</h3>
            <p className="text-xs text-gray-400 max-w-md mb-6">{error}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-vlc-orange text-white rounded-xl text-xs font-semibold hover:bg-vlc-darkOrange transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-white/10 text-gray-300 rounded-xl text-xs font-semibold hover:bg-white/20 transition-colors"
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

      {/* TV Series Episode Navigation (if Series) */}
      {details?.seasons && details.seasons.length > 0 && !isCinemaMode && (
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-bdstream-border">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-vlc-orange" />
              <h3 className="text-sm font-bold text-white">Episodes & Seasons</h3>
            </div>

            {/* Season Selector */}
            {details.seasons.length > 1 && (
              <div className="flex items-center gap-1 bg-bdstream-surface p-1 rounded-xl border border-bdstream-border">
                {details.seasons.map((s) => (
                  <button
                    key={s.seasonNumber}
                    onClick={() => setSelectedSeason(s.seasonNumber)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedSeason === s.seasonNumber
                        ? 'bg-vlc-orange text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Season {s.seasonNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episode Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {currentSeason?.episodes.map((ep) => {
              const isPlayingEp = playback?.directUrl === ep.fileUrl;
              return (
                <button
                  key={ep.fileUrl}
                  onClick={() => handleEpisodeSelect(ep.fileUrl)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                    isPlayingEp
                      ? 'bg-vlc-orange/20 border-vlc-orange text-white font-semibold'
                      : 'bg-bdstream-surface border-bdstream-border text-gray-300 hover:bg-white/5 hover:border-gray-600'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span className="font-mono text-vlc-orange mr-1.5 font-bold">
                      EP {ep.episodeNumber}
                    </span>
                    <span className="truncate">{ep.title}</span>
                  </div>
                  {isPlayingEp ? (
                    <Check className="w-4 h-4 text-vlc-orange flex-shrink-0" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-gray-500 group-hover:text-white flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Info Card */}
      {!isCinemaMode && (
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase font-mono px-2 py-0.5 bg-bdstream-surface border border-bdstream-border rounded text-gray-300">
                  {item.category}
                </span>
                {item.year && (
                  <span className="text-xs font-mono text-gray-400">
                    {item.year}
                  </span>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">
                {item.title}
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                {item.rawTitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {playback && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(playback.directUrl);
                    alert('Copied direct stream link! Paste in VLC Desktop -> Media -> Open Network Stream (Ctrl+N) to watch.');
                  }}
                  className="px-3.5 py-2 bg-vlc-orange/20 text-vlc-orange hover:bg-vlc-orange/30 border border-vlc-orange/40 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Copy Link for VLC Player
                </button>
              )}
              <a
                href={item.folderUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-bdstream-surface hover:bg-white/10 border border-bdstream-border rounded-xl text-xs font-semibold text-gray-200 inline-flex items-center gap-1.5 transition-colors"
              >
                <HardDrive className="w-3.5 h-3.5" />
                DhakaFlix Folder
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
