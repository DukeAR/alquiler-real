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

  if (sortBy === 'rating') {
    return 'Mejor calificación primero';
  }

  return 'Más verificados primero';
};

type ExploreResultsSectionProps = {
  loading: boolean;
  loadError: string | null;
  viewMode: 'grid' | 'map';
  sortBy: PropertyCatalogSort;
  caresAboutVerification: boolean;
  hasActiveFilters: boolean;
  searchQuery: string;
  appliedFilterCount: number;
  filteredProperties: Property[];
  featuredProperties: Property[];
  listingProperties: Property[];
  visibleProperties: Property[];
  hasMoreResults: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  onClearFilters: () => void;
  onFavoriteToggle: (propertyId: string, isFavorite: boolean) => void | Promise<unknown>;
  isFavorite: (propertyId: string) => boolean;
};

export const ExploreResultsSection = ({
  loading,
  loadError,
  viewMode,
  sortBy,
  caresAboutVerification,
  hasActiveFilters,
  searchQuery,
  appliedFilterCount,
  filteredProperties,
  featuredProperties,
  listingProperties,
  visibleProperties,
  hasMoreResults,
  onLoadMore,
  onRetry,
  onClearFilters,
  onFavoriteToggle,
  isFavorite,
}: ExploreResultsSectionProps) => {
  const navigate = useNavigate();
  const totalResults = filteredProperties.length;
  const visibleCount = visibleProperties.length;
  const remainingResults = Math.max(listingProperties.length - visibleCount, 0);
  const hasAnyResults = totalResults > 0;
  const failedToLoadResults = Boolean(loadError) && !loading && !hasAnyResults;
  const showingStaleResults = Boolean(loadError) && !loading && hasAnyResults;
  const showHomeBlocks = !hasActiveFilters && viewMode === 'grid';
  const showSummaryCard = viewMode === 'map' || failedToLoadResults || (hasActiveFilters && !hasAnyResults);
  const showFeaturedSection = showHomeBlocks && (loading || featuredProperties.length > 0);
  const showListingHeader = !hasActiveFilters || loading || hasAnyResults;
  const sectionSpacingClass = showHomeBlocks ? 'space-y-5 md:space-y-6' : 'space-y-6 md:space-y-8';
  const listingSectionClass = showFeaturedSection
    ? 'space-y-4 border-t border-slate-200/60 pt-4 md:space-y-5 md:pt-5'
    : 'space-y-5 md:space-y-6';
  const firstVisibleResult = (showFeaturedSection ? featuredProperties : listingProperties)[0] ?? null;
  const activeSortLabel = getActiveSortLabel(sortBy);
  const highlightedVerificationResultId = !loading && sortBy === 'verification' && firstVisibleResult
    ? getPropertyVerificationGuidanceLabel(firstVisibleResult, { isTopResult: true })
      ? firstVisibleResult.id
      : null
    : null;
  const featuredHeading = sortBy === 'price'
    ? 'Empezá por las más convenientes'
    : sortBy === 'rating'
      ? 'Empezá por las mejor valoradas'
      : 'Empezá por los más verificados';
  const featuredDescription = loading
    ? 'Estamos ordenando las primeras opciones.'
    : sortBy === 'price'
      ? 'Precio claro y lectura rápida primero.'
      : sortBy === 'rating'
        ? 'Valoración alta y respaldo visible primero.'
        : 'Primero ves los avisos con más comprobaciones reales. Si empatan, priorizamos ubicación verificada, anfitrión confirmado y disponibilidad validada.';
  const listingHeading = hasActiveFilters
    ? 'Resultados para revisar'
    : showFeaturedSection
      ? 'Más para comparar'
      : 'Opciones para comparar';
  const listingDescription = loading
    ? 'Estamos actualizando los avisos disponibles.'
    : hasActiveFilters
      ? `${formatPropertyCount(listingProperties.length)} para comparar en esta búsqueda.`
      : listingProperties.length > 0
        ? showFeaturedSection
          ? `${formatPropertyCount(listingProperties.length)} para seguir comparando sin perder este criterio.`
          : `${formatPropertyCount(listingProperties.length)} para comparar con este criterio.`
        : 'No hay más propiedades para revisar por ahora.';
  const homeListingDescription = loading
    ? 'Estamos preparando más opciones.'
    : sortBy === 'verification'
      ? 'Más opciones para seguir comparando con el mismo nivel de comprobación visible.'
      : 'Más opciones para seguir comparando rápido.';
  const filteredResultsDescription = `${formatPropertyCount(totalResults)} para comparar en esta búsqueda.`;
  const filteredVisibleResultsLabel = `${visibleCount} ${visibleCount === 1 ? 'visible' : 'visibles'} en esta búsqueda.`;

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
    ? 'Estamos actualizando los avisos disponibles.'
    : failedToLoadResults
      ? 'Probá con otra zona o volvé a intentar en unos segundos.'
    : hasActiveFilters
      ? hasAnyResults
        ? `${formatPropertyCount(totalResults)} para revisar en esta búsqueda.`
        : 'Probá con otra zona o limpiá los filtros.'
      : hasAnyResults
        ? `${formatPropertyCount(totalResults)} para revisar antes de reservar.`
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
    <span key="sort" className="inline-flex items-center gap-1.5">
      <Icons.Target className="h-3.5 w-3.5 text-slate-400" />
      <span>{activeSortLabel}</span>
    </span>,
    caresAboutVerification && sortBy === 'verification' ? (
      <span key="preference" className="inline-flex items-center gap-1.5">
        <Icons.ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
        <span>Resaltando las comprobaciones reales</span>
      </span>
    ) : null,
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
            description={hasActiveFilters ? 'Probá con otra zona o limpiá los filtros.' : 'Volvé a revisar más tarde.'}
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
                : 'Abrí cada pin para ver precio, score y comprobaciones reales del aviso.'}
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
                onPropertyClick={(id) => navigate(`/detail/${id}`)}
              />
            </Suspense>
          </div>
        </div>
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

      {showFeaturedSection ? (
        <section className="space-y-3.5 md:space-y-4">
          <div className="max-w-2xl space-y-1">
            <h2 className="text-[1.38rem] font-semibold tracking-tight text-slate-950 md:text-[1.56rem]">
              {featuredHeading}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {featuredDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-12">
            {loading
              ? renderSkeletons(3)
              : featuredProperties.map((property, index) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    className={cn(
                      index === 0 && featuredProperties.length > 1 && 'md:col-span-2 xl:col-span-6',
                      featuredProperties.length === 2 && index === 1 && 'xl:col-span-6',
                      featuredProperties.length >= 3 && index > 0 && 'xl:col-span-3',
                    )}
                    verificationGuidanceLabel={sortBy === 'verification'
                      ? getPropertyVerificationGuidanceLabel(property, {
                          isTopResult: highlightedVerificationResultId === property.id,
                        })
                      : null}
                    emphasizeVerification={caresAboutVerification}
                    decisionFeatured={highlightedVerificationResultId === property.id}
                    decisionSupportLabel={null}
                    onClick={() => navigate(`/detail/${property.id}`)}
                    isFavorite={isFavorite(property.id)}
                    onFavoriteToggle={onFavoriteToggle}
                  />
                ))}
          </div>
        </section>
      ) : null}

      {loading || hasActiveFilters || listingProperties.length > 0 || !hasAnyResults ? (
        <section className={listingSectionClass}>
          {showListingHeader ? (
            <div className={cn('space-y-3.5', !showFeaturedSection && 'border-b border-slate-200/70 pb-5 md:space-y-5')}>
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
                    {showFeaturedSection ? (
                      <div className="space-y-1">
                        <h2 className="text-[1.32rem] font-semibold tracking-tight text-slate-950 md:text-[1.48rem]">
                          {listingHeading}
                        </h2>
                        <p className="text-sm leading-6 text-slate-600">
                          {homeListingDescription}
                        </p>
                      </div>
                    ) : (
                      <SectionTitle
                        heading={listingHeading}
                        description={listingDescription}
                        className="max-w-2xl"
                      />
                    )}
                  </div>

                  {!loading && listingProperties.length > 0 && !showFeaturedSection ? (
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

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {loading ? (
              renderSkeletons()
            ) : listingProperties.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  tone={hasActiveFilters ? 'default' : 'soft'}
                  eyebrow="Resultados"
                  icon={<Icons.Search className="h-10 w-10 text-slate-400" />}
                  title={hasActiveFilters ? 'No encontramos propiedades para esa zona' : 'No hay más propiedades por ahora'}
                  description={hasActiveFilters ? 'Probá con otra zona o limpiá los filtros.' : 'Volvé a revisar más tarde para ver nuevas opciones.'}
                  action={hasActiveFilters ? { label: 'Limpiar filtros', onClick: onClearFilters } : undefined}
                />
              </div>
            ) : (
              visibleProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  verificationGuidanceLabel={sortBy === 'verification'
                    ? getPropertyVerificationGuidanceLabel(property, {
                        isTopResult: highlightedVerificationResultId === property.id,
                      })
                    : null}
                  emphasizeVerification={caresAboutVerification}
                  decisionFeatured={highlightedVerificationResultId === property.id}
                  decisionSupportLabel={null}
                  onClick={() => navigate(`/detail/${property.id}`)}
                  isFavorite={isFavorite(property.id)}
                  onFavoriteToggle={onFavoriteToggle}
                />
              ))
            )}
          </div>

          {!loading && hasMoreResults ? (
            <div className="flex flex-col items-center gap-4 pt-3 md:pt-4">
              <p className="text-sm text-slate-500">Mostrando {visibleCount} de {listingProperties.length} propiedades.</p>
              <Button type="button" className="rounded-full px-6 md:px-8" onClick={onLoadMore}>
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