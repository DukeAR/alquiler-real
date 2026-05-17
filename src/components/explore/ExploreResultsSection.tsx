import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../EmptyState';
import { Icons } from '../Icons';
import { PropertyCard } from '../PropertyCard';
import { SkeletonCard } from '../SkeletonCard';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { NoticeBanner } from '../ui/NoticeBanner';
import { SectionTitle } from '../ui/SectionTitle';
import {
  getPropertyVerificationGuidanceLabel,
  type PropertyCatalogSort,
} from '../../lib/propertyVerification';
import type { Property } from '../../services/geminiService';
import { cn } from '../../lib/utils';
import type { ExploreFilters } from './ExploreFiltersBar';

const LazyPropertyMap = lazy(() => import('../PropertyMap').then((module) => ({ default: module.PropertyMap })));

const MapFallback = () => (
  <div className="flex h-full min-h-[300px] items-center justify-center bg-slate-50 md:min-h-[500px]">
    <Icons.Loader2 className="h-8 w-8 animate-spin text-brand" />
  </div>
);

const formatPropertyCount = (count: number) => `${count} ${count === 1 ? 'propiedad' : 'propiedades'}`;
const renderSkeletons = (count = 6) => Array.from({ length: count }, (_, index) => <SkeletonCard key={`skeleton-${index}`} />);
const sectionMetadataBadgeClass = 'inline-flex items-center gap-1.5 rounded-full border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-[10.75px] font-medium text-slate-600';

type SectionHeaderWithBadgeProps = {
  eyebrow?: React.ReactNode;
  heading?: React.ReactNode;
  description?: React.ReactNode;
  badge: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  headingClassName?: string;
  descriptionClassName?: string;
};

const SectionHeaderWithBadge = ({
  eyebrow,
  heading,
  description,
  badge,
  actions,
  className,
  headingClassName,
  descriptionClassName,
}: SectionHeaderWithBadgeProps) => (
  <div className={cn('space-y-3', className)}>
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="grid gap-1.5">
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p> : null}
          {heading ? <h2 className={cn('app-title-2 text-slate-950', headingClassName)}>{heading}</h2> : null}
        </div>
      </div>

      <div className="justify-self-end">{badge}</div>
    </div>

    {description ? <p className={cn('text-sm leading-6 text-slate-600', descriptionClassName)}>{description}</p> : null}
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

const getActiveSortLabel = (sortBy: PropertyCatalogSort) => {
  if (sortBy === 'price') {
    return 'Precio más bajo primero';
  }

  if (sortBy === 'price-desc') {
    return 'Precio más alto primero';
  }

  return 'Más verificadas primero';
};

const getVerificationFilterContextCopy = (verifiedOnly: boolean) => {
  if (verifiedOnly) {
    return {
      title: 'Mostrando solo propiedades verificadas presencialmente',
      description: 'Identidad, ubicación y acceso confirmados',
    };
  }

  return {
    title: 'Mostrando todas las propiedades',
    description: 'Algunas pueden no estar verificadas',
  };
};

const formatDateFilterLabel = (value: string) => {
  const parts = value.split('-');

  if (parts.length !== 3) {
    return value;
  }

  const [, month, day] = parts;
  return `${day}/${month}`;
};

const getDateRangeFilterLabel = (filters: ExploreFilters) => {
  if (filters.checkIn && filters.checkOut) {
    return `${formatDateFilterLabel(filters.checkIn)} al ${formatDateFilterLabel(filters.checkOut)}`;
  }

  if (filters.checkIn) {
    return `Desde ${formatDateFilterLabel(filters.checkIn)}`;
  }

  if (filters.checkOut) {
    return `Hasta ${formatDateFilterLabel(filters.checkOut)}`;
  }

  return null;
};

const getGuestsFilterLabel = (guests: string) => {
  if (guests === '10') {
    return '10 o más huéspedes';
  }

  const count = Number(guests);

  if (!Number.isFinite(count) || count < 1) {
    return null;
  }

  return `${count} ${count === 1 ? 'huésped' : 'huéspedes'}`;
};

