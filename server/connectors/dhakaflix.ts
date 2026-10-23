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
import { config } from '../config.js';

interface CacheEntry {
  items: MediaItem[];
  timestamp: number;
}

export class DhakaFlixConnector {
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
      const timeout = setTimeout(() => controller.abort(), 1500);

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
        message: res.ok
          ? 'Online & streaming on DhakaFlix (172.16.50.4)'
          : `HTTP ${res.status}: ${res.statusText}`,
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
        message: 'Cannot reach DhakaFlix. Ensure you are on the ISP network.',
        lastChecked: new Date().toISOString()
      };
    }
  }

  public async getCatalog(_options?: CatalogQueryOptions): Promise<MediaItem[]> {
    const now = Date.now();
    if (this.cache && (now - this.cache.timestamp) < config.CATALOG_CACHE_TTL * 1000) {
      return this.cache.items;
    }

    if (!this.isScanning) {
      const health = await this.checkAvailability();
      if (health.isAccessible) {
        await this.refreshCatalog();
      }
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
      console.log(`[DhakaFlix] Indexed ${items.length} titles with full banners & metadata.`);
    } catch (err) {
      console.error('[DhakaFlix] Catalog crawl failed:', err);
    } finally {
      this.isScanning = false;
    }
  }

  private async crawlDhakaFlix(): Promise<MediaItem[]> {
    const discoveredItems: MediaItem[] = [];

    const allYears = [
      '%282026%29/', '%282025%29/', '%282024%29/', '%282023%29/', '%282022%29/',
      '%282021%29/', '%282020%29/', '%282019%29/', '%282018%29/', '%282017%29/',
      '%282016%29/', '%282015%29/'
    ];

    // Categories structured exactly as DhakaFlix organizes them
    const categoriesToScan = [
      {
        url: 'http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/',
        category: 'English Movies',
        type: 'movie' as const,
        subdirs: allYears
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/',
        category: 'English Movies (1080p)',
        type: 'movie' as const,
        subdirs: allYears.slice(0, 8)
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/Hindi%20Movies/',
        category: 'Hindi Movies',
        type: 'movie' as const,
        subdirs: allYears
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/',
        category: 'South Indian Movies',
        type: 'movie' as const,
        subdirs: allYears.slice(0, 8)
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/',
        category: 'South (Hindi Dubbed)',
        type: 'movie' as const,
        subdirs: allYears.slice(0, 8)
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies/',
        category: 'Animation Movies',
        type: 'movie' as const,
        subdirs: allYears.slice(0, 8)
      },
      {
        url: 'http://172.16.50.7/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/',
        category: 'Kolkata Bangla Movies',
        type: 'movie' as const,
        subdirs: ['']
      },
      {
        url: 'http://172.16.50.14/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/',
        category: 'Korean TV & Web Series',
        type: 'series' as const,
        subdirs: ['']
      }
    ];

    // Crawl standard movie categories
    for (const cat of categoriesToScan) {
      try {
        for (const sub of cat.subdirs) {
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
        console.warn(`[DhakaFlix] Error crawling ${cat.category}:`, (err as Error).message);
      }
    }

    // Crawl TV & Web Series with full alphabetical nesting (0-9, A-L, M-R, S-Z)
    const tvSeriesBase = 'http://172.16.50.12/DHAKA-FLIX-12/TV-WEB-Series/';
    const tvSubsections = [
      'TV%20Series%20%E2%98%85%20%200%20%20%E2%80%94%20%209/',
      'TV%20Series%20%E2%99%A5%20%20A%20%20%E2%80%94%20%20L/',
      'TV%20Series%20%E2%99%A6%20%20M%20%20%E2%80%94%20%20R/',
      'TV%20Series%20%E2%99%A6%20%20S%20%20%E2%80%94%20%20Z/'
    ];

    for (const sub of tvSubsections) {
      try {
        const secUrl = new URL(sub, tvSeriesBase).href;
        validateMediaUrl(secUrl);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(secUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) continue;
        const html = await res.text();
        const shows = this.parseH5aiLinks(html, secUrl, 'TV & Web Series', 'series');
        discoveredItems.push(...shows);
      } catch (err) {
        console.warn('[DhakaFlix] TV series subsection crawl error:', (err as Error).message);
      }
    }

    return discoveredItems;
  }

  private parseH5aiLinks(html: string, parentUrl: string, category: string, type: 'movie' | 'series'): MediaItem[] {
    const items: MediaItem[] = [];
    const linkRegex = /href=["']([^"']+)["']/g;
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

      if (href.endsWith('/')) {
        const fullFolderUrl = new URL(href, parentUrl).href;
        const decodedPath = decodeURIComponent(href).replace(/\/$/, '');
        const folderName = decodedPath.split('/').pop() || '';

        if (!folderName || folderName.startsWith('.') || folderName.includes('TV Series ★') || folderName.includes('TV Series ♥')) {
          continue;
        }

        const info = this.parseMediaTitle(folderName);
        const id = Buffer.from(`dhakaflix:${fullFolderUrl}`).toString('base64url');

        // MUST SHOW BANNER: DhakaFlix stores a_AL_.jpg in every movie & series folder!
        const posterUrl = `${fullFolderUrl}a_AL_.jpg`;

        items.push({
          id,
          title: info.title,
          year: info.year,
          type,
          category,
          source: this.id,
          posterUrl,
          folderUrl: fullFolderUrl,
          discoveredAt: new Date().toISOString(),
          qualityBadge: info.quality,
          rawTitle: folderName
        });
      }
    }

    return items;
  }

  private parseMediaTitle(folderName: string): { title: string; year?: number; quality?: string } {
    const qualityMatch = folderName.match(/(2160p|4k|1080p|720p|480p|HDRip|WEBRip|BDRip|DVDRip)/i);
    const quality = qualityMatch ? qualityMatch[1].toUpperCase() : undefined;

    const yearMatch = folderName.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

    let title = folderName;
    if (year) {
      const idx = title.indexOf(year.toString());
      if (idx > 1) {
        title = title.substring(0, idx);
      }
    } else if (qualityMatch && qualityMatch.index) {
      title = title.substring(0, qualityMatch.index);
    }

    title = title
      .replace(/[._]/g, ' ')
      .replace(/\(TV (?:Mini )?Series[^)]*\)/i, '')
      .replace(/[()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!title) title = folderName;

    return { title, year, quality };
  }

  public async getItemDetails(itemId: string): Promise<MediaItemDetails> {
    let item = this.itemMap.get(itemId);
    if (!item) {
      try {
        let decoded = '';
        try {
          decoded = Buffer.from(itemId, 'base64url').toString('utf8');
        } catch {
          decoded = Buffer.from(itemId, 'base64').toString('utf8');
        }

        const colonIdx = decoded.indexOf(':');
        if (colonIdx !== -1) {
          const source = decoded.substring(0, colonIdx);
          const folderUrl = decoded.substring(colonIdx + 1);
          if (source === 'dhakaflix' && folderUrl.startsWith('http')) {
            validateMediaUrl(folderUrl);
            const folderName = decodeURIComponent(folderUrl.replace(/\/$/, '').split('/').pop() || '');
            const info = this.parseMediaTitle(folderName);
            item = {
              id: itemId,
              title: info.title,
              year: info.year,
              type: folderUrl.includes('TV-WEB-Series') ? 'series' : 'movie',
              category: 'TV & Web Series',
              source: this.id,
              posterUrl: `${folderUrl}a_AL_.jpg`,
              folderUrl,
              discoveredAt: new Date().toISOString(),
              qualityBadge: info.quality,
              rawTitle: folderName
            };
            this.itemMap.set(itemId, item);
          }
        }
      } catch {
        throw new Error(`Media item not found: ${itemId}`);
      }
    }

    if (!item) {
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
    const subfolders: string[] = [];
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
      if (href.endsWith('/')) {
        subfolders.push(href);
      } else {
        files.push(href);
      }
    }

    let posterUrl = item.posterUrl || `${item.folderUrl}a_AL_.jpg`;
    const posterFile = files.find(f => /\.(jpe?g|png|webp)$/i.test(f));
    if (posterFile) {
      posterUrl = new URL(posterFile, item.folderUrl).href;
    }

    // Direct video files in folder
    const videoFiles = files.filter(f => /\.(mp4|mkv|webm|m4v|ts)$/i.test(f));
    let versions: MediaVersion[] = videoFiles.map(vf => {
      const fullUrl = new URL(vf, item.folderUrl).href;
      const isMkv = vf.toLowerCase().endsWith('.mkv');
      const isMp4 = vf.toLowerCase().endsWith('.mp4');
      const filename = decodeURIComponent(vf.split('/').pop() || vf);
      const q = filename.match(/(2160p|4k|1080p|720p|480p)/i)?.[1]?.toUpperCase() || item.qualityBadge || 'HD';

      return {
        id: Buffer.from(fullUrl).toString('base64url'),
        name: filename,
        quality: q,
        fileUrl: fullUrl,
        mimeType: isMp4 ? 'video/mp4' : 'video/webm'
      };
    });

    // Prioritize mp4 files for maximum native browser audio/video compatibility
    versions.sort((a, b) => {
      const aMp4 = a.fileUrl.toLowerCase().endsWith('.mp4');
      const bMp4 = b.fileUrl.toLowerCase().endsWith('.mp4');
      if (aMp4 && !bMp4) return -1;
      if (!aMp4 && bMp4) return 1;
      return 0;
    });

    // Subtitles
    const subFiles = files.filter(f => /\.(srt|vtt)$/i.test(f));
    const subtitles: SubtitleTrack[] = subFiles.map((sf, index) => {
      const fullSubUrl = new URL(sf, item.folderUrl).href;
      const subName = decodeURIComponent(sf.split('/').pop() || sf);
      return {
        id: `sub-${index}`,
        label: subName.replace(/\.(srt|vtt)$/i, ''),
        language: 'English',
        url: fullSubUrl,
        format: sf.toLowerCase().endsWith('.vtt') ? 'vtt' : 'srt'
      };
    });

    // If TV Series with Seasons (e.g. Season 1/, Season 2/)
    const seasonFolders = subfolders.filter(sf => /season|series/i.test(decodeURIComponent(sf)));
    let seasons: { seasonNumber: number; episodes: { episodeNumber: number; title: string; fileUrl: string; }[] }[] | undefined;

    if (seasonFolders.length > 0) {
      // Sort season folders so Season 1 comes first, then Season 2, etc.
      seasonFolders.sort((a, b) => {
        const aName = decodeURIComponent(a);
        const bName = decodeURIComponent(b);
        const aNum = parseInt(aName.match(/(?:season|series|\b0*)(\d+)\b/i)?.[1] || '1', 10);
        const bNum = parseInt(bName.match(/(?:season|series|\b0*)(\d+)\b/i)?.[1] || '1', 10);
        return aNum - bNum;
      });

      seasons = [];
      const allSeasonVersions: MediaVersion[] = [];

      for (let sIdx = 0; sIdx < seasonFolders.length; sIdx++) {
        const sFolder = seasonFolders[sIdx];
        const sUrl = new URL(sFolder, item.folderUrl).href;
        const sName = decodeURIComponent(sFolder.replace(/\/$/, '').split('/').pop() || '');
        const sNumMatch = sName.match(/(?:season|series|\b0*)(\d+)\b/i);
        const seasonNumber = sNumMatch ? parseInt(sNumMatch[1], 10) : sIdx + 1;

        try {
          const sRes = await fetch(sUrl);
          if (sRes.ok) {
            const sHtml = await sRes.text();
            const sEpFiles = [...sHtml.matchAll(/href=["']([^"']+\.(mkv|mp4|webm))["']/gi)].map(m => m[1]);

            // Filter out non-episode files (samples, trailers, extras)
            const validEpFiles = sEpFiles.filter(f => !/sample|trailer|extra|featurette|preview/i.test(decodeURIComponent(f)));

            // Extract episode number and sort naturally
            const parsedEps = validEpFiles.map(epFile => {
              const epUrl = new URL(epFile, sUrl).href;
              const epName = decodeURIComponent(epFile.split('/').pop() || epFile);
              const epNumMatch = epName.match(/(?:s\d+e|ep(?:isode)?[\s._-]*|\b0*)(\d{1,3})\b/i);
              const extractedEpNum = epNumMatch ? parseInt(epNumMatch[1], 10) : 0;
              return {
                title: epName.replace(/\.(mkv|mp4|webm)$/i, ''),
                fileUrl: epUrl,
                extractedEpNum
              };
            });

            parsedEps.sort((a, b) => {
              if (a.extractedEpNum > 0 && b.extractedEpNum > 0 && a.extractedEpNum !== b.extractedEpNum) {
                return a.extractedEpNum - b.extractedEpNum;
              }
              return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
            });

            const episodes = parsedEps.map((ep, idx) => ({
              episodeNumber: ep.extractedEpNum > 0 ? ep.extractedEpNum : idx + 1,
              title: ep.title,
              fileUrl: ep.fileUrl
            }));

            if (episodes.length > 0) {
              seasons.push({ seasonNumber, episodes });
              const seasonVersions = episodes.map(ep => ({
                id: Buffer.from(ep.fileUrl).toString('base64url'),
                name: `S${String(seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}: ${ep.title}`,
                quality: item.qualityBadge || '720P',
                fileUrl: ep.fileUrl,
                mimeType: ep.fileUrl.endsWith('.mp4') ? 'video/mp4' : 'video/x-matroska'
              }));
              allSeasonVersions.push(...seasonVersions);
            }
          }
        } catch (e) {
          console.warn('[DhakaFlix] Error scanning season:', (e as Error).message);
        }
      }

      if (allSeasonVersions.length > 0) {
        // Place Season 1 Episode 1 as the very first version in versions array
        versions = [...allSeasonVersions, ...versions];
      }
    }

    return {
      ...item,
      posterUrl,
      versions,
      subtitles,
      seasons,
      directPlaybackSupported: versions.length > 0
    };
  }

  public async resolvePlayback(itemId: string, versionId?: string): Promise<PlaybackDescriptor> {
    const details = await this.getItemDetails(itemId);
    if (!details.versions.length) {
      throw new Error('No playable video files found in this folder.');
    }

    let selectedVersion = details.versions[0];
    if (versionId) {
      let found = details.versions.find(v => v.id === versionId || v.fileUrl === versionId);
      if (!found) {
        let decUrl = versionId;
        try {
          const d1 = Buffer.from(versionId, 'base64url').toString('utf8');
          if (d1.startsWith('http')) decUrl = d1;
        } catch {}
        try {
          const d2 = Buffer.from(versionId, 'base64').toString('utf8');
          if (d2.startsWith('http')) decUrl = d2;
        } catch {}

        found = details.versions.find(v => v.fileUrl === decUrl || v.fileUrl.endsWith(decUrl));
      }
      if (found) selectedVersion = found;
    }

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
      // Ignore
    }

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
      availableQualities: [...new Set(details.versions.map(v => v.quality))],
      posterUrl: details.posterUrl
    };
  }
}
