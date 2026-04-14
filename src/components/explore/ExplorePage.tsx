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

const heroBackgroundImage = 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1800&q=80';

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
    <div className="bg-[linear-gradient(180deg,#eff4f8_0%,#f8fafc_18%,#ffffff_36%,#ffffff_100%)] pb-12 md:pb-14">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-x-0 inset-y-[-8%] scale-[1.015] opacity-100"
            style={{
              backgroundImage: `url(${heroBackgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(1.5px) saturate(0.98) contrast(1.02)',
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,252,0.84)_0%,rgba(248,250,252,0.76)_36%,rgba(248,250,252,0.46)_68%,rgba(248,250,252,0.6)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(248,250,252,0.12)_62%,rgba(255,255,255,0.36)_100%)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[68.75rem] px-5 pb-7 pt-8 sm:px-6 md:px-8 md:pb-8 md:pt-10 lg:pb-9 lg:pt-12">
          <ExploreHero
            searchValue={searchInput}
            locationSuggestions={locationSuggestions}
            onSearchChange={handleSearchChange}
            onSearchSubmit={applySearch}
            onSearchSubmitValue={applySearchValue}
            onLocationSelect={handleLocationSelect}
          />
        </div>
      </section>

      <div className="mx-auto w-full max-w-[68.75rem] px-5 sm:px-6 md:px-8">
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

      <div className="mx-auto w-full max-w-[68.75rem] px-5 pt-4 sm:px-6 md:px-8 md:pt-5">
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
    </div>
  );
};

export default ExplorePage;