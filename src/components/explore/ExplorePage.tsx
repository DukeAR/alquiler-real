import { useEffect, useMemo, useRef, useState } from 'react';
import { apiJson } from '../../lib/apiConfig';
import { useFavorites } from '../../hooks/useFavorites';
import type { Property } from '../../services/geminiService';
import {
  buildPropertyCatalogSections,
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
  checkIn: '',
  checkOut: '',
  guests: '1',
  verifiedOnly: false,
};

type AvailabilityRange = {
  start: string;
  end: string;
};

const normalizePropertyVerificationDefaults = (property: Property) => {
  const isPresentiallyVerified = Boolean(
    property.hasPresencialVerification
    || property.isPresentiallyVerified
    || property.onsiteVerifiedAt
    || property.verificationLevel === 'presencial',
  );
  const isIdentityVerified = Boolean(
    isPresentiallyVerified
    || property.identityValidated
    || property.isIdentityVerified
    || property.verificationLevel === 'identity',
  );
  const verificationLevel: Property['verificationLevel'] = isPresentiallyVerified
    ? 'presencial'
    : isIdentityVerified
      ? 'identity'
      : 'none';

  return {
    ...property,
    identityValidated: isIdentityVerified,
    hasPresencialVerification: isPresentiallyVerified,
    verificationLevel,
    isIdentityVerified,
    isPresentiallyVerified,
  };
};

const normalizeExploreProperties = (items: Array<Property | null | undefined>) => items.reduce<Property[]>((accumulator, property) => {
  if (!property) {
    return accumulator;
  }

  accumulator.push(normalizePropertyVerificationDefaults(property));
  return accumulator;
}, []);

const normalizeAvailabilityDate = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : null;
};

const normalizeAvailabilityRanges = (items: unknown[]) => items.reduce<AvailabilityRange[]>((accumulator, item) => {
  if (!item || typeof item !== 'object') {
    return accumulator;
  }

  const range = item as { start?: unknown; end?: unknown };
  const start = normalizeAvailabilityDate(range.start);
  const end = normalizeAvailabilityDate(range.end) ?? start;

  if (!start || !end) {
    return accumulator;
  }

  accumulator.push(end < start ? { start: end, end: start } : { start, end });
  return accumulator;
}, []);

const isPropertyAvailableForRange = (ranges: AvailabilityRange[], checkIn: string, checkOut: string) => (
  !ranges.some((range) => checkIn < range.end && checkOut > range.start)
);

