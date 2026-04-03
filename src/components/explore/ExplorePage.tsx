import { useEffect, useState } from 'react';
import { apiJson } from '../../lib/apiConfig';
import { useFavorites } from '../../hooks/useFavorites';
import type { Property } from '../../services/geminiService';
import type { LocationSuggestion } from '../LocationAutocomplete';
import { ExploreFiltersBar, type ExploreFilters, type ExploreSort } from './ExploreFiltersBar';
import { ExploreHero } from './ExploreHero';
import { ExploreResultsSection } from './ExploreResultsSection';

const defaultFilters: ExploreFilters = {
  minPrice: '',
  maxPrice: '',
  guests: '1',
  type: '',
  verifiedOnly: false,
};

const hasCatalogSuggestionContext = (filters: ExploreFilters, searchQuery: string) => (
  !searchQuery &&
  !filters.minPrice &&
  !filters.maxPrice &&
  !filters.type &&
  !filters.verifiedOnly
);

const buildLocationSuggestions = (items: Property[]): LocationSuggestion[] => {
  const locations = new Map<string, LocationSuggestion>();

  items.forEach((property) => {
    const rawLocation = property.location?.trim();
    if (!rawLocation) {
      return;
    }

    const [name, ...regionParts] = rawLocation
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const key = rawLocation.toLowerCase();
    const current = locations.get(key);

    if (current) {
      current.propertyCount += 1;
      return;
    }

    locations.set(key, {
      id: `location-${key.replace(/[^a-z0-9]+/g, '-')}`,
      name: name || rawLocation,
      region: regionParts.join(', ') || undefined,
      propertyCount: 1,
    });
  });

  return Array.from(locations.values()).sort((left, right) => {
    if (right.propertyCount !== left.propertyCount) {
      return right.propertyCount - left.propertyCount;
    }

    return left.name.localeCompare(right.name, 'es');
  });
};

const getFeaturedPropertyScore = (property: Property) => {
  const ratingScore = Number(property.rating || 0) * 12;
  const reviewScore = Math.min(Number(property.reviewsCount || 0), 18);
  const consistencyScore = Math.min(Number(property.historicalConsistency || 0) / 5, 18);
  const experienceScore = Math.min(Number(property.hostExperienceYears || 0) * 1.5, 12);
  const verificationScore = [
    property.identityValidated,
    property.locationVerified,
    property.videoValidated,
    property.isVerifiedProperty,
    property.hasDigitalVerification,
    property.hasPresencialVerification,
  ].filter(Boolean).length * 8;
  const penalty = Number(property.unresolvedReviewsCount || 0) * 18;

  return ratingScore + reviewScore + consistencyScore + experienceScore + verificationScore - penalty;
};

const sortProperties = (items: Property[], sortBy: ExploreSort) => {
  const sortedItems = [...items];

  sortedItems.sort((left, right) => {
    if (sortBy === 'price-asc') {
      const priceDifference = Number(left.price || 0) - Number(right.price || 0);
      if (priceDifference !== 0) {
        return priceDifference;
      }

      return Number(right.rating || 0) - Number(left.rating || 0);
    }

    if (sortBy === 'rating') {
      const ratingDifference = Number(right.rating || 0) - Number(left.rating || 0);
      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      return Number(right.reviewsCount || 0) - Number(left.reviewsCount || 0);
    }

    const scoreDifference = getFeaturedPropertyScore(right) - getFeaturedPropertyScore(left);
    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    const ratingDifference = Number(right.rating || 0) - Number(left.rating || 0);
    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    return Number(right.reviewsCount || 0) - Number(left.reviewsCount || 0);
  });

  return sortedItems;
};

export const ExplorePage = () => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<ExploreSort>('recommended');
  const [visibleCount, setVisibleCount] = useState(9);
  const [filters, setFilters] = useState<ExploreFilters>(defaultFilters);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const params = new URLSearchParams();
        if (filters.minPrice) params.append('minPrice', filters.minPrice);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.guests) params.append('guests', filters.guests);
        if (filters.type) params.append('type', filters.type);
        if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
        if (searchQuery) params.append('location', searchQuery);

        const data = await apiJson<Property[]>(`/api/properties?${params.toString()}`);
        const nextProperties = data || [];
        setProperties(nextProperties);

        if (hasCatalogSuggestionContext(filters, searchQuery)) {
          setLocationSuggestions(buildLocationSuggestions(nextProperties));
        } else {
          setLocationSuggestions((current) => current.length > 0 ? current : buildLocationSuggestions(nextProperties));
        }
      } catch (error) {
        console.error(error);
        setLoadError(error instanceof Error ? error.message : 'No pudimos actualizar los alojamientos ahora.');
      } finally {
        setLoading(false);
      }
    };

    void fetchProperties();
  }, [filters, refreshToken, searchQuery]);

  useEffect(() => {
    setVisibleCount(9);
  }, [filters, searchQuery, sortBy]);

  const featuredProperties = sortProperties(properties, 'recommended')
    .slice(0, 3);
  const orderedProperties = sortProperties(properties, sortBy);

  const featuredIds = new Set(featuredProperties.map((property) => property.id));
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
    ? orderedProperties
    : orderedProperties.filter((property) => !featuredIds.has(property.id));
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
          searchValue={searchInput}
          locationSuggestions={locationSuggestions}
          onSearchChange={handleSearchChange}
          onSearchSubmit={applySearch}
          onSearchSubmitValue={applySearchValue}
          onLocationSelect={handleLocationSelect}
        />

        <ExploreFiltersBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onFiltersChange={setFilters}
          hasActiveFilters={hasActiveFilters}
          onClear={clearAllFilters}
        />

        <ExploreResultsSection
          loading={loading}
          loadError={loadError}
          viewMode={viewMode}
          hasActiveFilters={hasActiveFilters}
          searchQuery={searchQuery}
          appliedFilterCount={appliedFilterCount}
          filteredProperties={properties}
          featuredProperties={featuredProperties}
          listingProperties={listingProperties}
          visibleProperties={visibleProperties}
          hasMoreResults={hasMoreResults}
          onLoadMore={() => setVisibleCount((current) => current + 9)}
          onRetry={() => setRefreshToken((current) => current + 1)}
          onClearFilters={clearAllFilters}
          onFavoriteToggle={toggleFavorite}
          isFavorite={isFavorite}
        />
      </main>
    </div>
  );
};

export default ExplorePage;