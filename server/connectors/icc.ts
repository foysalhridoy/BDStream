import {
  ISourceConnector,
  MediaItem,
  MediaItemDetails,
  PlaybackDescriptor,
  SourceHealth,
  CatalogQueryOptions
} from './types.js';
import { validateMediaUrl } from '../security/ssrfGuard.js';
import { config } from '../config.js';

export class ICCConnector implements ISourceConnector {
  public id = 'icc' as const;
  public name = 'ICC Media Portal';
  private baseUrl = config.ICC_BASE_URL;
  private sessionToken = config.ICC_SESSION_TOKEN;
  private items: MediaItem[] = [];

  public setSessionToken(token: string) {
    this.sessionToken = token.trim();
  }

  public async checkAvailability(): Promise<SourceHealth> {
    const startTime = Date.now();
    try {
      validateMediaUrl(this.baseUrl);

      // Probe root with manual redirect to detect captive / firewall redirect
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(this.baseUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BDStream/1.0',
          'Accept': 'text/html,*/*'
        }
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      // Check if redirect location is captive firewall or login
      const location = res.headers.get('location') || '';
      const isRedirectedToAuth =
        res.status === 302 &&
        (location.includes('vfw.php') || location.includes('notice.html') || location.includes('login.php') || location.includes('index.php'));

      // Also probe login.php to verify host responsiveness
      const loginRes = await fetch(new URL('login.php', this.baseUrl).href, {
        headers: { 'Accept': 'text/html,*/*' }
      });

      const hostIsUp = loginRes.ok || res.status === 302;

      if (!hostIsUp) {
        return {
          id: this.id,
          name: this.name,
          baseUrl: this.baseUrl,
          isAccessible: false,
          latencyMs,
          requiresSession: true,
          sessionValid: false,
          itemCount: 0,
          error: `HTTP ${res.status}: ${res.statusText}`,
          message: 'ICC Portal server is not responding at 10.16.100.244.',
          lastChecked: new Date().toISOString()
        };
      }

      if (this.sessionToken) {
        // Test provided session token
        const dashboardUrl = `${this.baseUrl}dashboard.php?session=${encodeURIComponent(this.sessionToken)}`;
        const dashRes = await fetch(dashboardUrl, { redirect: 'manual' });
        const isValid = dashRes.status === 200;

        return {
          id: this.id,
          name: this.name,
          baseUrl: this.baseUrl,
          isAccessible: true,
          latencyMs,
          requiresSession: true,
          sessionValid: isValid,
          itemCount: this.items.length,
          message: isValid
            ? 'Connected with active authenticated subscriber session.'
            : 'Session token expired or rejected by ICC portal. Please re-authenticate.',
          lastChecked: new Date().toISOString()
        };
      }

      return {
        id: this.id,
        name: this.name,
        baseUrl: this.baseUrl,
        isAccessible: true,
        latencyMs,
        requiresSession: true,
        sessionValid: false,
        itemCount: 0,
        message: isRedirectedToAuth
          ? 'ICC server is reachable at 10.16.100.244, but active subscriber session authentication is required. Unauthenticated traffic is redirected by ISP firewall.'
          : 'Reachable. Subscriber authentication required for catalog access.',
        lastChecked: new Date().toISOString()
      };
    } catch (err: unknown) {
      return {
        id: this.id,
        name: this.name,
        baseUrl: this.baseUrl,
        isAccessible: false,
        latencyMs: Date.now() - startTime,
        requiresSession: true,
        sessionValid: false,
        itemCount: 0,
        error: (err as Error).message || 'Network unreachable',
        message: 'Cannot connect to ICC Portal at 10.16.100.244. Verify your local ISP network.',
        lastChecked: new Date().toISOString()
      };
    }
  }

  public async getCatalog(_options?: CatalogQueryOptions): Promise<MediaItem[]> {
    // If no authenticated session is configured, return empty catalog without fabrication
    if (!this.sessionToken) {
      return [];
    }

    try {
      const dashboardUrl = `${this.baseUrl}dashboard.php?session=${encodeURIComponent(this.sessionToken)}`;
      validateMediaUrl(dashboardUrl);
      const res = await fetch(dashboardUrl);
      if (!res.ok) return [];

      const html = await res.text();
      // Parse media items from authenticated dashboard if active
      this.items = this.parseIccDashboard(html);
      return this.items;
    } catch (err) {
      console.warn('[ICC] Catalog fetch error:', (err as Error).message);
      return [];
    }
  }

  private parseIccDashboard(html: string): MediaItem[] {
    const items: MediaItem[] = [];
    const linkMatches = [...html.matchAll(/href=["'](play\.php\?[^"']+|details\.php\?[^"']+)["']/g)];
    for (const match of linkMatches) {
      const href = match[1];
      const fullUrl = new URL(href, this.baseUrl).href;
      const id = Buffer.from(`icc:${fullUrl}`).toString('base64url');
      items.push({
        id,
        title: 'ICC Stream Item',
        type: 'movie',
        category: 'ICC Portal',
        source: this.id,
        folderUrl: fullUrl,
        discoveredAt: new Date().toISOString(),
        rawTitle: href
      });
    }
    return items;
  }

  public async getItemDetails(itemId: string): Promise<MediaItemDetails> {
    const item = this.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error(`ICC Media item not found or session expired for ID: ${itemId}`);
    }

    return {
      ...item,
      versions: [],
      subtitles: [],
      directPlaybackSupported: false,
      description: 'ICC Portal item details require an active authenticated subscriber session.'
    };
  }

  public async resolvePlayback(itemId: string, _versionId?: string): Promise<PlaybackDescriptor> {
    throw new Error(
      `Cannot resolve playback for ICC item ${itemId}: Active subscriber session token required.`
    );
  }
}
