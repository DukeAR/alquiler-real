import { useEffect, useState } from 'react';
import { apiJson } from '../../lib/apiConfig';
import { useFavorites } from '../../hooks/useFavorites';
import type { Property } from '../../services/geminiService';
import { meetsRealVerificationFilter, sortPropertiesByCatalogOrder } from '../../lib/propertyVerification';
import {
  getVerificationPreferenceState,
  trackVerificationPreferenceSave,
} from '../../lib/verificationPreference';
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

export const ExplorePage = () => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const [properties, setProperties] = useState<Property[]>([]);
  const [verificationPreference, setVerificationPreference] = useState(() => getVerificationPreferenceState());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<ExploreSort>('verification');
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
        setLoadError('No hay resultados disponibles ahora.');
      } finally {
        setLoading(false);
      }
    };

    void fetchProperties();
  }, [filters, refreshToken, searchQuery]);

  useEffect(() => {
    setVisibleCount(9);
  }, [filters, searchQuery, sortBy]);

  const sortContext = { searchQuery, filters };

  const featuredProperties = sortPropertiesByCatalogOrder(properties, 'verification', sortContext)
    .filter((property) => meetsRealVerificationFilter(property))
    .slice(0, 3);
  const orderedProperties = sortPropertiesByCatalogOrder(properties, sortBy, sortContext);

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

  const handleFavoriteToggle = async (propertyId: string, nextFavoriteState: boolean) => {
    const result = await toggleFavorite(propertyId);

    if (!nextFavoriteState || (result !== 'added' && result !== 'pending-add')) {
      return;
    }

    const property = properties.find((item) => item.id === propertyId);

    if (!property) {
      return;
    }

    setVerificationPreference(trackVerificationPreferenceSave(property));
  };

  return (
    <div className="bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_18%,#ffffff_18%,#ffffff_100%)] pb-28">
      <section className="relative">
        <div className="app-page py-6 md:py-8 lg:py-10">
          <div className="space-y-8 md:space-y-10 lg:space-y-12">
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
          </div>
        </div>
      </section>

      <section className="bg-white pt-12 md:pt-16">
        <div className="app-page">
          <ExploreResultsSection
            loading={loading}
            loadError={loadError}
            viewMode={viewMode}
            sortBy={sortBy}
            caresAboutVerification={verificationPreference.caresAboutVerification}
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
            onFavoriteToggle={handleFavoriteToggle}
            isFavorite={isFavorite}
          />
        </div>
      </section>
    </div>
  );
};

export default ExplorePage;