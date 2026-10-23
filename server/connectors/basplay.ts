import {
  MediaItem,
  MediaItemDetails,
  PlaybackDescriptor,
  SourceHealth,
  CatalogQueryOptions,
  SubtitleTrack,
  MediaVersion
} from './types.js';
import { validateMediaUrl } from '../security/ssrfGuard.js';

interface CacheEntry {
  items: MediaItem[];
  timestamp: number;
}

export class BasPlayConnector {
  public id = 'basplay' as const;
  public name = 'BAS Play (10.20.30.40)';
  private baseUrl = 'http://10.20.30.40/';
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
        message: res.ok ? 'Online & streaming on BAS Play (10.20.30.40)' : `HTTP ${res.status}`,
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
        message: 'Cannot reach BAS Play.',
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
      const items = await this.crawlBasPlay();
      this.cache = { items, timestamp: Date.now() };
      this.itemMap.clear();
      for (const item of items) {
        this.itemMap.set(item.id, item);
      }
      console.log(`[BAS Play] Indexed ${items.length} titles with banners.`);
    } catch (err) {
      console.error('[BAS Play] Crawl failed:', err);
    } finally {
      this.isScanning = false;
    }
  }

  private async crawlBasPlay(): Promise<MediaItem[]> {
    const discovered: MediaItem[] = [];

    // 1. Crawl BAS Play Homepage (index.php) for live Featured Coverflow & Trending releases
    try {
      const homeUrl = 'http://10.20.30.40/index.php';
      validateMediaUrl(homeUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(homeUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();

        // 1A. Exact 3D Coverflow items (class="vs-card ...")
        const vsCardRegex = /<a\s+href="((?:view|tview)\.php\?id=(\d+)[^"]*)"[^>]*class="[^"]*vs-card[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/gi;
        let vsMatch: RegExpExecArray | null;
        let vsOrder = 1000;

        while ((vsMatch = vsCardRegex.exec(html)) !== null) {
          const itemHref = vsMatch[1];
          const rawId = vsMatch[2];
          const posterRelative = vsMatch[3];
          const rawTitle = vsMatch[4].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();

          const fullFolderUrl = `http://10.20.30.40/${itemHref}`;
          const posterUrl = posterRelative.startsWith('http')
            ? posterRelative
            : `http://10.20.30.40${posterRelative.startsWith('/') ? '' : '/'}${posterRelative}`;

          const yearMatch = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
          const cleanTitle = rawTitle.replace(/\s*\(\d{4}\).*/, '').replace(/\s*\[.*\]/, '').trim();
          const id = Buffer.from(`basplay:${rawId}:${fullFolderUrl}`).toString('base64url');

          if (!discovered.some(d => d.id === id)) {
            discovered.push({
              id,
              title: cleanTitle || rawTitle,
              year,
              type: itemHref.startsWith('tview') ? 'series' : 'movie',
              category: 'Featured (BAS Play)',
              source: this.id,
              posterUrl,
              folderUrl: fullFolderUrl,
              discoveredAt: new Date(Date.now() + (vsOrder--) * 10000).toISOString(),
              qualityBadge: '1080P',
              rawTitle
            });
          }
        }

        // 1B. Trending Releases on index.php (class="cp-card ...")
        const trendRegex = /<a\s+href="((?:view|tview)\.php\?id=(\d+)[^"]*)"[^>]*class="[^"]*cp-card[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/gi;
        let trendMatch: RegExpExecArray | null;
        while ((trendMatch = trendRegex.exec(html)) !== null) {
          const itemHref = trendMatch[1];
          const rawId = trendMatch[2];
          const posterRelative = trendMatch[3];
          const rawTitle = trendMatch[4].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();

          const fullFolderUrl = `http://10.20.30.40/${itemHref}`;
          const posterUrl = posterRelative.startsWith('http')
            ? posterRelative
            : `http://10.20.30.40${posterRelative.startsWith('/') ? '' : '/'}${posterRelative}`;

          const yearMatch = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
          const cleanTitle = rawTitle.replace(/\s*\(\d{4}\).*/, '').replace(/\s*\[.*\]/, '').trim();
          const id = Buffer.from(`basplay:${rawId}:${fullFolderUrl}`).toString('base64url');

          if (!discovered.some(d => d.id === id)) {
            discovered.push({
              id,
              title: cleanTitle || rawTitle,
              year,
              type: itemHref.startsWith('tview') ? 'series' : 'movie',
              category: 'Trending Movies',
              source: this.id,
              posterUrl,
              folderUrl: fullFolderUrl,
              discoveredAt: new Date().toISOString(),
              qualityBadge: 'HD',
              rawTitle
            });
          }
        }
      }
    } catch (err) {
      console.warn('[BAS Play] Home index crawl warning:', (err as Error).message);
    }

    // 2. Category Crawling
    const categories = [
      { url: 'http://10.20.30.40/category.php?category=Hollywood', name: 'Hollywood Movies', type: 'movie' as const },
      { url: 'http://10.20.30.40/category.php?category=Bollywood', name: 'Bollywood Movies', type: 'movie' as const },
      { url: 'http://10.20.30.40/category.php?category=Animation', name: 'Animation Movies', type: 'movie' as const },
      { url: 'http://10.20.30.40/category.php?category=Bangla', name: 'Bangla Movies', type: 'movie' as const },
      { url: 'http://10.20.30.40/tv.php?category=ENGLISH+TV+SERIES', name: 'TV & Web Series', type: 'series' as const }
    ];

    for (const cat of categories) {
      try {
        validateMediaUrl(cat.url);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(cat.url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) continue;

        const html = await res.text();
        const cardRegex = /<a\s+href="((?:view|tview)\.php\?id=(\d+)[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/gi;
        let match: RegExpExecArray | null;

        while ((match = cardRegex.exec(html)) !== null) {
          const itemHref = match[1];
          const rawId = match[2];
          const posterRelative = match[3];
          const rawTitle = match[4].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();

          const fullFolderUrl = `http://10.20.30.40/${itemHref}`;
          const posterUrl = posterRelative.startsWith('http')
            ? posterRelative
            : `http://10.20.30.40${posterRelative.startsWith('/') ? '' : '/'}${posterRelative}`;

          const yearMatch = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
          const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
          const cleanTitle = rawTitle.replace(/\s*\(\d{4}\).*/, '').replace(/\s*\[.*\]/, '').trim();
          const id = Buffer.from(`basplay:${rawId}:${fullFolderUrl}`).toString('base64url');

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
              qualityBadge: 'HD',
              rawTitle
            });
          }
        }
      } catch (e) {
        console.warn(`[BAS Play] Category ${cat.name} crawl warning:`, (e as Error).message);
      }
    }

    return discovered;
  }

  public async search(query: string): Promise<MediaItem[]> {
    if (!query || !query.trim()) return [];
    const q = query.trim();
    const searchUrl = `http://10.20.30.40/search.php?q=${encodeURIComponent(q)}`;
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
      const cardRegex = /<a\s+href="((?:view|tview)\.php\?id=(\d+)[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/gi;
      let match: RegExpExecArray | null;
      const results: MediaItem[] = [];

      while ((match = cardRegex.exec(html)) !== null) {
        const itemHref = match[1];
        const rawId = match[2];
        const posterRelative = match[3];
        const rawTitle = match[4].replace(/&amp;/g, '&').replace(/&#039;/g, "'").trim();

        const fullFolderUrl = `http://10.20.30.40/${itemHref}`;
        const posterUrl = posterRelative.startsWith('http')
          ? posterRelative
          : `http://10.20.30.40${posterRelative.startsWith('/') ? '' : '/'}${posterRelative}`;

        const yearMatch = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;
        const cleanTitle = rawTitle.replace(/\s*\(\d{4}\).*/, '').replace(/\s*\[.*\]/, '').trim();
        const id = Buffer.from(`basplay:${rawId}:${fullFolderUrl}`).toString('base64url');

        const item: MediaItem = {
          id,
          title: cleanTitle || rawTitle,
          year,
          type: itemHref.startsWith('tview') ? 'series' : 'movie',
          category: itemHref.startsWith('tview') ? 'TV & Web Series' : 'BAS Play Media',
          source: this.id,
          posterUrl,
          folderUrl: fullFolderUrl,
          discoveredAt: new Date().toISOString(),
          qualityBadge: 'HD',
          rawTitle
        };

        this.itemMap.set(id, item);
        results.push(item);
      }
      return results;
    } catch (e) {
      console.warn('[BAS Play] Search warning:', (e as Error).message);
      return [];
    }
  }

  public async getItemDetails(itemId: string): Promise<MediaItemDetails> {
    let item = this.itemMap.get(itemId);
    let rawId = '';
    let folderUrl = '';

    if (item) {
      const match = item.folderUrl.match(/id=(\d+)/);
      if (match) rawId = match[1];
      folderUrl = item.folderUrl;
    } else {
      try {
        const decoded = Buffer.from(itemId, 'base64url').toString('utf8');
        const parts = decoded.split(':');
        if (parts[0] === 'basplay' && parts[1]) {
          rawId = parts[1];
          folderUrl = parts.slice(2).join(':');
          item = {
            id: itemId,
            title: `BAS Play Media #${rawId}`,
            type: folderUrl.includes('tview.php') ? 'series' : 'movie',
            category: 'BAS Play Media',
            source: this.id,
            folderUrl,
            discoveredAt: new Date().toISOString(),
            rawTitle: `BAS Play Media #${rawId}`
          };
        }
      } catch {
        throw new Error(`Media item not found: ${itemId}`);
      }
    }

    // Handle TV Series on BAS Play (tview.php)
    if (folderUrl && folderUrl.includes('tview.php')) {
      validateMediaUrl(folderUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(folderUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`BAS Play series page unavailable (HTTP ${res.status})`);
      }

      const html = await res.text();
      const epItems = [...html.matchAll(/<[^>]+class=["'][^"']*ep-item[^"']*["'][^>]*data-src=["']([^"']+)["'][^>]*>/gi)];

      const episodes = epItems.map((m, idx) => {
        const fullTag = m[0];
        const rawSrc = m[1].replace(/&amp;/g, '&');
        const epNumMatch = fullTag.match(/data-epnum=["'](\d+)["']/i);
        const epNum = epNumMatch ? parseInt(epNumMatch[1], 10) : idx + 1;
        const fileName = decodeURIComponent(rawSrc.split('/').pop() || rawSrc);
        const cleanTitle = fileName.replace(/\.(mkv|mp4|webm)$/i, '');
        const fullFileUrl = rawSrc.startsWith('http') ? rawSrc : `http://10.20.30.40${rawSrc.startsWith('/') ? '' : '/'}${rawSrc}`;
        return {
          episodeNumber: epNum,
          title: cleanTitle,
          fileUrl: fullFileUrl
        };
      });

      // Sort episodes ascending so Episode 1 is ALWAYS first
      episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);

      const versions: MediaVersion[] = episodes.map(ep => ({
        id: Buffer.from(ep.fileUrl).toString('base64url'),
        name: `Episode ${String(ep.episodeNumber).padStart(2, '0')}: ${ep.title}`,
        quality: '1080P',
        fileUrl: ep.fileUrl,
        mimeType: ep.fileUrl.endsWith('.mp4') ? 'video/mp4' : 'video/x-matroska'
      }));

      return {
        ...(item as MediaItem),
        type: 'series',
        versions,
        subtitles: [],
        directPlaybackSupported: versions.length > 0,
        seasons: [
          {
            seasonNumber: 1,
            episodes
          }
        ]
      };
    }

    if (!rawId) {
      throw new Error(`Cannot parse BAS Play media ID: ${itemId}`);
    }

    const playerUrl = `http://10.20.30.40/player.php?id=${rawId}`;
    validateMediaUrl(playerUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(playerUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`BAS Play player unavailable (HTTP ${res.status})`);
    }

    const html = await res.text();
    const srcMatch = html.match(/(?:const\s+src\s*=\s*["']([^"']+)["']|<source\s+src=["']([^"']+)["'])/i);
    const streamCandidate = srcMatch?.[1] || srcMatch?.[2];

    if (!streamCandidate) {
      throw new Error('Video stream not found in BAS Play player.');
    }

    let streamUrl = streamCandidate;
    if (streamUrl.startsWith('/')) {
      streamUrl = `http://10.20.30.40${streamUrl}`;
    }

    const subtitles: SubtitleTrack[] = [];
    const trackRegex = /<track\s+[^>]*src=["']([^"']+)["'][^>]*label=["']([^"']*)["'][^>]*srclang=["']([^"']*)["']/gi;
    let tMatch: RegExpExecArray | null;
    let sIdx = 1;
    while ((tMatch = trackRegex.exec(html)) !== null) {
      let subUrl = tMatch[1];
      if (subUrl.startsWith('/')) subUrl = `http://10.20.30.40${subUrl}`;
      subtitles.push({
        id: `sub-${sIdx++}`,
        url: subUrl,
        label: tMatch[2] || 'English',
        language: tMatch[3] || 'en',
        format: subUrl.endsWith('.vtt') ? 'vtt' : 'srt'
      });
    }

    const isMp4 = streamUrl.includes('.mp4');
    const isMkv = streamUrl.includes('.mkv');

    const versions = [
      {
        id: Buffer.from(streamUrl).toString('base64url'),
        name: item?.title || 'Full Movie',
        quality: '1080P',
        fileUrl: streamUrl,
        mimeType: isMp4 ? 'video/mp4' : isMkv ? 'video/x-matroska' : 'video/mp4'
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
      throw new Error('No playable stream found for BAS Play media.');
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

    const relayStreamUrl = `/api/playback/stream?url=${encodeURIComponent(selectedVersion.fileUrl)}&source=basplay`;

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
