import React, { useState } from 'react';
import {
  Film,
  Tv,
  Search,
  Sun,
  Moon,
  Server
} from 'lucide-react';
import { SourceHealth } from '../../types/media';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSearch: (query: string) => void;
  sourcesHealth: Record<string, SourceHealth> | null;
  theme: string;
  onThemeToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onSearch,
  sourcesHealth,
  theme,
  onThemeToggle
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
      onTabChange('catalog');
    }
  };

  const dfAvailable = sourcesHealth?.dhakaflix?.isAccessible ?? false;
  const itemCount = sourcesHealth?.dhakaflix?.itemCount ?? 0;

  return (
    <header className="sticky top-0 z-40 bg-bdstream-dark/95 backdrop-blur-md border-b border-bdstream-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => {
            onSearch('');
            onTabChange('home');
          }}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative w-9 h-9 bg-gradient-to-br from-vlc-lightOrange via-vlc-orange to-vlc-darkOrange rounded-xl flex items-center justify-center shadow-lg shadow-vlc-orange/20 group-hover:scale-105 transition-transform">
            <svg
              className="w-5 h-5 text-white drop-shadow"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span className="absolute -bottom-1 w-3 h-0.5 bg-white/70 rounded-full" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              BD<span className="text-vlc-orange">Stream</span>
            </span>
            <span className="hidden sm:block text-[10px] text-gray-400 font-mono tracking-wider -mt-1">
              DHAKAFLIX STREAMER
            </span>
          </div>
        </div>

        {/* Minimal Navigation */}
        <nav className="flex items-center gap-1 bg-bdstream-surface px-2 py-1 rounded-xl border border-bdstream-border/60">
          <button
            onClick={() => {
              onSearch('');
              onTabChange('home');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'home'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              onTabChange('catalog');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              currentTab === 'catalog'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Movies
          </button>
          <button
            onClick={() => {
              onTabChange('series');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              currentTab === 'series'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            TV Series
          </button>
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-56 lg:w-72">
            <input
              type="text"
              placeholder="Search movies & series..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-bdstream-surface border border-bdstream-border text-xs text-gray-200 placeholder-gray-500 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-vlc-orange focus:ring-1 focus:ring-vlc-orange transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </form>

          {/* DhakaFlix Live Indicator */}
          <div
            title={`DhakaFlix Server: ${dfAvailable ? 'Online' : 'Offline'}`}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-400 text-xs font-mono font-medium"
          >
            <Server className="w-3.5 h-3.5 text-vlc-orange" />
            <span>DhakaFlix</span>
            <span className={`w-1.5 h-1.5 rounded-full ${dfAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {itemCount > 0 && <span className="text-[10px] text-gray-400 font-sans">({itemCount})</span>}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            title="Toggle theme"
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-bdstream-surface border border-transparent hover:border-bdstream-border transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
