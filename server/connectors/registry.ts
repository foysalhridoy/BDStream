import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DhakaFlixConnector } from './dhakaflix.js';
import { CineplexConnector } from './cineplex.js';
import { BasPlayConnector } from './basplay.js';
import {
  CatalogQueryOptions,
  CatalogResult,
  MediaItem,
  MediaItemDetails,
  PlaybackDescriptor,
  SourceHealth
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let seedCatalog: MediaItem[] = [];
const seedItemMap = new Map<string, MediaItem>();

try {
  const candidatePaths = [
    path.resolve(__dirname, '../data/seed-catalog.json'),
    path.resolve(__dirname, '../../server/data/seed-catalog.json'),
    path.resolve(process.cwd(), 'server/data/seed-catalog.json'),
    path.resolve(process.cwd(), 'dist/server/data/seed-catalog.json')
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      seedCatalog = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const item of seedCatalog) {
        seedItemMap.set(item.id, item);
      }
      break;
    }
  }
} catch (e) {
  console.warn('[BDStream] Could not load seed-catalog.json:', (e as Error).message);
}

export class SourceRegistry {
  private dhakaflix: DhakaFlixConnector;
  private cineplex: CineplexConnector;
  private basplay: BasPlayConnector;

  constructor() {
    this.dhakaflix = new DhakaFlixConnector();
    this.cineplex = new CineplexConnector();
    this.basplay = new BasPlayConnector();
  }

  public getDhakaFlix(): DhakaFlixConnector {
    return this.dhakaflix;
  }

  public getCinePlex(): CineplexConnector {
    return this.cineplex;
  }

  public getBasPlay(): BasPlayConnector {
    return this.basplay;
  }

  public async getSourcesHealth(): Promise<Record<string, SourceHealth>> {
    const [dfHealth, cpHealth, bpHealth] = await Promise.allSettled([
      this.dhakaflix.checkAvailability(),
      this.cineplex.checkAvailability(),
      this.basplay.checkAvailability()
    ]);

    return {
      dhakaflix: dfHealth.status === 'fulfilled' ? dfHealth.value : {
        id: 'dhakaflix',
        name: 'DhakaFlix Portal',
        baseUrl: 'http://172.16.50.4/',
        isAccessible: false,
        latencyMs: 0,
        requiresSession: false,
        itemCount: 0,
        message: 'Offline',
        lastChecked: new Date().toISOString()
      },
      cineplex: cpHealth.status === 'fulfilled' ? cpHealth.value : {
        id: 'cineplex',
        name: 'CinePlex BD',
        baseUrl: 'http://cineplexbd.net/',
        isAccessible: false,
        latencyMs: 0,
        requiresSession: false,
        itemCount: 0,
        message: 'Offline',
        lastChecked: new Date().toISOString()
      },
      basplay: bpHealth.status === 'fulfilled' ? bpHealth.value : {
        id: 'basplay',
        name: 'BAS Play (10.20.30.40)',
        baseUrl: 'http://10.20.30.40/',
        isAccessible: false,
        latencyMs: 0,
        requiresSession: false,
        itemCount: 0,
        message: 'Offline',
        lastChecked: new Date().toISOString()
      }
    };
  }

  public async getCatalog(options: CatalogQueryOptions = {}): Promise<CatalogResult> {
    const {
      source = 'all',
      type = 'all',
      category,
      search,
      letter,
      year,
      sortBy = 'discoveredAt',
      sortOrder = 'desc',
      page = 1,
      limit = 24
    } = options;

    let allItems: MediaItem[] = [];

    const [dfRes, cpRes, bpRes] = await Promise.allSettled([
      (source === 'all' || source === 'dhakaflix') ? this.dhakaflix.getCatalog(options) : Promise.resolve([]),
      (source === 'all' || source === 'cineplex') ? this.cineplex.getCatalog(options) : Promise.resolve([]),
      (source === 'all' || source === 'basplay') ? this.basplay.getCatalog(options) : Promise.resolve([])
    ]);

    if (dfRes.status === 'fulfilled') allItems.push(...dfRes.value);
    if (cpRes.status === 'fulfilled') allItems.push(...cpRes.value);
    if (bpRes.status === 'fulfilled') allItems.push(...bpRes.value);

    // If live crawling returned no items (e.g. serverless cold start on Vercel), fall back to seed catalog
    if (allItems.length === 0 && seedCatalog.length > 0) {
      allItems.push(...seedCatalog);
    }

    // If searching, execute live database search on BAS Play and Cineplex to find any available movies/series
    if (search && search.trim()) {
      const q = search.trim();
      const liveSearches = await Promise.allSettled([
        (source === 'all' || source === 'basplay') ? this.basplay.search(q) : Promise.resolve([]),
        (source === 'all' || source === 'cineplex') ? this.cineplex.search(q) : Promise.resolve([])
      ]);
      if (liveSearches[0].status === 'fulfilled') allItems.push(...liveSearches[0].value);
      if (liveSearches[1].status === 'fulfilled') allItems.push(...liveSearches[1].value);

      // Deduplicate by ID
      const seenIds = new Set<string>();
      allItems = allItems.filter(item => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });
    }

