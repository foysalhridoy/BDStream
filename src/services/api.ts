import {
  MediaItemDetails,
  PlaybackDescriptor,
  SourceHealth,
  MediaType
} from '../types/media';

export interface CatalogResponse {
  success: boolean;
  items: import('../types/media').MediaItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: string[];
  years: number[];
  sourcesActive: Record<string, boolean>;
}

export const ApiService = {
  async getSources(): Promise<Record<string, SourceHealth>> {
    const res = await fetch('/api/sources');
    if (!res.ok) throw new Error(`Failed to fetch sources: ${res.statusText}`);
    const data = await res.json();
    return data.sources;
  },

  async getCatalog(params: {
    type?: MediaType | 'all';
    category?: string;
    search?: string;
    year?: number;
    sortBy?: 'discoveredAt' | 'title' | 'year';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  } = {}): Promise<CatalogResponse> {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'all') query.set('type', params.type);
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.year) query.set('year', params.year.toString());
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`/api/catalog?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch catalog: ${res.statusText}`);
    return res.json();
  },

  async getItemDetails(itemId: string): Promise<MediaItemDetails> {
    const res = await fetch(`/api/catalog/${encodeURIComponent(itemId)}`);
    if (!res.ok) throw new Error(`Media not found: ${res.statusText}`);
    const data = await res.json();
    return data.item;
  },

  async resolvePlayback(itemId: string, versionId?: string): Promise<PlaybackDescriptor> {
    const query = versionId ? `?versionId=${encodeURIComponent(versionId)}` : '';
    const res = await fetch(`/api/playback/resolve/${encodeURIComponent(itemId)}${query}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Playback resolution failed (${res.statusText})`);
    }
    const data = await res.json();
    return data.playback;
  },

  async refreshCatalog(): Promise<void> {
    await fetch('/api/catalog/refresh', { method: 'POST' });
  },

  getProxyAssetUrl(url?: string): string | undefined {
    if (!url) return undefined;
    return `/api/playback/proxy-asset?url=${encodeURIComponent(url)}`;
  }
};
