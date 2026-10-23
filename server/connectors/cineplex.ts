import {
  MediaItem,
  MediaItemDetails,
  PlaybackDescriptor,
  SourceHealth,
  CatalogQueryOptions,
  SubtitleTrack
} from './types.js';
import { validateMediaUrl } from '../security/ssrfGuard.js';

interface CacheEntry {
  items: MediaItem[];
  timestamp: number;
}

export class CineplexConnector {
  public id = 'cineplex' as const;
  public name = 'CinePlex BD';
  private baseUrl = 'http://cineplexbd.net/';
  private cache: CacheEntry | null = null;
  private itemMap: Map<string, MediaItem> = new Map();
  private isScanning = false;

  public async checkAvailability(): Promise<SourceHealth> {
    const startTime = Date.now();
    try {
      validateMediaUrl(this.baseUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(this.baseUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,*/*' }
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      return {
        id: this.id,
        name: this.name,
        baseUrl: this.baseUrl,
        isAccessible: res.ok,
        latencyMs,
        requiresSession: false,
        itemCount: this.itemMap.size,
        message: res.ok ? 'Online & streaming on CinePlex BD' : `HTTP ${res.status}`,
        lastChecked: new Date().toISOString()
      };
    } catch (err: unknown) {
      return {
        id: this.id,
        name: this.name,
        baseUrl: this.baseUrl,
        isAccessible: false,
        latencyMs: Date.now() - startTime,
        requiresSession: false,
        itemCount: this.itemMap.size,
        error: (err as Error).message || 'Connection timeout',
        message: 'Cannot reach CinePlex BD.',
        lastChecked: new Date().toISOString()
      };
    }
  }

  public async getCatalog(_options?: CatalogQueryOptions): Promise<MediaItem[]> {
    const now = Date.now();
    if (this.cache && (now - this.cache.timestamp) < 900 * 1000) {
      return this.cache.items;
    }

    if (!this.isScanning) {
      await this.refreshCatalog();
    }

    return this.cache?.items || [];
  }

  public async refreshCatalog(): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;
    try {
      const items = await this.crawlCineplex();
      this.cache = { items, timestamp: Date.now() };
      this.itemMap.clear();
      for (const item of items) {
        this.itemMap.set(item.id, item);
      }
      console.log(`[CinePlex] Indexed ${items.length} titles with banners.`);
    } catch (err) {
      console.error('[CinePlex] Crawl failed:', err);
    } finally {
      this.isScanning = false;
    }
  }

  private async crawlCineplex(): Promise<MediaItem[]> {
    const categories = [
      { url: 'http://cineplexbd.net/category.php?category=English', name: 'English Movies', type: 'movie' as const },
      { url: 'http://cineplexbd.net/category.php?category=Hindi', name: 'Hindi Movies', type: 'movie' as const },
      { url: 'http://cineplexbd.net/category.php?category=Animation', name: 'Animation Movies', type: 'movie' as const },
      { url: 'http://cineplexbd.net/category.php?category=Bangla', name: 'Bangla Movies', type: 'movie' as const },
      { url: 'http://cineplexbd.net/category.php?category=Dual+Audio', name: 'Dual Audio Movies', type: 'movie' as const },
      { url: 'http://cineplexbd.net/category.php?category=Exclusive+Full+HD', name: 'Exclusive Full HD', type: 'movie' as const }
    ];

    const discovered: MediaItem[] = [];

    for (const cat of categories) {
      try {
        validateMediaUrl(cat.url);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(cat.url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) continue;

        const html = await res.text();
        const cardRegex = /<a\s+href="((?:view|tview)\.php\?id=(\d+)[^"]*)"[^>]*>[\s\S]*?<img\s+src="([^"]+)"\s+alt="([^"]+)"/gi;
        let match: RegExpExecArray | null;

        while ((match = cardRegex.exec(html)) !== null) {
          const itemHref = match[1];
          const rawId = match[2];
          const posterRelative = match[3];
          const rawTitle = match[4].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();

          const fullFolderUrl = `http://cineplexbd.net/${itemHref}`;
          const posterUrl = posterRelative.startsWith('http')
            ? posterRelative
            : `http://cineplexbd.net/${posterRelative.replace(/^\//, '')}`;

          const yearMatch = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
          const cleanTitle = rawTitle.replace(/\s*\(\d{4}\).*/, '').replace(/\s*\[.*\]/, '').trim();
          const id = Buffer.from(`cineplex:${rawId}:${fullFolderUrl}`).toString('base64url');

          if (!discovered.some(d => d.id === id)) {
            discovered.push({
              id,
              title: cleanTitle || rawTitle,
              year,
              type: cat.type,
              category: cat.name,
              source: this.id,
              posterUrl,
              folderUrl: fullFolderUrl,
              discoveredAt: new Date().toISOString(),
              qualityBadge: '1080P',
              rawTitle
            });
          }
        }
      } catch (e) {
        console.warn(`[CinePlex] Category ${cat.name} crawl warning:`, (e as Error).message);
      }
    }

