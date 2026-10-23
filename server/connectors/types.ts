export type SourceId = 'dhakaflix' | 'icc';
export type MediaType = 'movie' | 'series';

export interface MediaItem {
  id: string; // Base64 or hash of unique folder/item identifier
  title: string;
  year?: number;
  type: MediaType;
  category: string;
  source: SourceId;
  posterUrl?: string;
  folderUrl: string;
  discoveredAt: string;
  qualityBadge?: string; // e.g. "1080p", "720p"
  size?: string;
  rawTitle: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  url: string;
  format: 'vtt' | 'srt';
}

export interface MediaVersion {
  id: string;
  name: string;
  quality: string;
  fileUrl: string;
  sizeBytes?: number;
  mimeType?: string;
}

export interface MediaItemDetails extends MediaItem {
  description?: string;
  duration?: string;
  versions: MediaVersion[];
  subtitles: SubtitleTrack[];
  directPlaybackSupported: boolean;
  seasons?: {
    seasonNumber: number;
    episodes: {
      episodeNumber: number;
      title: string;
      fileUrl: string;
    }[];
  }[];
}

export interface PlaybackDescriptor {
  itemId: string;
  title: string;
  source: SourceId;
  directUrl: string;
  relayStreamUrl: string;
  streamType: 'progressive' | 'hls';
  mimeType: string;
  sizeBytes?: number;
  supportsRangeRequests: boolean;
  subtitles: SubtitleTrack[];
  availableQualities: string[];
}

export interface SourceHealth {
  id: SourceId;
  name: string;
  baseUrl: string;
  isAccessible: boolean;
  latencyMs: number;
  requiresSession: boolean;
  sessionValid?: boolean;
  itemCount: number;
  error?: string;
  message: string;
  lastChecked: string;
}

export interface CatalogQueryOptions {
  source?: SourceId | 'all';
  type?: MediaType | 'all';
  category?: string;
  search?: string;
  year?: number;
  sortBy?: 'discoveredAt' | 'title' | 'year';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CatalogResult {
  items: MediaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: string[];
  years: number[];
  sourcesActive: Record<SourceId, boolean>;
}

export interface ISourceConnector {
  id: SourceId;
  name: string;
  checkAvailability(): Promise<SourceHealth>;
  getCatalog(options?: CatalogQueryOptions): Promise<MediaItem[]>;
  getItemDetails(itemId: string): Promise<MediaItemDetails>;
  resolvePlayback(itemId: string, versionId?: string): Promise<PlaybackDescriptor>;
}
