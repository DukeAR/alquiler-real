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
  HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE,
  TOP_VERIFIED_RESULTS_COUNT,
  getPropertyVerificationGuidanceLabel,
  getPropertyVerificationBadge,
  type PropertyCatalogSort,
} from '../../lib/propertyVerification';
import { getPropertyListingQualityScore } from '../../lib/propertyListingQuality';
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

const getDecisionDataScore = (property: Property) => [
  typeof property.location === 'string' && property.location.trim().length > 0,
  typeof property.description === 'string' && property.description.trim().length >= 80,
  Number(property.maxGuests) > 0,
  Number(property.reviewsCount) > 0,
  Number(property.price) > 0,
].filter(Boolean).length;

const getDecisionFeaturedProperty = (properties: Property[]) => {
  const uniqueProperties = [...new Map(properties.map((property) => [property.id, property])).values()];

  if (uniqueProperties.length === 0) {
    return {
      propertyId: null,
      supportLabel: null,
    };
  }

  const priceValues = uniqueProperties
    .map((property) => Number(property.price) || 0)
    .filter((price) => price > 0);
  const minPrice = priceValues.length > 0 ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length > 0 ? Math.max(...priceValues) : 0;

  const rankedProperties = uniqueProperties
    .map((property) => {
      const verificationScore = getPropertyVerificationBadge(property).score;
      const qualityScore = getPropertyListingQualityScore(property);
      const dataScore = getDecisionDataScore(property);
      const price = Number(property.price) || 0;
      const priceAdvantage = price > 0 && maxPrice > minPrice
        ? (maxPrice - price) / (maxPrice - minPrice)
        : price > 0
          ? 0.5
          : 0;
      const valueScore = qualityScore + (dataScore * 10) + (priceAdvantage * 25);

      return {
        property,
        verificationScore,
        qualityScore,
        dataScore,
        price,
        priceAdvantage,
        valueScore,
      };
    })
    .sort((left, right) => {
      if (right.verificationScore !== left.verificationScore) {
        return right.verificationScore - left.verificationScore;
      }

      if (right.valueScore !== left.valueScore) {
        return right.valueScore - left.valueScore;
      }

      if (right.qualityScore !== left.qualityScore) {
        return right.qualityScore - left.qualityScore;
      }

      if (left.price !== right.price) {
        if (!left.price) return 1;
        if (!right.price) return -1;
        return left.price - right.price;
      }

      return String(left.property.title || '').localeCompare(String(right.property.title || ''), 'es');
    });

  const bestProperty = rankedProperties[0];

  if (!bestProperty) {
    return {
      propertyId: null,
      supportLabel: null,
    };
  }

  const supportLabel = bestProperty.verificationScore >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE && bestProperty.priceAdvantage >= 0.35
    ? 'Buena relación precio / información'
    : bestProperty.verificationScore >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE || bestProperty.qualityScore >= 55
      ? 'De las más completas en este rango'
      : null;

  return {
    propertyId: bestProperty.property.id,
    supportLabel,
  };
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
  const showSummaryCard = viewMode === 'map' || hasActiveFilters || failedToLoadResults;
  const showFeaturedSection = showHomeBlocks && (loading || featuredProperties.length > 0);
  const showVerificationPreferenceHint = caresAboutVerification && !loading && hasAnyResults && !showHomeBlocks;
  const sectionSpacingClass = showHomeBlocks ? 'space-y-5 md:space-y-6' : 'space-y-6 md:space-y-8';
  const listingSectionClass = showFeaturedSection
    ? 'space-y-4 border-t border-slate-200/60 pt-4 md:space-y-5 md:pt-5'
    : 'space-y-5 md:space-y-6';
  const topResultIds = new Set(
    (showFeaturedSection ? featuredProperties : listingProperties)
      .slice(0, TOP_VERIFIED_RESULTS_COUNT)
      .map((property) => property.id),
  );
  const decisionFeatureSource = showFeaturedSection
    ? [...featuredProperties, ...visibleProperties]
    : visibleProperties;
  const decisionFeature = !loading
    ? getDecisionFeaturedProperty(decisionFeatureSource)
    : { propertyId: null, supportLabel: null };
  const featuredHeading = sortBy === 'price'
    ? 'Empezá por las más convenientes'
    : sortBy === 'rating'
      ? 'Empezá por las mejor valoradas'
      : 'Empezá por las más completas';
  const featuredDescription = loading
    ? 'Estamos ordenando las primeras opciones.'
    : sortBy === 'price'
      ? 'Precio claro y lectura rápida primero.'
      : sortBy === 'rating'
        ? 'Valoración alta y respaldo visible primero.'
        : 'Precio, capacidad y respaldo en una sola mirada.';
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
    : 'Más opciones para seguir comparando rápido.';

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

  const verificationPreferenceHint = showVerificationPreferenceHint ? (
    <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-[12.5px] font-medium leading-5 text-emerald-800">
      <Icons.ShieldCheck className="h-4 w-4" />
      <span>Estás priorizando avisos con más información comprobada</span>
    </p>
  ) : null;

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
      <section className="space-y-6 md:space-y-8">
        {summaryCard}

        <div className="overflow-hidden rounded-[var(--app-radius-display)] border border-slate-200/70 bg-white/72 shadow-none">
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
                <Button type="button" variant="ghost" size="sm" onClick={onClearFilters} className="rounded-xl px-3 text-sm text-slate-900 hover:bg-slate-100 hover:text-slate-950">
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
                    verificationGuidanceLabel={getPropertyVerificationGuidanceLabel(property, {
                      isTopResult: topResultIds.has(property.id),
                    })}
                    emphasizeVerification={caresAboutVerification}
                    decisionFeatured={decisionFeature.propertyId === property.id}
                    decisionSupportLabel={decisionFeature.propertyId === property.id ? decisionFeature.supportLabel : null}
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
          <div className={cn('space-y-3.5', !showFeaturedSection && 'border-b border-slate-200/70 pb-5 md:space-y-5')}>
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
                {!loading && !showFeaturedSection ? (
                  <>
                    {verificationPreferenceHint}
                  </>
                ) : null}
              </div>

              {!loading && listingProperties.length > 0 && !showFeaturedSection ? (
                <p className="text-sm text-slate-500">
                  {remainingResults > 0
                    ? `Mostrando ${visibleCount}. Quedan ${remainingResults} para revisar.`
                    : `${visibleCount} visibles en esta búsqueda.`}
                </p>
              ) : null}
            </div>
          </div>

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
                  verificationGuidanceLabel={getPropertyVerificationGuidanceLabel(property, {
                    isTopResult: topResultIds.has(property.id),
                  })}
                  emphasizeVerification={caresAboutVerification}
                  decisionFeatured={decisionFeature.propertyId === property.id}
                  decisionSupportLabel={decisionFeature.propertyId === property.id ? decisionFeature.supportLabel : null}
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