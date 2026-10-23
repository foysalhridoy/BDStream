import React, { useEffect, useState, useCallback } from 'react';
import { MediaItem, MediaType, SourceId } from '../types/media';
import { FilterBar } from '../components/catalog/FilterBar';
import { MediaGrid } from '../components/catalog/MediaGrid';
import { ApiService, CatalogResponse } from '../services/api';

interface CatalogPageProps {
  initialCategory?: string;
  initialType?: MediaType | 'all';
  searchQuery?: string;
  onSelectItem: (item: MediaItem) => void;
  onPlayDirect: (item: MediaItem) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  initialCategory,
  initialType = 'all',
  searchQuery = '',
  onSelectItem,
  onPlayDirect
}) => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);

  // Filter states
  const [source, setSource] = useState<SourceId | 'all'>('all');
  const [mediaType, setMediaType] = useState<MediaType | 'all'>(initialType);
  const [category, setCategory] = useState<string>(initialCategory || '');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState<string>(searchQuery);
  const [sortBy, setSortBy] = useState<'discoveredAt' | 'title' | 'year'>('discoveredAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchCatalog = useCallback(() => {
    setLoading(true);
    ApiService.getCatalog({
      source,
      type: mediaType,
      category: category || undefined,
      year,
      search: search || undefined,
      sortBy,
      sortOrder,
      page,
      limit: 24
    })
      .then((res: CatalogResponse) => {
        setItems(res.items);
        setTotalPages(res.totalPages);
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
        if (res.years && res.years.length > 0) {
          setYears(res.years);
        }
      })
      .catch((err) => {
        console.error('Catalog fetch error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [source, mediaType, category, year, search, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setPage(1);
  };

  const handleSourceChange = (newSource: SourceId | 'all') => {
    setSource(newSource);
    setPage(1);
  };

  const handleMediaTypeChange = (newType: MediaType | 'all') => {
    setMediaType(newType);
    setPage(1);
  };

  const handleYearChange = (newYear: number | undefined) => {
    setYear(newYear);
    setPage(1);
  };

  const handleSortByChange = (newSort: 'discoveredAt' | 'title' | 'year') => {
    setSortBy(newSort);
    setPage(1);
  };

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  return (
    <div className="pb-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {mediaType === 'series' ? 'TV & Web Series Catalog' : 'Media Discovery'}
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Browse, filter, and stream directly from authorized ISP sources
        </p>
      </div>

      <FilterBar
        source={source}
        onSourceChange={handleSourceChange}
        mediaType={mediaType}
        onMediaTypeChange={handleMediaTypeChange}
        category={category}
        onCategoryChange={handleCategoryChange}
        categories={categories}
        year={year}
        onYearChange={handleYearChange}
        years={years}
        search={search}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortByChange={handleSortByChange}
        sortOrder={sortOrder}
        onSortOrderToggle={handleSortOrderToggle}
      />

      <MediaGrid
        items={items}
        isLoading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onSelect={onSelectItem}
        onPlayDirect={onPlayDirect}
        onRetry={fetchCatalog}
      />
    </div>
  );
};
