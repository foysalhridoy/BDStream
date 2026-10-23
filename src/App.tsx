import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { WatchPage } from './pages/WatchPage';
import { SettingsPage } from './pages/SettingsPage';
import { MediaDetailsModal } from './components/catalog/MediaDetailsModal';
import { MediaItem, SourceHealth, PlayerSettings } from './types/media';
import { ApiService } from './services/api';
import { StorageService } from './services/storage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [playingItem, setPlayingItem] = useState<{ item: MediaItem; versionId?: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourcesHealth, setSourcesHealth] = useState<Record<string, SourceHealth> | null>(null);
  const [settings, setSettings] = useState<PlayerSettings>(StorageService.getSettings());
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Load sources health
  const refreshHealth = async () => {
    try {
      const health = await ApiService.getSources();
      setSourcesHealth(health);
    } catch (e) {
      console.warn('Sources health fetch warning:', (e as Error).message);
    }
  };

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  // Sync theme
  useEffect(() => {
    if (settings.theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [settings.theme]);

  const handleThemeToggle = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = StorageService.saveSettings({ theme: nextTheme });
    setSettings(updated);
  };

  const handleNavigateTab = (tab: string, cat?: string) => {
    setCategoryFilter(cat);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setCurrentTab('catalog');
  };

  const handlePlayDirect = (item: MediaItem, versionId?: string) => {
    setActiveItem(null);
    setPlayingItem({ item, versionId });
    setCurrentTab('watch');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-bdstream-dark text-gray-100">
      {/* Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => handleNavigateTab(tab)}
        onSearch={handleSearch}
        sourcesHealth={sourcesHealth}
        theme={settings.theme}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'home' && (
          <HomePage
            onSelectItem={(item) => setActiveItem(item)}
            onPlayDirect={handlePlayDirect}
            onNavigateCategory={(cat) => handleNavigateTab('catalog', cat)}
            sourcesHealth={sourcesHealth}
          />
        )}

        {currentTab === 'catalog' && (
          <CatalogPage
            initialCategory={categoryFilter}
            initialType="all"
            searchQuery={searchQuery}
            onSelectItem={(item) => setActiveItem(item)}
            onPlayDirect={handlePlayDirect}
          />
        )}

        {currentTab === 'series' && (
          <CatalogPage
            initialType="series"
            searchQuery={searchQuery}
            onSelectItem={(item) => setActiveItem(item)}
            onPlayDirect={handlePlayDirect}
          />
        )}

        {currentTab === 'watch' && playingItem && (
          <WatchPage
            item={playingItem.item}
            versionId={playingItem.versionId}
            onBack={() => handleNavigateTab('catalog')}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdateSettings={setSettings}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onOpenShortcuts={() => setShowShortcutsModal(true)} />

      {/* Media Details Modal */}
      {activeItem && (
        <MediaDetailsModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onPlay={(item, versionId) => handlePlayDirect(item, versionId)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-bdstream-card border border-bdstream-border max-w-md w-full rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-bdstream-border mb-4">
              <h3 className="font-bold text-white text-base">VLC Player Shortcuts</h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Play / Pause</span>
                <kbd className="px-2 py-0.5 bg-gray-800 text-white rounded">Space</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Seek 5s Back / Forward</span>
                <kbd className="px-2 py-0.5 bg-gray-800 text-white rounded">&larr; / &rarr;</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Seek 30s Back / Forward</span>
                <kbd className="px-2 py-0.5 bg-gray-800 text-white rounded">Shift + &larr; / &rarr;</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Volume Up / Down</span>
                <kbd className="px-2 py-0.5 bg-gray-800 text-white rounded">&uarr; / &darr;</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Toggle Fullscreen</span>
                <kbd className="px-2 py-0.5 bg-gray-800 text-white rounded">F</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Mute / Unmute</span>
                <kbd className="px-2 py-0.5 bg-gray-800 text-white rounded">M</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800">
                <span className="text-gray-400">Subtitles Toggle</span>
                <kbd className="px-2 py-0.5 bg-gray-800 text-white rounded">C</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Speed Down / Up</span>
                <kbd className="px-2 py-0.5 bg-gray-800 text-white rounded">[ / ]</kbd>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-2 bg-vlc-orange text-white text-xs font-semibold rounded-lg hover:bg-vlc-darkOrange transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
