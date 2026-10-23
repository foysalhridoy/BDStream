import { DhakaFlixConnector } from './dhakaflix.js';
import { ICCConnector } from './icc.js';
import {
  CatalogQueryOptions,
  CatalogResult,
  MediaItem,
  MediaItemDetails,
  PlaybackDescriptor,
  SourceHealth,
  SourceId
} from './types.js';

export class SourceRegistry {
  private dhakaflix: DhakaFlixConnector;
  private icc: ICCConnector;

  constructor() {
    this.dhakaflix = new DhakaFlixConnector();
    this.icc = new ICCConnector();
  }

  public getDhakaFlix(): DhakaFlixConnector {
    return this.dhakaflix;
  }

  public getICC(): ICCConnector {
    return this.icc;
  }

  /**
   * Health status of all sources
   */
  public async getSourcesHealth(): Promise<Record<SourceId, SourceHealth>> {
    const [dfHealth, iccHealth] = await Promise.all([
      this.dhakaflix.checkAvailability(),
      this.icc.checkAvailability()
    ]);

    return {
      dhakaflix: dfHealth,
      icc: iccHealth
    };
  }

  /**
   * Unified catalog retrieval with filtering, search, pagination, and sorting
   */
  public async getCatalog(options: CatalogQueryOptions = {}): Promise<CatalogResult> {
    const {
      source = 'all',
      type = 'all',
      category,
      search,
      year,
      sortBy = 'discoveredAt',
      sortOrder = 'desc',
      page = 1,
      limit = 24
    } = options;

    let allItems: MediaItem[] = [];

    // Fetch from requested sources
    if (source === 'all' || source === 'dhakaflix') {
      try {
        const dfItems = await this.dhakaflix.getCatalog(options);
        allItems.push(...dfItems);
      } catch (err) {
        console.error('[Registry] DhakaFlix catalog fetch error:', err);
      }
    }

    if (source === 'all' || source === 'icc') {
      try {
        const iccItems = await this.icc.getCatalog(options);
        allItems.push(...iccItems);
      } catch (err) {
        console.error('[Registry] ICC catalog fetch error:', err);
      }
    }

    // Collect all available categories and years for filter dropdowns
    const categoriesSet = new Set<string>();
    const yearsSet = new Set<number>();
    for (const item of allItems) {
      if (item.category) categoriesSet.add(item.category);
      if (item.year) yearsSet.add(item.year);
    }
    const categories = Array.from(categoriesSet).sort();
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    // Apply filtering
    let filtered = allItems;

    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type);
    }

    if (category) {
      filtered = filtered.filter(item => item.category.toLowerCase() === category.toLowerCase());
    }

    if (year) {
      filtered = filtered.filter(item => item.year === year);
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

    // Sorting
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
        dhakaflix: allItems.some(i => i.source === 'dhakaflix'),
        icc: allItems.some(i => i.source === 'icc')
      }
    };
  }

  public async getItemDetails(itemId: string): Promise<MediaItemDetails> {
    if (itemId.startsWith('dhakaflix:') || this.isFromSource(itemId, 'dhakaflix')) {
      return this.dhakaflix.getItemDetails(itemId);
    }
    if (itemId.startsWith('icc:') || this.isFromSource(itemId, 'icc')) {
      return this.icc.getItemDetails(itemId);
    }

    // Fallback: try dhakaflix first
    try {
      return await this.dhakaflix.getItemDetails(itemId);
    } catch {
      return await this.icc.getItemDetails(itemId);
    }
  }

  public async resolvePlayback(itemId: string, versionId?: string): Promise<PlaybackDescriptor> {
    if (itemId.startsWith('dhakaflix:') || this.isFromSource(itemId, 'dhakaflix')) {
      return this.dhakaflix.resolvePlayback(itemId, versionId);
    }
    if (itemId.startsWith('icc:') || this.isFromSource(itemId, 'icc')) {
      return this.icc.resolvePlayback(itemId, versionId);
    }

    try {
      return await this.dhakaflix.resolvePlayback(itemId, versionId);
    } catch {
      return await this.icc.resolvePlayback(itemId, versionId);
    }
  }

  private isFromSource(itemId: string, sourcePrefix: string): boolean {
    try {
      const decoded = Buffer.from(itemId, 'base64url').toString('utf8');
      return decoded.startsWith(`${sourcePrefix}:`);
    } catch {
      return false;
    }
  }
}

export const registry = new SourceRegistry();
