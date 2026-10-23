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

  // Set light mode
  useEffect(() => {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }, []);

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
    <div className="min-h-screen flex flex-col bg-[#f6f7fb] text-neutral-900 transition-colors duration-200 w-full max-w-full overflow-x-hidden selection:bg-neutral-900 selection:text-white font-sans">
      {/* Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => handleNavigateTab(tab)}
        onSearch={handleSearch}
        sourcesHealth={sourcesHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-1 sm:pt-6 overflow-x-hidden">
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 max-w-md w-full rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
              <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#d4ff00] animate-pulse" />
                BDStream <span className="bg-[#d4ff00] text-black px-2 py-0.5 rounded-md font-black text-xs">Shortcuts</span>
              </h3>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-600">Play / Pause</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded font-semibold">Space</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-600">Seek 5s Back / Forward</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded font-semibold">&larr; / &rarr;</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-600">Seek 30s Back / Forward</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded font-semibold">Shift + &larr; / &rarr;</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-600">Volume Up / Down</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded font-semibold">&uarr; / &darr;</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-600">Toggle Fullscreen</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded font-semibold">F</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-600">Mute / Unmute</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded font-semibold">M</kbd>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-600">Subtitles Toggle</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded font-semibold">C</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-600">Speed Down / Up</span>
                <kbd className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-900 rounded font-semibold">[ / ]</kbd>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-5 py-2 bg-[#d4ff00] hover:bg-[#c4ec00] text-black font-black text-xs rounded-full transition-colors shadow-sm"
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
