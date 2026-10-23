import React from 'react';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { SourceId, MediaType } from '../../types/media';

interface FilterBarProps {
  source: SourceId | 'all';
  onSourceChange: (source: SourceId | 'all') => void;
  mediaType: MediaType | 'all';
  onMediaTypeChange: (type: MediaType | 'all') => void;
  category: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  year: number | undefined;
  onYearChange: (year: number | undefined) => void;
  years: number[];
  search: string;
  onSearchChange: (search: string) => void;
  sortBy: 'discoveredAt' | 'title' | 'year';
  onSortByChange: (sort: 'discoveredAt' | 'title' | 'year') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  source,
  onSourceChange,
  mediaType,
  onMediaTypeChange,
  category,
  onCategoryChange,
  categories,
  year,
  onYearChange,
  years,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle
}) => {
  return (
    <div className="bg-bdstream-card border border-bdstream-border rounded-xl p-4 mb-6 shadow-sm space-y-4">
      {/* Top Row: Search and Sources */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by title, genre, year..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-bdstream-surface border border-bdstream-border text-sm text-gray-200 placeholder-gray-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-vlc-orange focus:ring-1 focus:ring-vlc-orange transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>

        {/* Source Filter Buttons */}
        <div className="flex items-center gap-1 bg-bdstream-surface p-1 rounded-lg border border-bdstream-border text-xs font-medium self-start md:self-auto">
          <button
            onClick={() => onSourceChange('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              source === 'all'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Sources
          </button>
          <button
            onClick={() => onSourceChange('dhakaflix')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              source === 'dhakaflix'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            DhakaFlix
          </button>
          <button
            onClick={() => onSourceChange('icc')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              source === 'icc'
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ICC Media
          </button>
        </div>
      </div>

      {/* Bottom Row: Type, Category, Year, Sorting */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {/* Media Type */}
        <div className="flex items-center gap-1 bg-bdstream-surface p-1 rounded-lg border border-bdstream-border">
          <button
            onClick={() => onMediaTypeChange('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              mediaType === 'all'
                ? 'bg-white/15 text-white font-medium'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onMediaTypeChange('movie')}
            className={`px-2.5 py-1 rounded transition-colors ${
              mediaType === 'movie'
                ? 'bg-white/15 text-white font-medium'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => onMediaTypeChange('series')}
            className={`px-2.5 py-1 rounded transition-colors ${
              mediaType === 'series'
                ? 'bg-white/15 text-white font-medium'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Series
          </button>
        </div>

        {/* Category Dropdown */}
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-bdstream-surface border border-bdstream-border text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-vlc-orange cursor-pointer"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {/* Year Dropdown */}
        {years.length > 0 && (
          <select
            value={year || ''}
            onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
            className="bg-bdstream-surface border border-bdstream-border text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-vlc-orange cursor-pointer"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}

        {/* Sort Options */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-gray-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'discoveredAt' | 'title' | 'year')}
            className="bg-bdstream-surface border border-bdstream-border text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-vlc-orange cursor-pointer"
          >
            <option value="discoveredAt">Recently Added</option>
            <option value="title">Title (A-Z)</option>
            <option value="year">Year</option>
          </select>
          <button
            onClick={onSortOrderToggle}
            title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            className="p-1.5 bg-bdstream-surface border border-bdstream-border text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