    return discovered;
  }

  public async search(query: string): Promise<MediaItem[]> {
    if (!query || !query.trim()) return [];
    const q = query.trim();
    const searchUrl = `http://cineplexbd.net/search.php?name=${encodeURIComponent(q)}`;
    try {
      validateMediaUrl(searchUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(searchUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      clearTimeout(timeout);
      if (!res.ok) return [];

      const html = await res.text();
      const cardRegex = /<a\s+href="((?:view|tview|watch)\.php\?(?:id|series_id)=(\d+)[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/gi;
      let match: RegExpExecArray | null;
      const results: MediaItem[] = [];

      while ((match = cardRegex.exec(html)) !== null) {
        const itemHref = match[1];
        const rawId = match[2];
        const posterRelative = match[3];
        const rawTitle = match[4].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();

        const fullFolderUrl = itemHref.startsWith('http') ? itemHref : `http://cineplexbd.net/${itemHref.replace(/^\//, '')}`;
        const posterUrl = posterRelative.startsWith('http')
          ? posterRelative
          : `http://cineplexbd.net/${posterRelative.replace(/^\//, '')}`;

        const yearMatch = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
        const cleanTitle = rawTitle.replace(/\s*\(\d{4}\).*/, '').replace(/\s*\[.*\]/, '').trim();
        const id = Buffer.from(`cineplex:${rawId}:${fullFolderUrl}`).toString('base64url');

        const item: MediaItem = {
          id,
          title: cleanTitle || rawTitle,
          year,
          type: (itemHref.includes('tview') || itemHref.includes('series')) ? 'series' : 'movie',
          category: 'CinePlex Media',
          source: this.id,
          posterUrl,
          folderUrl: fullFolderUrl,
          discoveredAt: new Date().toISOString(),
          qualityBadge: '1080P',
          rawTitle
        };

        this.itemMap.set(id, item);
        results.push(item);
      }
      return results;
    } catch (e) {
      console.warn('[CinePlex] Search warning:', (e as Error).message);
      return [];
    }
  }

  public async getItemDetails(itemId: string): Promise<MediaItemDetails> {
    let item = this.itemMap.get(itemId);
    let rawCineplexId = '';
    let folderUrl = '';

    if (item) {
      const match = item.folderUrl.match(/(?:id|series_id)=(\d+)/);
      if (match) rawCineplexId = match[1];
      folderUrl = item.folderUrl;
    } else {
      try {
        const decoded = Buffer.from(itemId, 'base64url').toString('utf8');
        const parts = decoded.split(':');
        if (parts[0] === 'cineplex' && parts[1]) {
          rawCineplexId = parts[1];
          folderUrl = parts.slice(2).join(':');
          item = {
            id: itemId,
            title: `CinePlex Media #${rawCineplexId}`,
            type: (folderUrl.includes('series') || folderUrl.includes('tview')) ? 'series' : 'movie',
            category: 'CinePlex Media',
            source: this.id,
            folderUrl,
            discoveredAt: new Date().toISOString(),
            rawTitle: `CinePlex Media #${rawCineplexId}`
          };
        }
      } catch {
        throw new Error(`Media item not found: ${itemId}`);
      }
    }

    if (!rawCineplexId && !folderUrl) {
      throw new Error(`Cannot parse CinePlex media ID: ${itemId}`);
    }

    // Inspect player.php (or folderUrl if direct watch page) to extract videoSrc and subtitles
    const playerUrl = folderUrl && folderUrl.includes('watch.php')
      ? folderUrl
      : `http://cineplexbd.net/player.php?id=${rawCineplexId}`;
    validateMediaUrl(playerUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(playerUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`CinePlex player unavailable (HTTP ${res.status})`);
    }

    const html = await res.text();
    const srcMatch = html.match(/(?:const\s+videoSrc\s*=\s*["']([^"']+)["']|<source\s+src=["']([^"']+)["']|src=["']([^"']+\.(?:m3u8|mp4|mkv))["'])/i);
    const streamCandidate = srcMatch?.[1] || srcMatch?.[2] || srcMatch?.[3];
    if (!streamCandidate) {
      throw new Error('Video stream not found in CinePlex player.');
    }

    let streamUrl = streamCandidate;
    if (streamUrl.startsWith('/')) {
      streamUrl = `http://cineplexbd.net${streamUrl}`;
    }

    const subtitles: SubtitleTrack[] = [];
    const trackRegex = /<track\s+[^>]*src=["']([^"']+)["'][^>]*label=["']([^"']*)["'][^>]*srclang=["']([^"']*)["']/gi;
    let tMatch: RegExpExecArray | null;
    let sIdx = 1;
    while ((tMatch = trackRegex.exec(html)) !== null) {
      subtitles.push({
        id: `sub-${sIdx++}`,
        url: tMatch[1].startsWith('http') ? tMatch[1] : `http://cineplexbd.net${tMatch[1]}`,
        label: tMatch[2] || 'English',
        language: tMatch[3] || 'en',
        format: tMatch[1].endsWith('.vtt') ? 'vtt' : 'srt'
      });
    }

    const isMp4 = streamUrl.includes('.mp4');
    const isMkv = streamUrl.includes('.mkv');
    const isHls = streamUrl.includes('.m3u8');

    const versions = [
      {
        id: Buffer.from(streamUrl).toString('base64url'),
        name: item?.title || 'Full Movie',
        quality: '1080P',
        fileUrl: streamUrl,
        mimeType: isHls ? 'application/vnd.apple.mpegurl' : isMp4 ? 'video/mp4' : isMkv ? 'video/x-matroska' : 'video/mp4'
      }
    ];

    return {
      ...(item as MediaItem),
      versions,
      subtitles,
      directPlaybackSupported: true
    };
  }

  public async resolvePlayback(itemId: string, versionId?: string): Promise<PlaybackDescriptor> {
    const details = await this.getItemDetails(itemId);
    if (!details.versions.length) {
      throw new Error('No playable stream found for CinePlex media.');
    }

    const selectedVersion = (versionId && details.versions.find(v => v.id === versionId || v.fileUrl === versionId)) || details.versions[0];
    validateMediaUrl(selectedVersion.fileUrl);

    let supportsRange = true;
    let sizeBytes: number | undefined;

    try {
      const headRes = await fetch(selectedVersion.fileUrl, {
        method: 'HEAD',
        headers: { 'Range': 'bytes=0-1' }
      });
      supportsRange = headRes.status === 206 || headRes.headers.get('accept-ranges') === 'bytes';
      const cl = headRes.headers.get('content-range')?.split('/')?.[1] || headRes.headers.get('content-length');
      if (cl) sizeBytes = parseInt(cl, 10);
    } catch {
      // Best effort
    }

    const relayStreamUrl = `/api/playback/stream?url=${encodeURIComponent(selectedVersion.fileUrl)}&source=cineplex`;

    return {
      itemId,
      title: details.title,
      source: this.id,
      directUrl: selectedVersion.fileUrl,
      relayStreamUrl,
      streamType: 'progressive',
      mimeType: selectedVersion.mimeType || 'video/mp4',
      sizeBytes,
      supportsRangeRequests: supportsRange,
      subtitles: details.subtitles,
      availableQualities: ['1080P'],
      posterUrl: details.posterUrl
    };
  }
}