const getResultsEmptyStateCopy = ({
  verifiedOnly,
  searchQuery,
  filters,
  availabilityFiltering,
}: {
  verifiedOnly: boolean;
  searchQuery: string;
  filters: ExploreFilters;
  availabilityFiltering: boolean;
}) => {
  if (verifiedOnly) {
    return {
      title: searchQuery
        ? 'No encontramos propiedades con verificación presencial en esta zona todavía.'
        : 'No encontramos propiedades con verificación presencial para esta búsqueda.',
      description: availabilityFiltering
        ? 'Probá ampliar la zona, cambiar las fechas o desactivar el filtro de verificación presencial.'
        : 'Probá ampliar la zona o desactivar el filtro de verificación presencial.',
    };
  }

  if (availabilityFiltering) {
    return {
      title: 'No encontramos disponibilidad para esas fechas.',
      description: searchQuery
        ? 'Probá ampliar la zona o mover el rango para ver más opciones disponibles.'
        : 'Probá cambiar el rango o limpiar los filtros para ver otras opciones.',
    };
  }

  if (filters.guests !== '1') {
    return {
      title: `No encontramos opciones para ${getGuestsFilterLabel(filters.guests) ?? 'ese grupo'}.`,
      description: 'Probá ampliar la zona o bajar la cantidad de huéspedes para sumar alternativas.',
    };
  }

  return {
    title: 'No encontramos propiedades para esa zona',
    description: 'Probá con otra zona o limpiá los filtros.',
  };
};

type ExploreResultsSectionProps = {
  loading: boolean;
  filters: ExploreFilters;
  availabilityFiltering: boolean;
  loadError: string | null;
  viewMode: 'grid' | 'map';
  sortBy: PropertyCatalogSort;
  verifiedOnly: boolean;
  caresAboutVerification: boolean;
  hasActiveFilters: boolean;
  searchQuery: string;
  appliedFilterCount: number;
  filteredProperties: Property[];
  showSectionedCatalog: boolean;
  featuredProperties: Property[];
  identityValidatedProperties: Property[];
  nearSeaProperties: Property[];
  largeGroupProperties: Property[];
  newlyListedProperties: Property[];
  listingProperties: Property[];
  visibleProperties: Property[];
  hasMoreResults: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onClearFilters: () => void;
  onFavoriteToggle: (propertyId: string, isFavorite: boolean) => void | Promise<unknown>;
  isFavorite: (propertyId: string) => boolean;
  onPropertyClick?: (property: Property) => void;
};

