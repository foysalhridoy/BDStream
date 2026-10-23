import {
  ISourceConnector,
  MediaItem,
  MediaItemDetails,
  PlaybackDescriptor,
  SourceHealth,
  CatalogQueryOptions,
  SubtitleTrack,
  MediaVersion
} from './types.js';
import { validateMediaUrl } from '../security/ssrfGuard.js';
import { config } from '../config.js';

interface CacheEntry {
  items: MediaItem[];
  timestamp: number;
}

export class DhakaFlixConnector implements ISourceConnector {
  public id = 'dhakaflix' as const;
  public name = 'DhakaFlix Portal';
  private baseUrl = config.DHAKAFLIX_BASE_URL;
  private cache: CacheEntry | null = null;
  private itemMap: Map<string, MediaItem> = new Map();
  private isScanning = false;

  public async checkAvailability(): Promise<SourceHealth> {
    const startTime = Date.now();
    try {
      validateMediaUrl(this.baseUrl);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(this.baseUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/html,*/*' }
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          id: this.id,
          name: this.name,
          baseUrl: this.baseUrl,
          isAccessible: false,
          latencyMs,
          requiresSession: false,
          itemCount: this.itemMap.size,
          error: `HTTP ${res.status}: ${res.statusText}`,
          message: 'DhakaFlix portal responded with an error.',
          lastChecked: new Date().toISOString()
        };
      }

      return {
        id: this.id,
        name: this.name,
        baseUrl: this.baseUrl,
        isAccessible: true,
        latencyMs,
        requiresSession: false,
        itemCount: this.itemMap.size,
        message: 'Online and reachable on local network (172.16.50.4). Storage nodes ready.',
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
        error: (err as Error).message || 'Connection timeout or network unreachable',
        message: 'Cannot reach DhakaFlix. Ensure you are connected to the supported ISP network.',
        lastChecked: new Date().toISOString()
      };
    }
  }

  /**
   * Get cached catalog or trigger background scan
   */
  public async getCatalog(_options?: CatalogQueryOptions): Promise<MediaItem[]> {
    const now = Date.now();
    if (this.cache && (now - this.cache.timestamp) < config.CATALOG_CACHE_TTL * 1000) {
      return this.cache.items;
    }

    // Refresh if empty or expired
    if (!this.isScanning) {
      await this.refreshCatalog();
    }

    return this.cache?.items || [];
  }

  public async refreshCatalog(): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;
    try {
      const items = await this.crawlDhakaFlix();
      this.cache = {
        items,
        timestamp: Date.now()
      };
      this.itemMap.clear();
      for (const item of items) {
        this.itemMap.set(item.id, item);
      }
    } catch (err) {
      console.error('[DhakaFlix] Catalog crawl failed:', err);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Crawls categories and recent year directories
   */
  private async crawlDhakaFlix(): Promise<MediaItem[]> {
    const discoveredItems: MediaItem[] = [];

    // Verified category roots discovered during inspection
    const categoriesToScan = [
      {
        url: 'http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/',
        category: 'English Movies',
        type: 'movie' as const,
        recentSubdirs: ['%282024%29/', '%282023%29/', '%282022%29/']
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/',
        category: 'English 1080p',
        type: 'movie' as const,
        recentSubdirs: ['%282024%29/', '%282023%29/']
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/Hindi%20Movies/',
        category: 'Hindi Movies',
        type: 'movie' as const,
        recentSubdirs: ['%282024%29/', '%282023%29/']
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/',
        category: 'South Movies',
        type: 'movie' as const,
        recentSubdirs: ['%282024%29/', '%282023%29/']
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies/',
        category: 'Animation',
        type: 'movie' as const,
        recentSubdirs: ['%282024%29/', '%282023%29/', '%282022%29/']
      },
      {
        url: 'http://172.16.50.12/DHAKA-FLIX-12/TV-WEB-Series/',
        category: 'TV Series',
        type: 'series' as const,
        recentSubdirs: ['']
      }
    ];

    for (const cat of categoriesToScan) {
      try {
        for (const sub of cat.recentSubdirs) {
          const targetUrl = sub ? new URL(sub, cat.url).href : cat.url;
          validateMediaUrl(targetUrl);

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(targetUrl, {
            signal: controller.signal,
            headers: { 'Accept': 'text/html,*/*' }
          });
          clearTimeout(timeout);

          if (!res.ok) continue;
          const html = await res.text();
          const parsed = this.parseH5aiLinks(html, targetUrl, cat.category, cat.type);
          discoveredItems.push(...parsed);
        }
      } catch (err) {
        console.warn(`[DhakaFlix] Error crawling category ${cat.category}:`, (err as Error).message);
      }
    }

    return discoveredItems;
  }

  /**
   * Parse links in h5ai folder listing
   */
  private parseH5aiLinks(html: string, parentUrl: string, category: string, type: 'movie' | 'series'): MediaItem[] {
    const items: MediaItem[] = [];
    const linkRegex = /href=["']([^"']+)["']/g;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      // Skip h5ai internal links and parent dir
      if (
        href.startsWith('/_h5ai') ||
        href.startsWith('//') ||
        href.startsWith('http://browsehappy.com') ||
        href.startsWith('https://') ||
        href === '..' ||
        href === '/'
      ) {
        continue;
      }

      // Check if this is a directory/folder entry ending in /
      if (href.endsWith('/')) {
        const fullFolderUrl = new URL(href, parentUrl).href;
        const decodedPath = decodeURIComponent(href).replace(/\/$/, '');
        const folderName = decodedPath.split('/').pop() || '';

        // Filter out non-media folders (like system folders)
        if (!folderName || folderName.startsWith('.')) continue;

        const info = this.parseMediaTitle(folderName);
        const id = Buffer.from(`dhakaflix:${fullFolderUrl}`).toString('base64url');

        items.push({
          id,
          title: info.title,
          year: info.year,
          type,
          category,
          source: this.id,
          folderUrl: fullFolderUrl,
          discoveredAt: new Date().toISOString(),
          qualityBadge: info.quality,
          rawTitle: folderName
        });
      }
    }

    return items;
  }

  /**
   * Extracts clean title, year, and quality from standard release folder names
   */
  private parseMediaTitle(folderName: string): { title: string; year?: number; quality?: string } {
    // Examples:
    // "Air (2023) 720p AMZN [Dual Audio]"
    // "15 Cameras (2023) 720p WEBRip"
    // "The Dark Knight 1080p BDRip"
    const qualityMatch = folderName.match(/(2160p|4k|1080p|720p|480p|HDRip|WEBRip|BDRip|DVDRip)/i);
    const quality = qualityMatch ? qualityMatch[1].toUpperCase() : undefined;

    const yearMatch = folderName.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

    // Clean title by cutting off before year / quality / audio tags
    let title = folderName;
    if (year) {
      const idx = title.indexOf(year.toString());
      if (idx > 1) {
        title = title.substring(0, idx);
      }
    } else if (qualityMatch && qualityMatch.index) {
      title = title.substring(0, qualityMatch.index);
    }

    // Clean brackets, dots, hyphens
    title = title
      .replace(/[._]/g, ' ')
      .replace(/[()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!title) title = folderName;

    return { title, year, quality };
  }

  /**
   * Deep inspect movie folder to find poster, video files, subtitles
   */
  public async getItemDetails(itemId: string): Promise<MediaItemDetails> {
    const item = this.itemMap.get(itemId);
    if (!item) {
      // Decode from itemId if not in map
      try {
        const decoded = Buffer.from(itemId, 'base64url').toString('utf8');
        const [source, folderUrl] = decoded.split(':', 2);
        if (source === 'dhakaflix' && folderUrl) {
          validateMediaUrl(folderUrl);
          const info = this.parseMediaTitle(decodeURIComponent(folderUrl.replace(/\/$/, '').split('/').pop() || ''));
          const createdItem: MediaItem = {
            id: itemId,
            title: info.title,
            year: info.year,
            type: 'movie',
            category: 'DhakaFlix Media',
            source: this.id,
            folderUrl,
            discoveredAt: new Date().toISOString(),
            qualityBadge: info.quality,
            rawTitle: info.title
          };
          this.itemMap.set(itemId, createdItem);
          return this.inspectFolderDetails(createdItem);
        }
      } catch {
        throw new Error(`Media item not found: ${itemId}`);
      }
      throw new Error(`Media item not found: ${itemId}`);
    }

    return this.inspectFolderDetails(item);
  }

  private async inspectFolderDetails(item: MediaItem): Promise<MediaItemDetails> {
    validateMediaUrl(item.folderUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(item.folderUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'text/html,*/*' }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Could not access media folder (HTTP ${res.status})`);
    }

    const html = await res.text();
    const linkRegex = /href=["']([^"']+)["']/g;
    const files: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      if (
        href.startsWith('/_h5ai') ||
        href.startsWith('//') ||
        href.startsWith('http://browsehappy.com') ||
        href.startsWith('https://') ||
        href === '..' ||
        href === '/'
      ) {
        continue;
      }
      files.push(href);
    }

    // Identify poster (.jpg, .png, .jpeg, .webp)
    let posterUrl = item.posterUrl;
    const posterFile = files.find(f => /\.(jpe?g|png|webp)$/i.test(f));
    if (posterFile) {
      posterUrl = new URL(posterFile, item.folderUrl).href;
    }

    // Identify video files (.mp4, .mkv, .webm, .m4v, .ts)
    const videoFiles = files.filter(f => /\.(mp4|mkv|webm|m4v|ts)$/i.test(f));
    const versions: MediaVersion[] = videoFiles.map(vf => {
      const fullUrl = new URL(vf, item.folderUrl).href;
      const isMkv = vf.toLowerCase().endsWith('.mkv');
      const isMp4 = vf.toLowerCase().endsWith('.mp4');
      const filename = decodeURIComponent(vf.split('/').pop() || vf);
      const q = filename.match(/(2160p|4k|1080p|720p|480p)/i)?.[1]?.toUpperCase() || item.qualityBadge || 'Standard';

      return {
        id: Buffer.from(fullUrl).toString('base64url'),
        name: filename,
        quality: q,
        fileUrl: fullUrl,
        mimeType: isMp4 ? 'video/mp4' : isMkv ? 'video/x-matroska' : 'video/webm'
      };
    });

    // Identify subtitles (.srt, .vtt)
    const subFiles = files.filter(f => /\.(srt|vtt)$/i.test(f));
    const subtitles: SubtitleTrack[] = subFiles.map((sf, index) => {
      const fullSubUrl = new URL(sf, item.folderUrl).href;
      const subName = decodeURIComponent(sf.split('/').pop() || sf);
      const isVtt = sf.toLowerCase().endsWith('.vtt');
      return {
        id: `sub-${index}`,
        label: subName.replace(/\.(srt|vtt)$/i, ''),
        language: 'English',
        url: fullSubUrl,
        format: isVtt ? 'vtt' : 'srt'
      };
    });

    return {
      ...item,
      posterUrl,
      versions,
      subtitles,
      directPlaybackSupported: versions.length > 0
    };
  }

  /**
   * Resolves playable URL and verifies byte range support
   */
  public async resolvePlayback(itemId: string, versionId?: string): Promise<PlaybackDescriptor> {
    const details = await this.getItemDetails(itemId);
    if (!details.versions.length) {
      throw new Error('No playable video streams found in this media source directory.');
    }

    let selectedVersion = details.versions[0];
    if (versionId) {
      const found = details.versions.find(v => v.id === versionId);
      if (found) selectedVersion = found;
    }

    validateMediaUrl(selectedVersion.fileUrl);

    // Verify Range header support on media file
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
    } catch (e) {
      console.warn('[DhakaFlix] Range check probe warning:', (e as Error).message);
    }

    // Build the authorized backend streaming relay URL
    const relayStreamUrl = `/api/playback/stream?url=${encodeURIComponent(selectedVersion.fileUrl)}&source=dhakaflix`;

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
      availableQualities: [...new Set(details.versions.map(v => v.quality))]
    };
  }
}