    const categoriesSet = new Set<string>();
    const yearsSet = new Set<number>();
    for (const item of allItems) {
      if (item.category) categoriesSet.add(item.category);
      if (item.year) yearsSet.add(item.year);
    }
    const categories = Array.from(categoriesSet).sort();
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    let filtered = allItems;

    if (source !== 'all') {
      filtered = filtered.filter(item => item.source === source);
    }

    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type);
    }

    if (category) {
      filtered = filtered.filter(item => item.category.toLowerCase() === category.toLowerCase());
    }

    if (year) {
      filtered = filtered.filter(item => item.year === year);
    }

    if (letter && letter !== 'All') {
      if (letter === '#') {
        filtered = filtered.filter(item => !/^[a-zA-Z]/.test(item.title.trim()));
      } else {
        const char = letter.trim().toUpperCase();
        filtered = filtered.filter(item => item.title.trim().toUpperCase().startsWith(char));
      }
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          item.rawTitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'year') {
        comparison = (a.year || 0) - (b.year || 0);
      } else {
        comparison = new Date(a.discoveredAt).getTime() - new Date(b.discoveredAt).getTime();
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page: currentPage,
      limit,
      totalPages,
      categories,
      years,
      sourcesActive: {
        dhakaflix: (dfRes.status === 'fulfilled' && dfRes.value.length > 0) || false,
        cineplex: (cpRes.status === 'fulfilled' && cpRes.value.length > 0) || false,
        basplay: (bpRes.status === 'fulfilled' && bpRes.value.length > 0) || false
      }
    };
  }

  private resolveConnector(itemId: string) {
    try {
      let decoded = '';
      try {
        decoded = Buffer.from(itemId, 'base64url').toString('utf8');
      } catch {
        decoded = Buffer.from(itemId, 'base64').toString('utf8');
      }
      if (decoded.startsWith('cineplex:')) return this.cineplex;
      if (decoded.startsWith('basplay:')) return this.basplay;
    } catch {
      // default
    }
    return this.dhakaflix;
  }

  public async getItemDetails(itemId: string): Promise<MediaItemDetails> {
    try {
      const connector = this.resolveConnector(itemId);
      return await connector.getItemDetails(itemId);
    } catch (err) {
      const seedItem = seedItemMap.get(itemId);
      if (seedItem) {
        return {
          ...seedItem,
          versions: [{
            id: Buffer.from(seedItem.folderUrl).toString('base64url'),
            name: 'Direct ISP Playback (1080P)',
            quality: seedItem.qualityBadge || '1080P',
            fileUrl: seedItem.folderUrl
          }],
          subtitles: [],
          directPlaybackSupported: true
        };
      }
      throw err;
    }
  }

  public async resolvePlayback(itemId: string, versionId?: string): Promise<PlaybackDescriptor> {
    try {
      const connector = this.resolveConnector(itemId);
      return await connector.resolvePlayback(itemId, versionId);
    } catch (err) {
      const seedItem = seedItemMap.get(itemId);
      if (seedItem) {
        return {
          itemId,
          title: seedItem.title,
          source: seedItem.source,
          directUrl: seedItem.folderUrl,
          relayStreamUrl: `/api/playback/relay?url=${encodeURIComponent(seedItem.folderUrl)}`,
          streamType: 'progressive',
          mimeType: seedItem.folderUrl.endsWith('.mp4') ? 'video/mp4' : 'video/x-matroska',
          supportsRangeRequests: true,
          subtitles: [],
          availableQualities: [seedItem.qualityBadge || '1080P'],
          posterUrl: seedItem.posterUrl
        };
      }
      throw err;
    }
  }
}

export const registry = new SourceRegistry();
