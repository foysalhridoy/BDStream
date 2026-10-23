import React, { useEffect, useState } from 'react';
import { Play, X, Film, Subtitles, Layers, ExternalLink, Loader2 } from 'lucide-react';
import { MediaItem, MediaItemDetails } from '../../types/media';
import { SourceBadge } from '../layout/SourceBadge';
import { ApiService } from '../../services/api';

interface MediaDetailsModalProps {
  item: MediaItem;
  onClose: () => void;
  onPlay: (item: MediaItem, versionId?: string) => void;
}

export const MediaDetailsModal: React.FC<MediaDetailsModalProps> = ({
  item,
  onClose,
  onPlay
}) => {
  const [details, setDetails] = useState<MediaItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    ApiService.getItemDetails(item.id)
      .then((data) => {
        if (!isMounted) return;
        setDetails(data);
        if (data.versions.length > 0) {
          setSelectedVersionId(data.versions[0].id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Could not load item details from source.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item.id]);

  const posterSrc = (details?.posterUrl || item.posterUrl)
    ? ApiService.getProxyAssetUrl(details?.posterUrl || item.posterUrl)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-bdstream-card border border-bdstream-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/90 text-gray-300 hover:text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Poster Section */}
          <div className="w-full md:w-1/3 aspect-[2/3] bg-gray-900 relative overflow-hidden flex items-center justify-center">
            {posterSrc ? (
              <img
                src={posterSrc}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Film className="w-16 h-16 text-gray-600" />
            )}
            <div className="absolute top-3 left-3">
              <SourceBadge source={item.source} size="sm" />
            </div>
          </div>

          {/* Details Section */}
          <div className="p-6 md:w-2/3 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs uppercase font-mono px-2 py-0.5 bg-bdstream-surface border border-bdstream-border rounded text-gray-300">
                  {item.category}
                </span>
                {item.qualityBadge && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-vlc-orange/20 text-vlc-orange border border-vlc-orange/30 rounded">
                    {item.qualityBadge}
                  </span>
                )}
                {item.year && (
                  <span className="text-xs font-mono text-gray-400">
                    {item.year}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-white mb-3">
                {item.title}
              </h2>

              <p className="text-xs text-gray-400 mb-4 line-clamp-3">
                {details?.description || item.rawTitle}
              </p>

              {loading && (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-vlc-orange" />
                  <span>Inspecting media streams on {item.source}...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 mb-4">
                  {error}
                </div>
              )}

              {details && (
                <div className="space-y-3 mb-6">
                  {/* Versions */}
                  {details.versions.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-vlc-orange" />
                        Available Video Streams:
                      </label>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {details.versions.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVersionId(v.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                              selectedVersionId === v.id
                                ? 'bg-vlc-orange text-white'
                                : 'bg-bdstream-surface text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            <span className="truncate max-w-[280px]">{v.name}</span>
                            <span className="uppercase text-[10px] font-bold">{v.quality}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subtitles */}
                  {details.subtitles.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <Subtitles className="w-3.5 h-3.5 text-vlc-orange" />
                      <span>{details.subtitles.length} Subtitle Track(s) Available</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-bdstream-border">
              <button
                disabled={loading}
                onClick={() => onPlay(item, selectedVersionId)}
                className="flex-1 py-2.5 px-4 bg-vlc-orange hover:bg-vlc-darkOrange text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-vlc-orange/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                Play in VLC Player
              </button>
              <a
                href={item.folderUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-bdstream-surface hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-bdstream-border transition-colors"
                title="View original source directory"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
