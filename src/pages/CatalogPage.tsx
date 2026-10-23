import React, { useEffect, useState, useCallback } from 'react';
import { MediaItem, MediaType } from '../types/media';
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
  const [mediaType, setMediaType] = useState<MediaType | 'all'>(initialType);
  const [category, setCategory] = useState<string>(initialCategory || '');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState<string>(searchQuery);
  const [sortBy, setSortBy] = useState<'discoveredAt' | 'title' | 'year'>('discoveredAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (initialCategory !== undefined) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (initialType !== undefined) {
      setMediaType(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearch(searchQuery);
    }
  }, [searchQuery]);

  const fetchCatalog = useCallback(() => {
    setLoading(true);
    ApiService.getCatalog({
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
  }, [mediaType, category, year, search, sortBy, sortOrder, page]);

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
    <div className="pb-6 sm:pb-8">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
          {category ? category : mediaType === 'series' ? 'TV & Web Series' : 'BDStream Unified Media Catalog'}
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Indexed from DhakaFlix, CinePlex BD & BAS Play (10.20.30.40)
        </p>
      </div>

      <FilterBar
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
