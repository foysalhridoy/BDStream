import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, HardDrive, ShieldCheck, Film, Tv } from 'lucide-react';
import { MediaItem, PlaybackDescriptor } from '../types/media';
import { VlcPlayer } from '../components/player/VlcPlayer';
import { SourceBadge } from '../components/layout/SourceBadge';
import { ApiService } from '../services/api';

interface WatchPageProps {
  item: MediaItem;
  versionId?: string;
  onBack: () => void;
}

export const WatchPage: React.FC<WatchPageProps> = ({ item, versionId, onBack }) => {
  const [playback, setPlayback] = useState<PlaybackDescriptor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    ApiService.resolvePlayback(item.id, versionId)
      .then((desc) => {
        if (!isMounted) return;
        setPlayback(desc);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to resolve playable media stream from source.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.id, versionId]);

  return (
    <div className={`pb-12 ${isCinemaMode ? 'fixed inset-0 z-50 bg-black overflow-y-auto' : ''}`}>
      {/* Top Breadcrumb & Cinema Mode Exit */}
      {!isCinemaMode && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </button>
          <div className="flex items-center gap-2">
            <SourceBadge source={item.source} size="sm" />
            {item.qualityBadge && (
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                {item.qualityBadge}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Video Player Container */}
      <div className="mb-6">
        {loading && (
          <div className="w-full aspect-video bg-bdstream-card border border-bdstream-border rounded-xl flex flex-col items-center justify-center p-8 text-center animate-pulse">
            <div className="w-12 h-12 border-4 border-vlc-orange border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-gray-200">Resolving Stream from {item.source}...</p>
            <p className="text-xs text-gray-500 font-mono mt-1">Checking byte-range support & audio codecs</p>
          </div>
        )}

        {error && (
          <div className="w-full aspect-video bg-bdstream-card border border-red-500/40 rounded-xl flex flex-col items-center justify-center p-8 text-center">
            <Film className="w-16 h-16 text-red-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Stream Unavailable</h3>
            <p className="text-sm text-gray-400 max-w-md mb-6">{error}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-vlc-orange text-white rounded-lg text-xs font-semibold hover:bg-vlc-darkOrange transition-colors"
              >
                Retry
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-xs font-semibold hover:bg-white/20 transition-colors"
              >
                Return to Browse
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

      {/* Video Details & Technical Metadata */}
      {!isCinemaMode && (
        <div className="bg-bdstream-card border border-bdstream-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-bdstream-border">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SourceBadge source={item.source} size="sm" />
                <span className="text-xs uppercase font-mono px-2 py-0.5 bg-bdstream-surface border border-bdstream-border rounded text-gray-300">
                  {item.category}
                </span>
                {item.year && (
                  <span className="text-xs font-mono text-gray-400">
                    {item.year}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {item.title}
              </h1>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                Source Item: {item.rawTitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {playback && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(playback.directUrl);
                    alert('Copied direct stream link! Open VLC Desktop -> Media -> Open Network Stream (Ctrl+N) and paste to stream.');
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
                <ExternalLink className="w-3.5 h-3.5" />
                Source Directory
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs font-mono text-gray-400">
            <div className="flex items-center gap-3 bg-bdstream-surface p-3.5 rounded-xl border border-bdstream-border">
              <HardDrive className="w-5 h-5 text-vlc-orange" />
              <div>
                <p className="text-gray-300 font-semibold">Streaming Protocol</p>
                <p className="text-[11px] text-gray-500">Progressive HTTP Range 206</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-bdstream-surface p-3.5 rounded-xl border border-bdstream-border">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-gray-300 font-semibold">SSRF Protection</p>
                <p className="text-[11px] text-gray-500">Strict Source Allowlist Active</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-bdstream-surface p-3.5 rounded-xl border border-bdstream-border">
              <Tv className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-gray-300 font-semibold">Player Engine</p>
                <p className="text-[11px] text-gray-500">VLC-Inspired Custom React</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
