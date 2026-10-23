export type SourceId = 'dhakaflix' | 'icc';
export type MediaType = 'movie' | 'series';

export interface MediaItem {
  id: string;
  title: string;
  year?: number;
  type: MediaType;
  category: string;
  source: SourceId;
  posterUrl?: string;
  folderUrl: string;
  discoveredAt: string;
  qualityBadge?: string;
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

export interface WatchProgress {
  itemId: string;
  title: string;
  currentTime: number;
  duration: number;
  posterUrl?: string;
  source: SourceId;
  category?: string;
  lastWatchedAt: string;
}

export interface PlayerSettings {
  theme: 'dark' | 'light' | 'system';
  defaultSpeed: number;
  autoplayNext: boolean;
  resumePlayback: boolean;
  subtitleSize: 'small' | 'medium' | 'large';
  subtitleBackground: boolean;
  iccSessionToken?: string;
}
