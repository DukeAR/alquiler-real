import { useEffect, useState } from 'react';
import { apiJson } from '../../lib/apiConfig';
import { useAuth } from '../../hooks/useAuth';
import { useFavorites } from '../../hooks/useFavorites';
import type { Property } from '../../services/geminiService';
import type { LocationSuggestion } from '../LocationAutocomplete';
import { ExploreFiltersBar, type ExploreFilters } from './ExploreFiltersBar';
import { ExploreHero } from './ExploreHero';
import { ExploreResultsSection } from './ExploreResultsSection';

const defaultFilters: ExploreFilters = {
  minPrice: '',
  maxPrice: '',
  guests: '1',
  type: '',
  verifiedOnly: false,
};

export const ExplorePage = () => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [visibleCount, setVisibleCount] = useState(9);
  const [filters, setFilters] = useState<ExploreFilters>(defaultFilters);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.minPrice) params.append('minPrice', filters.minPrice);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.guests) params.append('guests', filters.guests);
        if (filters.type) params.append('type', filters.type);
        if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
        if (searchQuery) params.append('location', searchQuery);

        const data = await apiJson<Property[]>(`/api/properties?${params.toString()}`);
        setProperties(data || []);
      } catch (error) {
        console.error(error);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchProperties();
  }, [filters, searchQuery]);

  useEffect(() => {
    setVisibleCount(9);
  }, [filters, searchQuery]);

  const topRated = [...properties]
    .sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0))
    .slice(0, 6);

  const featuredIds = new Set(topRated.map((property) => property.id));
  const hasActiveFilters = Boolean(searchQuery || filters.minPrice || filters.maxPrice || filters.type || filters.verifiedOnly);
  const appliedFilterCount = [
    Boolean(searchQuery),
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    filters.guests !== defaultFilters.guests,
    Boolean(filters.type),
    filters.verifiedOnly,
  ].filter(Boolean).length;
  const listingProperties = hasActiveFilters
    ? properties
    : properties.filter((property) => !featuredIds.has(property.id));
  const visibleProperties = listingProperties.slice(0, visibleCount);
  const hasMoreResults = visibleProperties.length < listingProperties.length;

  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const applySearchValue = (value: string) => {
    const normalizedValue = value.trim();
    setSearchInput(value);
    setSearchQuery(normalizedValue);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (!value.trim()) {
      setSearchQuery('');
    }
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    setSearchInput(location.name);
    setSearchQuery(location.name);
  };

  const clearAllFilters = () => {
    setFilters(defaultFilters);
    setSearchInput('');
    setSearchQuery('');
  };

  return (
    <div className="pb-28">
      <main className="app-page space-y-10 py-8 md:space-y-14 md:py-12">
        <ExploreHero
          user={user}
          searchValue={searchInput}
          onSearchChange={handleSearchChange}
          onSearchSubmit={applySearch}
          onSearchSubmitValue={applySearchValue}
          onLocationSelect={handleLocationSelect}
        />

        <ExploreFiltersBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          onFiltersChange={setFilters}
          hasActiveFilters={hasActiveFilters}
          onClear={clearAllFilters}
        />

        <ExploreResultsSection
          loading={loading}
          viewMode={viewMode}
          hasActiveFilters={hasActiveFilters}
          searchQuery={searchQuery}
          appliedFilterCount={appliedFilterCount}
          filteredProperties={properties}
          topRated={topRated}
          listingProperties={listingProperties}
          visibleProperties={visibleProperties}
          hasMoreResults={hasMoreResults}
          onLoadMore={() => setVisibleCount((current) => current + 9)}
          onClearFilters={clearAllFilters}
          onFavoriteToggle={toggleFavorite}
          isFavorite={isFavorite}
        />
      </main>
    </div>
  );
};

export default ExplorePage;