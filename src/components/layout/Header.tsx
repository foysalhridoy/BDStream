import React, { useState } from 'react';
import {
  Film,
  Tv,
  Activity,
  Settings,
  Search,
  Sun,
  Moon,
  Wifi,
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
  const iccAvailable = sourcesHealth?.icc?.isAccessible ?? false;

  return (
    <header className="sticky top-0 z-40 bg-bdstream-dark/90 backdrop-blur-md border-b border-bdstream-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => onTabChange('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative w-9 h-9 bg-gradient-to-br from-vlc-lightOrange via-vlc-orange to-vlc-darkOrange rounded-lg flex items-center justify-center shadow-lg shadow-vlc-orange/20 group-hover:scale-105 transition-transform">
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
              ISP MEDIA GATEWAY
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-bdstream-surface px-2 py-1.5 rounded-xl border border-bdstream-border/60">
          <button
            onClick={() => onTabChange('home')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === 'home'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onTabChange('catalog')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === 'catalog'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-4 h-4" />
            Browse Catalog
          </button>
          <button
            onClick={() => {
              onTabChange('series');
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === 'series'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Tv className="w-4 h-4" />
            TV Series
          </button>
          <button
            onClick={() => onTabChange('diagnostics')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === 'diagnostics'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            Diagnostics
          </button>
          <button
            onClick={() => onTabChange('settings')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === 'settings'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative hidden lg:block w-64">
            <input
              type="text"
              placeholder="Search movies, series..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-bdstream-surface border border-bdstream-border text-sm text-gray-200 placeholder-gray-500 rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:border-vlc-orange focus:ring-1 focus:ring-vlc-orange transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </form>

          {/* Source Status Indicators */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <div
              title={`DhakaFlix: ${dfAvailable ? 'Online' : 'Offline'}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border ${
                dfAvailable
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <Server className="w-3 h-3" />
              <span>DF</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dfAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            </div>

            <div
              title={`ICC: ${iccAvailable ? 'Online (Session required)' : 'Offline'}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border ${
                iccAvailable
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              }`}
            >
              <Wifi className="w-3 h-3" />
              <span>ICC</span>
              <span className={`w-1.5 h-1.5 rounded-full ${iccAvailable ? 'bg-blue-400' : 'bg-yellow-400'}`} />
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            title="Toggle theme"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-bdstream-surface border border-transparent hover:border-bdstream-border transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
