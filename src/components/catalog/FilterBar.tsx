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
            className="w-full bg-white border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:border-[#d4ff00] focus:ring-2 focus:ring-[#d4ff00]/40 shadow-xs transition-colors"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
        </div>

        {/* Year & Sort Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
          {/* Year select */}
          {years.length > 0 && (
            <select
              value={year || ''}
              onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="bg-white border border-neutral-200 text-neutral-700 rounded-full px-3.5 py-2 focus:outline-none focus:border-[#d4ff00] focus:ring-2 focus:ring-[#d4ff00]/40 cursor-pointer text-xs shadow-xs"
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
            className="bg-white border border-neutral-200 text-neutral-700 rounded-full px-3.5 py-2 focus:outline-none focus:border-[#d4ff00] focus:ring-2 focus:ring-[#d4ff00]/40 cursor-pointer text-xs shadow-xs"
          >
            <option value="discoveredAt">Recently Added</option>
            <option value="title">Name (A - Z)</option>
            <option value="year">Release Year</option>
          </select>

          <button
            onClick={onSortOrderToggle}
            title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            className="p-2 bg-white border border-neutral-200 text-neutral-700 hover:text-black rounded-full shadow-xs transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => {
            onMediaTypeChange('all');
            onCategoryChange('');
          }}
          className={`px-3.5 py-1.5 rounded-full whitespace-nowrap text-xs font-black transition-all ${
            !category && mediaType === 'all'
              ? 'bg-[#d4ff00] text-black font-black shadow-sm'
              : 'bg-white text-neutral-600 hover:text-black border border-neutral-200 shadow-2xs hover:border-neutral-300'
          }`}
        >
          All Categories
        </button>

        {categories.map((c) => (
          <button
            key={c}
            onClick={() => onCategoryChange(c === category ? '' : c)}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap text-xs font-black transition-all ${
              category === c
                ? 'bg-[#d4ff00] text-black font-black shadow-sm'
                : 'bg-white text-neutral-600 hover:text-black border border-neutral-200 shadow-2xs hover:border-neutral-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
};
