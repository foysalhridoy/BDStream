import React, { useState } from 'react';
import {
  Film,
  Tv,
  Search,
  Server
} from 'lucide-react';
import { SourceHealth } from '../../types/media';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSearch: (query: string) => void;
  sourcesHealth: Record<string, SourceHealth> | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onSearch,
  sourcesHealth
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSearch(searchInput.trim());
      onTabChange('catalog');
      setShowMobileSearch(false);
    }
  };

  const dfAvailable = sourcesHealth?.dhakaflix?.isAccessible ?? false;
  const cpAvailable = sourcesHealth?.cineplex?.isAccessible ?? false;
  const bpAvailable = sourcesHealth?.basplay?.isAccessible ?? false;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => {
            onSearch('');
            onTabChange('home');
          }}
          className="cursor-pointer group select-none flex-shrink-0"
        >
          <BrandLogo size="md" />
        </div>

        {/* Rounded-Full Pill Navigation */}
        <nav className="flex items-center gap-1 bg-white p-1 rounded-full border border-neutral-200/90 shadow-2xs flex-shrink-0">
          <button
            onClick={() => {
              onSearch('');
              onTabChange('home');
            }}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              currentTab === 'home'
                ? 'bg-[#d4ff00] text-black font-extrabold shadow-sm'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              onTabChange('catalog');
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'catalog'
                ? 'bg-[#d4ff00] text-black font-extrabold shadow-sm'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Movies</span>
          </button>
          <button
            onClick={() => {
              onTabChange('series');
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'series'
                ? 'bg-[#d4ff00] text-black font-extrabold shadow-sm'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Series</span>
          </button>
        </nav>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block w-56 lg:w-72">
            <input
              type="text"
              placeholder="Search movies & series..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-[#d4ff00] focus:ring-2 focus:ring-[#d4ff00]/40 transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-2.5" />
          </form>

          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden p-2 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:text-black shadow-2xs transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Source Live Indicators (Pill Style) */}
          <div className="hidden lg:flex items-center gap-1.5">
            <span
              title={`DhakaFlix: ${dfAvailable ? 'Online' : 'Offline'}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-200/90 bg-white text-neutral-700 text-[11px] font-mono hover:border-neutral-300 shadow-2xs transition-colors"
            >
              <Server className="w-3 h-3 text-amber-500" />
              <span>DhakaFlix</span>
              <span className={`w-1.5 h-1.5 rounded-full ${dfAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            <span
              title={`CinePlex: ${cpAvailable ? 'Online' : 'Offline'}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-200/90 bg-white text-neutral-700 text-[11px] font-mono hover:border-neutral-300 shadow-2xs transition-colors"
            >
              <Server className="w-3 h-3 text-cyan-600" />
              <span>CinePlex</span>
              <span className={`w-1.5 h-1.5 rounded-full ${cpAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
            </span>
            <span
              title={`BAS Play: ${bpAvailable ? 'Online' : 'Offline'}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-200/90 bg-white text-neutral-700 text-[11px] font-mono hover:border-neutral-300 shadow-2xs transition-colors"
            >
              <Server className="w-3 h-3 text-[#709900]" />
              <span>BAS Play</span>
              <span className={`w-1.5 h-1.5 rounded-full ${bpAvailable ? 'bg-[#709900]' : 'bg-red-500'}`} />
            </span>
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Bar */}
      {showMobileSearch && (
        <div className="md:hidden px-3 py-2.5 bg-white border-t border-neutral-200 shadow-md animate-fade-in">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              autoFocus
              placeholder="Search movies & series..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 rounded-full pl-9 pr-16 py-2.5 focus:outline-none focus:border-[#d4ff00] focus:ring-2 focus:ring-[#d4ff00]/40"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3.5 py-1 bg-[#d4ff00] hover:bg-[#c4ec00] text-black text-xs font-bold rounded-full shadow-2xs"
            >
              Go
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