export const ExploreResultsSection = ({
  loading,
  filters,
  availabilityFiltering,
  loadError,
  viewMode,
  sortBy,
  verifiedOnly,
  caresAboutVerification,
  hasActiveFilters,
  searchQuery,
  appliedFilterCount,
  filteredProperties,
  showSectionedCatalog,
  featuredProperties,
  identityValidatedProperties,
  nearSeaProperties,
  largeGroupProperties,
  newlyListedProperties,
  listingProperties,
  visibleProperties,
  hasMoreResults,
  onLoadMore,
  onRetry,
  onClearFilters,
  onFavoriteToggle,
  isFavorite,
  onPropertyClick,
}: ExploreResultsSectionProps) => {
  const navigate = useNavigate();
  const totalResults = filteredProperties.length;
  const visibleCount = visibleProperties.length;
  const remainingResults = Math.max(listingProperties.length - visibleCount, 0);
  const hasAnyResults = totalResults > 0;
  const failedToLoadResults = Boolean(loadError) && !loading && !hasAnyResults;
  const showingStaleResults = Boolean(loadError) && !loading && hasAnyResults;
  const showHomeBlocks = showSectionedCatalog && !hasActiveFilters && !verifiedOnly && viewMode === 'grid';
  const showSummaryCard = viewMode === 'map' || failedToLoadResults || (hasActiveFilters && !hasAnyResults);
  const useCompactWideCards = showHomeBlocks;
  const showListingHeader = !hasActiveFilters || loading || hasAnyResults;
  const sectionSpacingClass = showHomeBlocks ? 'space-y-5 md:space-y-6' : 'space-y-6 md:space-y-8';
  const listingSectionClass = 'space-y-5 md:space-y-6';
  const firstVisibleResult = (showHomeBlocks
    ? featuredProperties[0] ?? identityValidatedProperties[0] ?? nearSeaProperties[0] ?? largeGroupProperties[0] ?? listingProperties[0]
    : listingProperties[0]) ?? null;
  const activeSortLabel = getActiveSortLabel(sortBy);
  const verificationFilterContext = getVerificationFilterContextCopy(verifiedOnly);
  const emptyStateCopy = getResultsEmptyStateCopy({ verifiedOnly, searchQuery, filters, availabilityFiltering });
  const dateRangeFilterLabel = getDateRangeFilterLabel(filters);
  const guestsFilterLabel = filters.guests !== '1' ? getGuestsFilterLabel(filters.guests) : null;
  const highlightedVerificationResultId = !loading && sortBy === 'verification' && firstVisibleResult
    ? getPropertyVerificationGuidanceLabel(firstVisibleResult, { isTopResult: true })
      ? firstVisibleResult.id
      : null
    : null;
  const listingHeading = hasActiveFilters
    ? 'Resultados para revisar'
    : activeSortLabel;
  const listingDescription = loading
    ? availabilityFiltering
      ? 'Revisando disponibilidad real para esas fechas.'
      : 'Actualizando resultados.'
    : hasActiveFilters
      ? availabilityFiltering
        ? `${formatPropertyCount(listingProperties.length)} disponibles para esas fechas.`
        : `${formatPropertyCount(listingProperties.length)} en esta búsqueda.`
      : listingProperties.length > 0
        ? sortBy === 'verification'
          ? 'Las propiedades con mayor verificación aparecen primero.'
          : sortBy === 'price'
            ? 'Las opciones más accesibles aparecen primero.'
            : 'Las opciones de mayor precio aparecen primero.'
        : 'No hay más propiedades por ahora.';
  const filteredResultsDescription = availabilityFiltering
    ? `${formatPropertyCount(totalResults)} disponibles para esas fechas.`
    : `${formatPropertyCount(totalResults)} en esta búsqueda.`;
  const filteredVisibleResultsLabel = `${visibleCount} ${visibleCount === 1 ? 'visible' : 'visibles'} en esta búsqueda.`;
  const homeHasResults = featuredProperties.length > 0
    || identityValidatedProperties.length > 0
    || nearSeaProperties.length > 0
    || largeGroupProperties.length > 0
    || listingProperties.length > 0
    || newlyListedProperties.length > 0;

  const handlePropertyClick = (property: Property) => {
    if (onPropertyClick) {
      onPropertyClick(property);
      return;
    }

    navigate(`/detail/${property.id}`);
  };

  const handlePropertyClickById = (propertyId: string) => {
    const property = filteredProperties.find((item) => item.id === propertyId);

    if (!property) {
      navigate(`/detail/${propertyId}`);
      return;
    }

    handlePropertyClick(property);
  };

  const renderPropertyCards = (
    properties: Property[],
    options?: {
      density?: 'default' | 'compact';
      highlightPropertyId?: string | null;
    },
  ) => properties.map((property) => (
    <PropertyCard
      key={property.id}
      property={property}
      density={options?.density ?? (useCompactWideCards ? 'compact' : 'default')}
      verificationGuidanceLabel={sortBy === 'verification'
        ? getPropertyVerificationGuidanceLabel(property, {
            isTopResult: options?.highlightPropertyId === property.id,
          })
        : null}
      emphasizeVerification={caresAboutVerification}
      decisionFeatured={options?.highlightPropertyId === property.id}
      decisionSupportLabel={null}
      onClick={() => handlePropertyClick(property)}
      isFavorite={isFavorite(property.id)}
      onFavoriteToggle={onFavoriteToggle}
    />
  ));

  const summaryEyebrow = viewMode === 'map'
    ? 'Mapa'
    : 'Resultados';

  const summaryHeading = loading
    ? 'Actualizando resultados'
    : failedToLoadResults
      ? 'No pudimos cargar resultados ahora.'
    : hasActiveFilters
      ? hasAnyResults
        ? 'Resultados para revisar'
        : 'No encontramos coincidencias'
      : hasAnyResults
          ? 'Avisos para revisar'
        : 'No hay propiedades disponibles ahora.';

  const summaryDescription = loading
    ? availabilityFiltering
      ? 'Estamos comparando las fechas elegidas con la disponibilidad real de cada aviso.'
      : 'Actualizando resultados.'
    : failedToLoadResults
      ? 'Probá con otra zona o volvé a intentar en unos segundos.'
    : hasActiveFilters
      ? hasAnyResults
        ? filteredResultsDescription
        : emptyStateCopy.description
      : hasAnyResults
        ? `${formatPropertyCount(totalResults)} para revisar.`
        : 'Volvé a revisar más tarde.';

  const summaryCountBadge = (
    <Badge variant="neutral" size="sm" className={sectionMetadataBadgeClass}>
      <Icons.Home className="h-3.5 w-3.5" />
      <span>{formatPropertyCount(totalResults)}</span>
    </Badge>
  );

  const mapResultsCountBadge = (
    <Badge variant="neutral" size="sm" className={sectionMetadataBadgeClass}>
      <Icons.Target className="h-3.5 w-3.5" />
      <span>{formatPropertyCount(totalResults)}</span>
    </Badge>
  );

  const summaryMetaBadges = [
    searchQuery ? (
      <Badge key="search" variant="info" size="sm" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.75px] font-medium">
        <Icons.MapPin className="h-3.5 w-3.5" />
        <span>{searchQuery}</span>
      </Badge>
    ) : null,
    dateRangeFilterLabel ? (
      <Badge key="dates" variant="neutral" size="sm" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.75px] font-medium">
        <Icons.Calendar className="h-3.5 w-3.5" />
        <span>{dateRangeFilterLabel}</span>
      </Badge>
    ) : null,
    guestsFilterLabel ? (
      <Badge key="guests" variant="neutral" size="sm" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.75px] font-medium">
        <Icons.Users className="h-3.5 w-3.5" />
        <span>{guestsFilterLabel}</span>
      </Badge>
    ) : null,
    appliedFilterCount > 0 ? (
      <Badge key="filters" variant="brand" size="sm" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.75px] font-medium">
        <Icons.SlidersHorizontal className="h-3.5 w-3.5" />
        <span>{appliedFilterCount} {appliedFilterCount === 1 ? 'filtro activo' : 'filtros activos'}</span>
      </Badge>
    ) : null,
  ].filter(Boolean);

  const filteredResultsMeta = [
    searchQuery ? (
      <span key="search" className="inline-flex items-center gap-1.5">
        <Icons.MapPin className="h-3.5 w-3.5 text-slate-400" />
        <span>{searchQuery}</span>
      </span>
    ) : null,
    dateRangeFilterLabel ? (
      <span key="dates" className="inline-flex items-center gap-1.5">
        <Icons.Calendar className="h-3.5 w-3.5 text-slate-400" />
        <span>{dateRangeFilterLabel}</span>
      </span>
    ) : null,
    guestsFilterLabel ? (
      <span key="guests" className="inline-flex items-center gap-1.5">
        <Icons.Users className="h-3.5 w-3.5 text-slate-400" />
        <span>{guestsFilterLabel}</span>
      </span>
    ) : null,
    <span key="sort" className="inline-flex items-center gap-1.5">
      <Icons.Target className="h-3.5 w-3.5 text-slate-400" />
      <span>{activeSortLabel}</span>
    </span>,
    appliedFilterCount > 0 ? (
      <span key="filters" className="inline-flex items-center gap-1.5">
        <Icons.SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
        <span>{appliedFilterCount} {appliedFilterCount === 1 ? 'filtro activo' : 'filtros activos'}</span>
      </span>
    ) : null,
  ].filter(Boolean);

  const summaryCard = viewMode === 'map' ? (
    <Card className="rounded-[var(--app-radius-card)] border-slate-200/75 bg-white/88 px-5 py-4 shadow-none sm:px-6 sm:py-4.5">
      <SectionHeaderWithBadge
        eyebrow={summaryEyebrow}
        heading={summaryHeading}
        description={summaryDescription}
        badge={summaryCountBadge}
        actions={summaryMetaBadges.length > 0 ? <>{summaryMetaBadges}</> : undefined}
        className="max-w-none"
        descriptionClassName="max-w-prose"
      />

      {showingStaleResults ? (
        <NoticeBanner
          className="mt-4"
          tone="warning"
          heading="Mostrando la última versión disponible"
          description="Volvé a intentar en unos segundos si querés actualizar la información."
        />
      ) : null}
    </Card>
  ) : (
    <Card className="rounded-[var(--app-radius-card)] border-slate-200/70 bg-white/72 p-4 shadow-none sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <SectionTitle
          eyebrow={summaryEyebrow}
          heading={summaryHeading}
          description={summaryDescription}
          className="max-w-3xl"
        />

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Badge variant="neutral" size="md" className="gap-2">
            <Icons.Home className="h-3.5 w-3.5" />
            <span>{formatPropertyCount(totalResults)}</span>
          </Badge>
          {searchQuery ? (
            <Badge variant="info" size="md" className="gap-2">
              <Icons.MapPin className="h-3.5 w-3.5" />
              <span>{searchQuery}</span>
            </Badge>
          ) : null}
          {appliedFilterCount > 0 ? (
            <Badge variant="brand" size="md" className="gap-2">
              <Icons.SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{appliedFilterCount} {appliedFilterCount === 1 ? 'filtro activo' : 'filtros activos'}</span>
            </Badge>
          ) : null}
        </div>
      </div>

      {showingStaleResults ? (
        <NoticeBanner
          className="mt-4"
          tone="warning"
          heading="Mostrando la última versión disponible"
          description="Volvé a intentar en unos segundos si querés actualizar la información."
        />
      ) : null}
    </Card>
  );

  if (failedToLoadResults) {
    return (
      <section className="space-y-6 md:space-y-8">
        <Card className="rounded-[var(--app-radius-card)] border-slate-200/70 bg-white/72 p-5 shadow-none sm:p-6">
          <NoticeBanner
            tone="error"
            heading="No pudimos cargar resultados ahora."
            description="Probá con otra zona o volvé a intentar en unos segundos."
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={onRetry}>
              <Icons.Loader2 className="h-4 w-4" />
              Volver a intentar
            </Button>
            {hasActiveFilters ? (
              <Button type="button" variant="secondary" onClick={onClearFilters}>
                <Icons.X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        </Card>
      </section>
    );
  }

  if (viewMode === 'map') {
    if (!loading && !hasAnyResults) {
      return (
        <section className="space-y-6 md:space-y-8">
          {summaryCard}
          <EmptyState
            eyebrow="Mapa"
            icon={<Icons.Map className="h-10 w-10 text-slate-400" />}
            title={hasActiveFilters ? 'No encontramos propiedades para esa zona' : 'No hay propiedades disponibles ahora.'}
            description={hasActiveFilters ? emptyStateCopy.description : 'Volvé a revisar más tarde.'}
            action={hasActiveFilters ? { label: 'Limpiar filtros', onClick: onClearFilters } : undefined}
          />
        </section>
      );
    }

    return (
      <section className="space-y-5 md:space-y-7">
        {summaryCard}

        <div className="overflow-hidden rounded-[var(--app-radius-display)] border border-slate-200/75 bg-white/88 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.2)]">
          <div className="border-b border-slate-200/70 px-5 py-4 sm:px-6 sm:py-4.5">
            <SectionHeaderWithBadge
              eyebrow="Mapa de resultados"
              description={loading
                ? 'Estamos ubicando cada aviso en el mapa.'
                : 'Abrí cada pin para ver título, precio, verificación y entrar al detalle.'}
              badge={mapResultsCountBadge}
              actions={hasActiveFilters ? (
                <Button type="button" variant="ghost" size="sm" onClick={onClearFilters} className="rounded-xl px-3 text-sm text-slate-900 hover:bg-slate-100 hover:text-slate-950">
                  <Icons.X className="h-4 w-4" />
                  Limpiar filtros
                </Button>
              ) : undefined}
            />
          </div>

          <div className="h-[520px] overflow-hidden bg-slate-50 md:h-[560px]">
            <Suspense fallback={<MapFallback />}>
              <LazyPropertyMap
                properties={filteredProperties}
                onPropertyClick={handlePropertyClickById}
              />
            </Suspense>
          </div>
        </div>
      </section>
    );
  }

  if (showHomeBlocks) {
    return (
      <section className={sectionSpacingClass}>
        {showingStaleResults ? (
          <NoticeBanner
            tone="warning"
            heading="Mostrando la última versión disponible"
            description="Volvé a intentar en unos segundos si querés actualizar los resultados."
          />
        ) : null}

        <div
          key="all-results"
          data-testid="explore-verification-context"
          aria-live="polite"
          className="results-filter-context-fade space-y-1 py-1"
        >
          <p className="text-[1rem] font-semibold leading-6 tracking-[-0.02em] text-slate-950">
            {verificationFilterContext.title}
          </p>
          <p className="text-[0.88rem] leading-5 text-slate-500">
            {verificationFilterContext.description}
          </p>
        </div>

        {loading ? (
          <section className="space-y-4 md:space-y-5">
            <SectionTitle
              heading="Más verificadas primero"
              description="Estamos ordenando el catálogo para mostrar primero las opciones con más respaldo."
              className="max-w-2xl"
            />
            <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {renderSkeletons()}
            </div>
          </section>
        ) : !homeHasResults ? (
          <EmptyState
            tone="soft"
            eyebrow="Resultados"
            icon={<Icons.Search className="h-10 w-10 text-slate-400" />}
            title="No hay propiedades disponibles ahora"
            description="Volvé a revisar más tarde para ver nuevas opciones."
          />
        ) : (
          <>
            {featuredProperties.length > 0 ? (
              <section className="space-y-4 md:space-y-5">
                <SectionTitle
                  heading="Más verificadas primero"
                  description="Propiedades con verificación presencial y señales más sólidas de confianza."
                  className="max-w-2xl"
                />
                <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {renderPropertyCards(featuredProperties, {
                    density: 'compact',
                    highlightPropertyId: highlightedVerificationResultId,
                  })}
                </div>
              </section>
            ) : null}

            {identityValidatedProperties.length > 0 ? (
              <section className="space-y-4 md:space-y-5">
                <SectionTitle
                  heading="Opciones con identidad validada"
                  description="Avisos donde ya validamos quién publica, aunque todavía no tengan verificación presencial."
                  className="max-w-2xl"
                />
                <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {renderPropertyCards(identityValidatedProperties, {
                    density: 'compact',
                  })}
                </div>
              </section>
            ) : null}

            {nearSeaProperties.length > 0 ? (
              <section className="space-y-4 md:space-y-5">
                <SectionTitle
                  heading="Cerca del mar"
                  description="Opciones ubicadas a pasos de playa, costanera o frente al mar para resolver rápido una escapada costera."
                  className="max-w-2xl"
                />
                <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {renderPropertyCards(nearSeaProperties, {
                    density: 'compact',
                  })}
                </div>
              </section>
            ) : null}

            {largeGroupProperties.length > 0 ? (
              <section className="space-y-4 md:space-y-5">
                <SectionTitle
                  heading="Para grupos grandes"
                  description="Lugares con espacio suficiente para viajes en grupo, familias grandes o escapadas compartidas."
                  className="max-w-2xl"
                />
                <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {renderPropertyCards(largeGroupProperties, {
                    density: 'compact',
                  })}
                </div>
              </section>
            ) : null}

            {listingProperties.length > 0 ? (
              <section className={listingSectionClass}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <SectionTitle
                      heading="Más para comparar"
                      description={sortBy === 'verification'
                        ? 'El resto del catálogo sigue ordenado por confianza para comparar con más contexto.'
                        : sortBy === 'price'
                          ? 'El resto del catálogo se ordena por precio más bajo sin perder sus señales de confianza.'
                          : 'El resto del catálogo se ordena por precio más alto sin perder sus señales de confianza.'}
                      className="max-w-2xl"
                    />
                  </div>

                  <p className="text-sm text-slate-500">
                    {remainingResults > 0
                      ? `Mostrando ${visibleCount}. Quedan ${remainingResults} para revisar.`
                      : `${visibleCount} visibles en esta búsqueda.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {renderPropertyCards(visibleProperties, {
                    density: 'default',
                  })}
                </div>

                {hasMoreResults ? (
                  <div className="flex flex-col items-center gap-4 pt-3 md:pt-4">
                    <p className="text-sm text-slate-500">Mostrando {visibleCount} de {listingProperties.length} propiedades.</p>
                    <Button type="button" variant="secondary" className="rounded-full px-6 md:px-8" onClick={onLoadMore}>
                      Ver más propiedades
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {newlyListedProperties.length > 0 ? (
              <section className="space-y-4 md:space-y-5">
                <SectionTitle
                  heading="Nuevas publicaciones"
                  description="Avisos recientes que mantienen el catálogo vivo sin duplicar lo que ya viste arriba."
                  className="max-w-2xl"
                />
                <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {renderPropertyCards(newlyListedProperties, {
                    density: 'default',
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}
      </section>
    );
  }

  return (
    <section className={sectionSpacingClass}>
      {showSummaryCard ? summaryCard : null}

      {showHomeBlocks && showingStaleResults ? (
        <NoticeBanner
          tone="warning"
          heading="Mostrando la última versión disponible"
          description="Volvé a intentar en unos segundos si querés actualizar los resultados."
        />
      ) : null}

      {loading || hasActiveFilters || listingProperties.length > 0 || !hasAnyResults ? (
        <section className={listingSectionClass}>
          <div
            key={verifiedOnly ? 'verified-only-results' : 'all-results'}
            data-testid="explore-verification-context"
            aria-live="polite"
            className="results-filter-context-fade space-y-1 py-1"
          >
            <p className="text-[1rem] font-semibold leading-6 tracking-[-0.02em] text-slate-950">
              {verificationFilterContext.title}
            </p>
            <p className="text-[0.88rem] leading-5 text-slate-500">
              {verificationFilterContext.description}
            </p>
          </div>

          {showListingHeader ? (
            <div className="space-y-3.5 border-b border-slate-200/70 pb-5 md:space-y-5">
              {hasActiveFilters && !loading && hasAnyResults ? (
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-4">
                  <div className="max-w-3xl space-y-2.5">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Resultados</p>
                      <h2 className="app-title-2 text-slate-950">Resultados para revisar</h2>
                    </div>

                    <div className="flex flex-col gap-2 text-sm leading-6 text-slate-600 md:flex-row md:flex-wrap md:items-center md:gap-x-3 md:gap-y-2">
                      <p>{filteredResultsDescription}</p>

                      {filteredResultsMeta.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-medium leading-5 text-slate-500">
                          {filteredResultsMeta}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-slate-500 md:justify-self-end md:text-right">
                    {filteredVisibleResultsLabel}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <SectionTitle
                      heading={listingHeading}
                      description={listingDescription}
                      className="max-w-2xl"
                    />
                  </div>

                  {!loading && listingProperties.length > 0 ? (
                    <p className="text-sm text-slate-500">
                      {remainingResults > 0
                        ? `Mostrando ${visibleCount}. Quedan ${remainingResults} para revisar.`
                        : `${visibleCount} visibles en esta búsqueda.`}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {hasActiveFilters && showingStaleResults ? (
            <NoticeBanner
              tone="warning"
              heading="Mostrando la última versión disponible"
              description="Volvé a intentar en unos segundos si querés actualizar los resultados."
            />
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {renderSkeletons()}
            </div>
          ) : listingProperties.length === 0 ? (
            <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              <div className="col-span-full">
                <EmptyState
                  tone={hasActiveFilters ? 'default' : 'soft'}
                  eyebrow="Resultados"
                  icon={<Icons.Search className="h-10 w-10 text-slate-400" />}
                  title={hasActiveFilters ? emptyStateCopy.title : 'No hay más propiedades por ahora'}
                  description={hasActiveFilters ? emptyStateCopy.description : 'Volvé a revisar más tarde para ver nuevas opciones.'}
                  action={hasActiveFilters ? { label: 'Limpiar filtros', onClick: onClearFilters } : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 auto-rows-fr items-stretch gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {renderPropertyCards(visibleProperties, {
                highlightPropertyId: highlightedVerificationResultId,
              })}
            </div>
          )}

          {!loading && hasMoreResults ? (
            <div className="flex flex-col items-center gap-4 pt-3 md:pt-4">
              <p className="text-sm text-slate-500">Mostrando {visibleCount} de {listingProperties.length} propiedades.</p>
              <Button type="button" variant="secondary" className="rounded-full px-6 md:px-8" onClick={onLoadMore}>
                Ver más propiedades
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
};

export default ExploreResultsSection;