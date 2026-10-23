import React from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { MediaType } from '../../types/media';

interface FilterBarProps {
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
    <div className="space-y-3 mb-6">
      {/* Search & Main Category Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search titles, release years..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-bdstream-surface border border-bdstream-border text-xs text-gray-200 placeholder-gray-500 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-vlc-orange focus:ring-1 focus:ring-vlc-orange transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>

        {/* Year & Sort Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          {/* Year select */}
          {years.length > 0 && (
            <select
              value={year || ''}
              onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="bg-bdstream-surface border border-bdstream-border text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-vlc-orange cursor-pointer text-xs"
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'discoveredAt' | 'title' | 'year')}
            className="bg-bdstream-surface border border-bdstream-border text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-vlc-orange cursor-pointer text-xs"
          >
            <option value="discoveredAt">Recently Added</option>
            <option value="title">Name (A - Z)</option>
            <option value="year">Release Year</option>
          </select>

          <button
            onClick={onSortOrderToggle}
            title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            className="p-2 bg-bdstream-surface border border-bdstream-border text-gray-300 hover:text-white rounded-xl transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DhakaFlix Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => {
            onMediaTypeChange('all');
            onCategoryChange('');
          }}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-colors ${
            !category && mediaType === 'all'
              ? 'bg-vlc-orange text-white shadow-sm'
              : 'bg-bdstream-surface text-gray-300 hover:text-white border border-bdstream-border/60'
          }`}
        >
          All DhakaFlix
        </button>

        {categories.map((c) => (
          <button
            key={c}
            onClick={() => onCategoryChange(c === category ? '' : c)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-colors ${
              category === c
                ? 'bg-vlc-orange text-white shadow-sm'
                : 'bg-bdstream-surface text-gray-300 hover:text-white border border-bdstream-border/60'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
};
