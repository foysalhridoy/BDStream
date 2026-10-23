import { PlayerSettings, WatchProgress } from '../types/media';

const PROGRESS_STORAGE_KEY = 'bdstream_watch_progress_v1';
const SETTINGS_STORAGE_KEY = 'bdstream_user_settings_v1';

const DEFAULT_SETTINGS: PlayerSettings = {
  theme: 'dark',
  defaultSpeed: 1,
  autoplayNext: true,
  resumePlayback: true,
  subtitleSize: 'medium',
  subtitleBackground: true
};

export const StorageService = {
  getSettings(): PlayerSettings {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: Partial<PlayerSettings>): PlayerSettings {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  getAllWatchProgress(): WatchProgress[] {
    try {
      const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!data) return [];
      const parsed: Record<string, WatchProgress> = JSON.parse(data);
      return Object.values(parsed).sort(
        (a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime()
      );
    } catch {
      return [];
    }
  },

  getProgress(itemId: string): WatchProgress | null {
    try {
      const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!data) return null;
      const parsed: Record<string, WatchProgress> = JSON.parse(data);
      return parsed[itemId] || null;
    } catch {
      return null;
    }
  },

  saveProgress(progress: WatchProgress): void {
    try {
      // Don't save if progress is at the very beginning (< 5s) or end (> 95%)
      if (progress.duration > 0 && progress.currentTime / progress.duration > 0.95) {
        this.clearProgress(progress.itemId);
        return;
      }
      if (progress.currentTime < 5) return;

      const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
      const parsed: Record<string, WatchProgress> = data ? JSON.parse(data) : {};
      parsed[progress.itemId] = {
        ...progress,
        lastWatchedAt: new Date().toISOString()
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Ignore quota errors
    }
  },

  clearProgress(itemId: string): void {
    try {
      const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!data) return;
      const parsed: Record<string, WatchProgress> = JSON.parse(data);
      delete parsed[itemId];
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Ignore
    }
  }
};