const hasCatalogSuggestionContext = (filters: ExploreFilters, searchQuery: string) => (
  !searchQuery &&
  !filters.checkIn &&
  !filters.checkOut &&
  filters.guests === defaultFilters.guests &&
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
  const normalizedInitialProperties = useMemo(
    () => normalizeExploreProperties(initialProperties),
    [initialProperties],
  );
  const [properties, setProperties] = useState<Property[]>(normalizedInitialProperties);
  const [verificationPreference, setVerificationPreference] = useState(() => getVerificationPreferenceState());
  const [loading, setLoading] = useState(() => !disableAutoLoad);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [sortBy, setSortBy] = useState<ExploreSort>('verification');
  const [visibleCount, setVisibleCount] = useState(9);
  const [filters, setFilters] = useState<ExploreFilters>(defaultFilters);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availablePropertyIds, setAvailablePropertyIds] = useState<Set<string> | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>(() => {
    if (initialLocationSuggestions) {
      return initialLocationSuggestions;
    }

    return buildLocationSuggestions(normalizedInitialProperties);
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const availabilityCacheRef = useRef(new Map<string, AvailabilityRange[] | null>());

  useEffect(() => {
    if (disableAutoLoad) {
      setLoading(false);

      if (initialLocationSuggestions) {
        setLocationSuggestions(initialLocationSuggestions);
      } else if (normalizedInitialProperties.length > 0) {
        setLocationSuggestions(buildLocationSuggestions(normalizedInitialProperties));
      }

      return;
    }

    const fetchProperties = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const params = new URLSearchParams();
        if (filters.guests) params.append('guests', filters.guests);
        if (filters.verifiedOnly) params.append('verifiedOnly', 'true');
        if (searchQuery) params.append('location', searchQuery);

        const data = await apiJson<Array<Property | null | undefined>>(`/api/properties?${params.toString()}`);
        const nextProperties = normalizeExploreProperties(Array.isArray(data) ? data : []);
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
  }, [disableAutoLoad, filters, initialLocationSuggestions, normalizedInitialProperties, refreshToken, searchQuery]);

  useEffect(() => {
    setVisibleCount(9);
  }, [filters, searchQuery, sortBy]);

  const shouldFilterByDates = Boolean(filters.checkIn && filters.checkOut && filters.checkOut > filters.checkIn);
  const hasActiveFilters = Boolean(
    searchQuery
    || filters.checkIn
    || filters.checkOut
    || filters.guests !== defaultFilters.guests
    || filters.verifiedOnly
  );
  const sortContext = useMemo(() => ({ searchQuery, filters }), [searchQuery, filters]);
  const orderedProperties = useMemo(
    () => sortPropertiesByCatalogOrder(properties, sortBy, sortContext),
    [properties, sortBy, sortContext],
  );
  const verificationFilteredProperties = useMemo(
    () => filters.verifiedOnly
      ? orderedProperties.filter((property) => meetsRealVerificationFilter(property))
      : orderedProperties,
    [filters.verifiedOnly, orderedProperties],
  );

  useEffect(() => {
    if (!shouldFilterByDates) {
      setAvailabilityLoading(false);
      setAvailablePropertyIds(null);
      return;
    }

    let cancelled = false;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailablePropertyIds(null);

      const missingProperties = verificationFilteredProperties.filter((property) => !availabilityCacheRef.current.has(property.id));

      if (missingProperties.length > 0) {
        await Promise.allSettled(missingProperties.map(async (property) => {
          try {
            const response = await apiJson<unknown[]>(`/api/properties/${property.id}/availability`);
            availabilityCacheRef.current.set(property.id, normalizeAvailabilityRanges(Array.isArray(response) ? response : []));
          } catch (error) {
            console.error(error);
            availabilityCacheRef.current.set(property.id, null);
          }
        }));
      }

      if (cancelled) {
        return;
      }

      const nextAvailablePropertyIds = verificationFilteredProperties.reduce((accumulator, property) => {
        const availabilityRanges = availabilityCacheRef.current.get(property.id);

        if (availabilityRanges === undefined || availabilityRanges === null || isPropertyAvailableForRange(availabilityRanges, filters.checkIn, filters.checkOut)) {
          accumulator.add(property.id);
        }

        return accumulator;
      }, new Set<string>());

      setAvailablePropertyIds(nextAvailablePropertyIds);
      setAvailabilityLoading(false);
    };

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [filters.checkIn, filters.checkOut, shouldFilterByDates, verificationFilteredProperties]);

  const filteredProperties = useMemo(
    () => shouldFilterByDates && availablePropertyIds
      ? verificationFilteredProperties.filter((property) => availablePropertyIds.has(property.id))
      : verificationFilteredProperties,
    [availablePropertyIds, shouldFilterByDates, verificationFilteredProperties],
  );
  const showSectionedCatalog = viewMode === 'grid' && !filters.verifiedOnly && !hasActiveFilters;
  const sectionedCatalog = useMemo(
    () => showSectionedCatalog ? buildPropertyCatalogSections(filteredProperties, sortBy, sortContext) : null,
    [filteredProperties, showSectionedCatalog, sortBy, sortContext],
  );
  const featuredProperties = sectionedCatalog?.topVerified ?? [];
  const identityValidatedProperties = sectionedCatalog?.identityValidated ?? [];
  const nearSeaProperties = sectionedCatalog?.nearSea ?? [];
  const largeGroupProperties = sectionedCatalog?.largeGroups ?? [];
  const newlyListedProperties = sectionedCatalog?.newListings ?? [];
  const appliedFilterCount = [
    Boolean(searchQuery),
    Boolean(filters.checkIn || filters.checkOut),
    filters.guests !== defaultFilters.guests,
    filters.verifiedOnly,
  ].filter(Boolean).length;
  const listingProperties = sectionedCatalog?.comparison ?? filteredProperties;
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
          filters={filters}
          availabilityFiltering={shouldFilterByDates}
          loading={loading || availabilityLoading}
          loadError={loadError}
          viewMode={viewMode}
          sortBy={sortBy}
          verifiedOnly={filters.verifiedOnly}
          caresAboutVerification={verificationPreference.caresAboutVerification}
          hasActiveFilters={hasActiveFilters}
          searchQuery={searchQuery}
          appliedFilterCount={appliedFilterCount}
          filteredProperties={filteredProperties}
          showSectionedCatalog={showSectionedCatalog}
          featuredProperties={featuredProperties}
          identityValidatedProperties={identityValidatedProperties}
          nearSeaProperties={nearSeaProperties}
          largeGroupProperties={largeGroupProperties}
          newlyListedProperties={newlyListedProperties}
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