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
import { cn } from '../../lib/utils';

const LazyPropertyMap = lazy(() => import('../PropertyMap').then((module) => ({ default: module.PropertyMap })));

const MapFallback = () => (
  <div className="flex h-full min-h-[300px] items-center justify-center bg-slate-50 md:min-h-[500px]">
    <Icons.Loader2 className="h-8 w-8 animate-spin text-brand" />
  </div>
);

const formatPropertyCount = (count: number) => `${count} ${count === 1 ? 'propiedad' : 'propiedades'}`;
const renderSkeletons = (count = 6) => Array.from({ length: count }, (_, index) => <SkeletonCard key={`skeleton-${index}`} />);

const getSortPresentation = (sortBy: PropertyCatalogSort) => {
  if (sortBy === 'price') {
    return {
      label: 'Más convenientes',
      helper: 'Primero ves las más bajas y, si empatan, las que muestran más respaldo visible.',
    };
  }

  if (sortBy === 'rating') {
    return {
      label: 'Mejor valoradas',
      helper: 'Primero ves reseñas más fuertes y, si empatan, las fichas más completas.',
    };
  }

  return {
    label: 'Más comprobadas',
    helper: 'Primero ves las que ya muestran más señales concretas para decidir rápido.',
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
  const sectionSpacingClass = showHomeBlocks ? 'space-y-12 md:space-y-16' : 'space-y-8 md:space-y-10';
  const listingSectionClass = showFeaturedSection
    ? 'space-y-6 border-t border-slate-200/70 pt-8 md:space-y-8 md:pt-10'
    : 'space-y-6 md:space-y-8';
  const topResultIds = new Set(
    (showFeaturedSection ? featuredProperties : listingProperties)
      .slice(0, TOP_VERIFIED_RESULTS_COUNT)
      .map((property) => property.id),
  );
  const listingHeading = hasActiveFilters
    ? 'Resultados para revisar'
    : showFeaturedSection
      ? 'Más opciones'
      : 'Opciones para revisar';
  const listingDescription = loading
    ? 'Estamos actualizando los avisos disponibles.'
    : hasActiveFilters
      ? `${formatPropertyCount(listingProperties.length)} para revisar en esta búsqueda.`
      : listingProperties.length > 0
        ? showFeaturedSection
          ? `${formatPropertyCount(listingProperties.length)} para seguir comparando sin cambiar el criterio.`
          : `${formatPropertyCount(listingProperties.length)} para revisar con este criterio.`
        : 'No hay más propiedades para revisar por ahora.';
  const sortPresentation = getSortPresentation(sortBy);
  const featuredInsightCards = [
    {
      key: 'sort',
      icon: <Icons.Target className="h-4 w-4" />,
      label: 'Orden inicial',
      value: sortPresentation.label,
      helper: sortPresentation.helper,
    },
    {
      key: 'confidence',
      icon: <Icons.ShieldCheck className="h-4 w-4" />,
      label: 'Lectura rápida',
      value: 'Confianza visible',
      helper: 'Cada ficha ya resume ubicación, anfitrión o datos clave cuando existen validaciones visibles.',
    },
    {
      key: 'compare',
      icon: <Icons.LayoutGrid className="h-4 w-4" />,
      label: 'Para comparar',
      value: loading ? 'Actualizando' : `${featuredCount + visibleCount} visibles`,
      helper: remainingResults > 0
        ? `Quedan ${remainingResults} más para seguir abriendo sin cambiar el criterio.`
        : 'Ya estás viendo todo lo disponible con este criterio.',
    },
  ];
  const listingInsightCards = [
    {
      key: 'results',
      icon: <Icons.Home className="h-4 w-4" />,
      label: 'En pantalla',
      value: `${visibleCount} visibles`,
      helper: remainingResults > 0
        ? `Todavía quedan ${remainingResults} resultados para revisar.`
        : 'Ya abriste todo lo disponible en esta búsqueda.',
    },
    {
      key: 'criteria',
      icon: <Icons.SlidersHorizontal className="h-4 w-4" />,
      label: 'Criterio activo',
      value: sortPresentation.label,
      helper: hasActiveFilters
        ? `${appliedFilterCount} ${appliedFilterCount === 1 ? 'filtro activo' : 'filtros activos'} afinando esta lista.`
        : 'Sin filtros extra: la comparación se apoya en el criterio principal.',
    },
    {
      key: 'trust',
      icon: <Icons.Sparkles className="h-4 w-4" />,
      label: 'Qué ya ves',
      value: 'Señales concretas',
      helper: 'Las cards muestran respaldo visible sin obligarte a entrar a cada detalle para entender si inspira confianza.',
    },
  ];

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
    <Card className="rounded-[var(--app-radius-card)] border-slate-200/80 bg-white p-5 shadow-[var(--app-shadow-subtle)] sm:p-6">
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
        <Card className="rounded-[var(--app-radius-card)] border-slate-200/80 bg-white p-6 shadow-[var(--app-shadow-soft)] sm:p-7">
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

        <div className="overflow-hidden rounded-[var(--app-radius-display)] border border-slate-200/80 bg-white shadow-[var(--app-shadow-soft)]">
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
        <section className="space-y-6 md:space-y-8">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)] xl:items-start">
            <Card className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-6 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.28)] sm:p-7">
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral" size="md">Selección inicial</Badge>
                {!loading ? <Badge variant="info" size="md">{featuredCount} {featuredCount === 1 ? 'destacada' : 'destacadas'}</Badge> : null}
              </div>

              <SectionTitle
                heading={sortBy === 'price' ? 'Empezá por las más convenientes' : sortBy === 'rating' ? 'Empezá por las mejor valoradas' : 'Empezá por las más completas'}
                description={loading
                  ? 'Estamos ordenando las primeras opciones.'
                  : sortBy === 'price'
                    ? 'Acá aparecen primero las más baratas y, si empatan, priorizamos las que muestran más información visible.'
                    : sortBy === 'rating'
                      ? 'Acá aparecen primero las mejor valoradas y, si empatan, las que muestran más información visible.'
                      : 'Acá aparecen primero las que muestran más información visible para decidir más rápido.'}
                className="mt-4 max-w-2xl"
              />

              {!loading && verificationPreferenceHint ? (
                <div className="pt-4">
                  {verificationPreferenceHint}
                </div>
              ) : null}
            </Card>

            {!loading ? (
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                {featuredInsightCards.map((item) => (
                  <div key={item.key} className="rounded-[28px] border border-slate-200/80 bg-white/96 p-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.24)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                        {item.icon}
                      </div>
                    </div>
                    <p className="mt-4 text-base font-semibold tracking-tight text-slate-950">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.helper}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 xl:grid-cols-12">
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
          <div className="space-y-5 border-b border-slate-200/70 pb-5 md:space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <SectionTitle
                  heading={listingHeading}
                  description={listingDescription}
                  className="max-w-2xl"
                />
                {!loading && !showFeaturedSection ? (
                  <>
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

            {!loading && listingProperties.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {listingInsightCards.map((item) => (
                  <div key={item.key} className="rounded-[26px] border border-slate-200/80 bg-slate-50/75 px-4 py-4 shadow-[0_16px_34px_-34px_rgba(15,23,42,0.22)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-brand shadow-[0_16px_32px_-28px_rgba(79,70,229,0.35)]">
                        {item.icon}
                      </div>
                    </div>
                    <p className="mt-4 text-base font-semibold tracking-tight text-slate-950">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.helper}</p>
                  </div>
                ))}
              </div>
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