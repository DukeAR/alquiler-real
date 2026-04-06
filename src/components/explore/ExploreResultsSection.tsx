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
  TOP_VERIFIED_RESULTS_COUNT,
  getPropertyVerificationGuidanceLabel,
  type PropertyCatalogSort,
} from '../../lib/propertyVerification';
import type { Property } from '../../services/geminiService';

const LazyPropertyMap = lazy(() => import('../PropertyMap').then((module) => ({ default: module.PropertyMap })));

const MapFallback = () => (
  <div className="flex h-full min-h-[300px] items-center justify-center bg-slate-50 md:min-h-[500px]">
    <Icons.Loader2 className="h-8 w-8 animate-spin text-brand" />
  </div>
);

const formatPropertyCount = (count: number) => `${count} ${count === 1 ? 'propiedad' : 'propiedades'}`;
const renderSkeletons = (count = 6) => Array.from({ length: count }, (_, index) => <SkeletonCard key={`skeleton-${index}`} />);

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
  const featuredCount = featuredProperties.length;
  const visibleCount = visibleProperties.length;
  const remainingResults = Math.max(listingProperties.length - visibleCount, 0);
  const hasAnyResults = totalResults > 0;
  const failedToLoadResults = Boolean(loadError) && !loading && !hasAnyResults;
  const showingStaleResults = Boolean(loadError) && !loading && hasAnyResults;
  const showHomeBlocks = !hasActiveFilters && viewMode === 'grid';
  const showSummaryCard = viewMode === 'map' || hasActiveFilters || failedToLoadResults;
  const showFeaturedSection = showHomeBlocks && (loading || featuredCount > 0);
  const showVerificationPreferenceHint = caresAboutVerification && !loading && hasAnyResults;
  const topResultIds = new Set(
    (showFeaturedSection ? featuredProperties : listingProperties)
      .slice(0, TOP_VERIFIED_RESULTS_COUNT)
      .map((property) => property.id),
  );
  const verificationSortDescription = sortBy === 'verification'
    ? 'Mostramos primero los avisos con mayor nivel de verificación.'
    : sortBy === 'rating'
      ? 'Ordenados por mejor calificación, sin sacar de vista la verificación.'
      : 'Ordenados por precio, sin sacar de vista la verificación.';

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

  const summaryCard = (
    <Card className="rounded-[28px] border-slate-200/80 bg-white p-5 shadow-[0_22px_54px_-42px_rgba(15,23,42,0.22)] sm:p-6">
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

  const verificationPreferenceHint = showVerificationPreferenceHint ? (
    <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-[12.5px] font-medium leading-5 text-emerald-800">
      <Icons.ShieldCheck className="h-4 w-4" />
      <span>Estás viendo avisos con mayor nivel de verificación</span>
    </p>
  ) : null;

  if (failedToLoadResults) {
    return (
      <section className="space-y-6 md:space-y-8">
        <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
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
      <section className="space-y-6 md:space-y-8">
        {summaryCard}

        <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_28px_70px_-50px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-3 border-b border-slate-200/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Mapa de resultados</p>
              <p className="mt-1 text-sm text-slate-600">
                {loading
                  ? 'Estamos ubicando cada aviso en el mapa.'
                  : 'Abrí cada pin para ver precio y qué parte del aviso ya fue comprobada.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral" className="gap-2">
                <Icons.Target className="h-3.5 w-3.5" />
                <span>{formatPropertyCount(totalResults)}</span>
              </Badge>
              {hasActiveFilters ? (
                <Button type="button" variant="ghost" size="sm" onClick={onClearFilters} className="rounded-xl px-3 text-sm text-brand hover:bg-brand/5 hover:text-brand">
                  <Icons.X className="h-4 w-4" />
                  Limpiar filtros
                </Button>
              ) : null}
            </div>
          </div>

          <div className="h-[640px] overflow-hidden bg-slate-50">
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
    <section className="space-y-8 md:space-y-10">
      {showSummaryCard ? summaryCard : null}

      {showHomeBlocks && showingStaleResults ? (
        <NoticeBanner
          tone="warning"
          heading="Mostrando la última versión disponible"
          description="Volvé a intentar en unos segundos si querés actualizar los resultados."
        />
      ) : null}

      {showFeaturedSection ? (
        <section className="space-y-5 md:space-y-6">
          <div className="max-w-2xl space-y-2">
            <SectionTitle
              heading="Primero revisá estos avisos"
              description="Acá ves precio, ubicación, rating y qué parte del aviso ya fue comprobada."
              className="max-w-2xl"
            />
            {!loading ? (
              <>
                <p className="text-[12.5px] leading-5 text-slate-500">
                  {verificationSortDescription}
                </p>
                {verificationPreferenceHint}
              </>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
            {loading
              ? renderSkeletons(3)
              : featuredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    verificationGuidanceLabel={getPropertyVerificationGuidanceLabel(property, {
                      isTopResult: topResultIds.has(property.id),
                    })}
                    emphasizeVerification={caresAboutVerification}
                    onClick={() => navigate(`/detail/${property.id}`)}
                    isFavorite={isFavorite(property.id)}
                    onFavoriteToggle={onFavoriteToggle}
                  />
                ))}
          </div>
        </section>
      ) : null}

      {loading || hasActiveFilters || listingProperties.length > 0 || !hasAnyResults ? (
        <section className="space-y-6 pt-2 md:space-y-8">
          <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <SectionTitle
                heading={hasActiveFilters ? 'Resultados para revisar' : 'Más avisos para revisar'}
                description={loading
                  ? 'Estamos actualizando los avisos disponibles.'
                  : hasActiveFilters
                    ? `${formatPropertyCount(listingProperties.length)} para revisar en esta búsqueda.`
                    : listingProperties.length > 0
                      ? `${formatPropertyCount(listingProperties.length)} para seguir revisando antes de reservar.`
                      : 'No hay más propiedades para revisar por ahora.'}
                className="max-w-2xl"
              />
              {!loading && !showFeaturedSection ? (
                <>
                  {listingProperties.length > 0 ? (
                    <p className="mt-2 text-[12.5px] leading-5 text-slate-500">
                      {verificationSortDescription}
                    </p>
                  ) : null}
                  {verificationPreferenceHint}
                </>
              ) : null}
            </div>

            {!loading && listingProperties.length > 0 ? (
              <p className="text-sm text-slate-500">
                {remainingResults > 0
                  ? `Mostrando ${visibleCount}. Quedan ${remainingResults} para revisar.`
                  : `${visibleCount} visibles en esta búsqueda.`}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
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
                  verificationGuidanceLabel={getPropertyVerificationGuidanceLabel(property, {
                    isTopResult: topResultIds.has(property.id),
                  })}
                  emphasizeVerification={caresAboutVerification}
                  onClick={() => navigate(`/detail/${property.id}`)}
                  isFavorite={isFavorite(property.id)}
                  onFavoriteToggle={onFavoriteToggle}
                />
              ))
            )}
          </div>

          {!loading && hasMoreResults ? (
            <div className="flex flex-col items-center gap-4 pt-4 md:pt-6">
              <p className="text-sm text-slate-500">Mostrando {visibleCount} de {listingProperties.length} propiedades para comparar.</p>
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