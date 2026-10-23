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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white border border-neutral-200 rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-fade-in my-4 sm:my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-full transition-colors border border-neutral-200 shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Poster Section */}
          <div className="w-full md:w-1/3 h-52 sm:h-64 md:h-auto aspect-[16/9] md:aspect-[2/3] bg-neutral-100 relative overflow-hidden flex items-center justify-center border-b md:border-b-0 md:border-r border-neutral-200">
            {posterSrc ? (
              <img
                src={posterSrc}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Film className="w-16 h-16 text-neutral-400" />
            )}
            <div className="absolute top-3 left-3">
              <SourceBadge source={item.source} size="sm" />
            </div>
          </div>

          {/* Details Section */}
          <div className="p-4 sm:p-6 md:w-2/3 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs uppercase font-mono px-2.5 py-0.5 bg-neutral-100 border border-neutral-200 rounded-full text-neutral-700 font-bold">
                  {item.category}
                </span>
                {item.qualityBadge && (
                  <span className="text-xs font-mono font-black px-2.5 py-0.5 bg-[#d4ff00] text-black rounded-full shadow-xs">
                    {item.qualityBadge}
                  </span>
                )}
                {item.year && (
                  <span className="text-xs font-mono text-neutral-500 font-semibold">
                    {item.year}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-neutral-900 mb-3">
                {item.title}
              </h2>

              <p className="text-xs text-neutral-600 mb-4 line-clamp-3 leading-relaxed">
                {details?.description || item.rawTitle}
              </p>

              {loading && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-900" />
                  <span>Inspecting media streams on {item.source}...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 mb-4">
                  {error}
                </div>
              )}

              {details && (
                <div className="space-y-3 mb-6">
                  {/* Versions */}
                  {details.versions.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-neutral-800 mb-1 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-neutral-700" />
                        Available Video Streams:
                      </label>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {details.versions.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVersionId(v.id)}
                            className={`w-full text-left px-3 py-1.5 rounded-full text-xs font-mono flex items-center justify-between transition-colors ${
                              selectedVersionId === v.id
                                ? 'bg-[#d4ff00] text-black font-black shadow-sm'
                                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 border border-neutral-200'
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
                    <div className="flex items-center gap-2 text-xs text-neutral-600">
                      <Subtitles className="w-3.5 h-3.5 text-neutral-700" />
                      <span>{details.subtitles.length} Subtitle Track(s) Available</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
              <button
                disabled={loading}
                onClick={() => onPlay(item, selectedVersionId)}
                className="flex-1 py-2.5 px-4 bg-[#d4ff00] hover:bg-[#c4ec00] text-black font-black rounded-full flex items-center justify-center gap-2 shadow-lg shadow-lime-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-xs"
              >
                <Play className="w-4 h-4 fill-black text-black" />
                Play in BDStream Player
              </button>
              <a
                href={item.folderUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-full border border-neutral-200 transition-colors shadow-xs"
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
