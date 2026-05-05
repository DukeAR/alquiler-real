import { useEffect, useState } from 'react';
import { apiJson } from '../../lib/apiConfig';
import { useFavorites } from '../../hooks/useFavorites';
import type { Property } from '../../services/geminiService';
import {
  meetsRealVerificationFilter,
  sortPropertiesByCatalogOrder,
} from '../../lib/propertyVerification';
import {
  getVerificationPreferenceState,
  trackVerificationPreferenceSave,
} from '../../lib/verificationPreference';
import type { LocationSuggestion } from '../LocationAutocomplete';
import { ExploreFiltersBar, type ExploreFilters, type ExploreSort } from './ExploreFiltersBar';
import { ExploreHero } from './ExploreHero';
import { ExploreResultsSection } from './ExploreResultsSection';

type ExplorePageProps = {
  initialProperties?: Property[];
  initialLocationSuggestions?: LocationSuggestion[];
  disableAutoLoad?: boolean;
};

const EMPTY_INITIAL_PROPERTIES: Property[] = [];

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

export const buildLocationSuggestions = (items: Property[]): LocationSuggestion[] => {
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

export const ExplorePage = ({
  initialProperties = EMPTY_INITIAL_PROPERTIES,
  initialLocationSuggestions,
  disableAutoLoad = false,
}: ExplorePageProps = {}) => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [verificationPreference, setVerificationPreference] = useState(() => getVerificationPreferenceState());
  const [loading, setLoading] = useState(() => !disableAutoLoad);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<ExploreSort>('verification');
  const [visibleCount, setVisibleCount] = useState(9);
  const [filters, setFilters] = useState<ExploreFilters>(defaultFilters);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>(() => {
    if (initialLocationSuggestions) {
      return initialLocationSuggestions;
    }

    return buildLocationSuggestions(initialProperties);
  });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (disableAutoLoad) {
      setLoading(false);

      if (initialLocationSuggestions) {
        setLocationSuggestions(initialLocationSuggestions);
      } else if (initialProperties.length > 0) {
        setLocationSuggestions(buildLocationSuggestions(initialProperties));
      }

      return;
    }

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
  }, [disableAutoLoad, filters, initialLocationSuggestions, initialProperties, refreshToken, searchQuery]);

  useEffect(() => {
    setVisibleCount(9);
  }, [filters, searchQuery, sortBy]);

  const sortContext = { searchQuery, filters };
  const hasActiveFilters = Boolean(searchQuery || filters.minPrice || filters.maxPrice || filters.type || filters.verifiedOnly);
  const orderedProperties = sortPropertiesByCatalogOrder(properties, sortBy, sortContext);
  const filteredProperties = filters.verifiedOnly
    ? orderedProperties.filter((property) => meetsRealVerificationFilter(property))
    : orderedProperties;
  const featuredProperties: Property[] = [];
  const appliedFilterCount = [
    Boolean(searchQuery),
    Boolean(filters.minPrice),
    Boolean(filters.maxPrice),
    filters.guests !== defaultFilters.guests,
    Boolean(filters.type),
    filters.verifiedOnly,
  ].filter(Boolean).length;
  const listingProperties = filteredProperties;
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
    <div className="bg-[linear-gradient(180deg,#edf1f5_0%,#f3f5f8_20%,#f7f8fa_40%,#f5f7f9_100%)] pb-12 md:pb-14">
      <section>
        <div className="w-full">
          <ExploreHero
            backgroundImage={heroBackgroundImage}
            searchValue={searchInput}
            locationSuggestions={locationSuggestions}
            onSearchChange={handleSearchChange}
            onSearchSubmit={applySearch}
            onSearchSubmitValue={applySearchValue}
            onLocationSelect={handleLocationSelect}
          />
        </div>
      </section>

      <div className="app-page-explore mt-6">
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

      <div className="app-page-explore pt-4 md:pt-5">
        <ExploreResultsSection
          loading={loading}
          loadError={loadError}
          viewMode={viewMode}
          sortBy={sortBy}
          caresAboutVerification={verificationPreference.caresAboutVerification}
          hasActiveFilters={hasActiveFilters}
          searchQuery={searchQuery}
          appliedFilterCount={appliedFilterCount}
          filteredProperties={filteredProperties}
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