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
import type { Property } from '../../services/geminiService';

const LazyPropertyMap = lazy(() => import('../PropertyMap').then((module) => ({ default: module.PropertyMap })));

const MapFallback = () => (
  <div className="flex h-full min-h-[300px] items-center justify-center bg-slate-50 md:min-h-[500px]">
    <Icons.Loader2 className="h-8 w-8 animate-spin text-brand" />
  </div>
);

const formatPropertyCount = (count: number) => `${count} ${count === 1 ? 'alojamiento' : 'alojamientos'}`;
const renderSkeletons = (count = 6) => Array.from({ length: count }, (_, index) => <SkeletonCard key={`skeleton-${index}`} />);

const decisionPillars = [
  {
    icon: Icons.FileText,
    title: 'Información clara',
    description: 'Lo importante, sin vueltas.',
  },
  {
    icon: Icons.BadgeCheck,
    title: 'Señales verificadas',
    description: 'Datos reales, no suposiciones.',
  },
  {
    icon: Icons.Target,
    title: 'Contexto antes de reservar',
    description: 'Para decidir con criterio.',
  },
] as const;

type ExploreResultsSectionProps = {
  loading: boolean;
  loadError: string | null;
  viewMode: 'grid' | 'map';
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
  onFavoriteToggle: (propertyId: string, isFavorite: boolean) => void;
  isFavorite: (propertyId: string) => boolean;
};

export const ExploreResultsSection = ({
  loading,
  loadError,
  viewMode,
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

  const summaryEyebrow = viewMode === 'map'
    ? 'Mapa'
    : 'Resultados';

  const summaryHeading = loading
    ? 'Buscando alojamientos'
    : failedToLoadResults
      ? 'No pudimos cargar los alojamientos'
    : hasActiveFilters
      ? hasAnyResults
        ? 'Resultados para tu búsqueda'
        : 'No encontramos coincidencias'
      : hasAnyResults
        ? 'Alojamientos disponibles'
        : 'Todavía no hay alojamientos para mostrar';

  const summaryDescription = loading
    ? 'Estamos revisando ubicación, verificación y datos clave.'
    : failedToLoadResults
      ? 'Puede ser un problema momentáneo. Reintentá sin perder tu búsqueda.'
    : hasActiveFilters
      ? hasAnyResults
        ? `${formatPropertyCount(totalResults)} para revisar con tu búsqueda actual.`
        : 'Probá otro destino o ajustá los filtros para seguir.'
      : hasAnyResults
        ? `${formatPropertyCount(totalResults)} disponibles para empezar con más claridad.`
        : 'Cuando haya nuevos alojamientos, van a aparecer acá.';

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
            <Badge variant="warning" size="md" className="gap-2">
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
          description={`${loadError} Podés seguir con estos resultados o reintentar para traer datos actualizados.`}
        />
      ) : null}
    </Card>
  );

  if (failedToLoadResults) {
    return (
      <section className="space-y-6 md:space-y-8">
        {summaryCard}

        <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
          <NoticeBanner
            tone="error"
            heading="No pudimos cargar alojamientos en este momento"
            description={loadError || 'Probá de nuevo en unos segundos.'}
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" onClick={onRetry}>
                <Icons.Loader2 className="h-4 w-4" />
              Reintentar
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
            title={hasActiveFilters ? 'No encontramos alojamientos para mostrar en el mapa' : 'Todavía no hay alojamientos para mostrar'}
            description={hasActiveFilters ? 'Probá otra búsqueda o limpiá los filtros para volver a ver opciones.' : 'Cuando se publiquen nuevos alojamientos, también van a aparecer en el mapa.'}
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
                  ? 'Estamos ubicando los alojamientos para que veas cada zona con más claridad.'
                  : 'Abrí el detalle desde cada pin para revisar precio, anfitrión y señales de confianza.'}
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

      {showHomeBlocks ? (
        <section className="space-y-5 md:space-y-6">
          <SectionTitle
            heading="Cómo te ayudamos a elegir mejor"
            className="max-w-2xl"
          />

          <div className="grid gap-4 md:grid-cols-3">
            {decisionPillars.map((pillar) => {
              const PillarIcon = pillar.icon;

              return (
                <Card key={pillar.title} className="rounded-[24px] border-slate-200/80 bg-white p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)] md:p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <PillarIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {pillar.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {showHomeBlocks && showingStaleResults ? (
        <NoticeBanner
          tone="warning"
          heading="Mostrando la última versión disponible"
          description={`${loadError} Podés seguir con estos resultados mientras actualizamos.`}
        />
      ) : null}

      {showHomeBlocks && (loading || featuredCount > 0) ? (
        <section className="space-y-5 md:space-y-6">
          <div className="flex flex-col gap-3">
            <p className="app-eyebrow">Elegidas por claridad, ubicación y confianza.</p>
            <SectionTitle
              heading="Opciones para decidir mejor"
              className="max-w-2xl"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
            {loading
              ? renderSkeletons(3)
              : featuredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onClick={() => navigate(`/detail/${property.id}`)}
                    isFavorite={isFavorite(property.id)}
                    onFavoriteToggle={onFavoriteToggle}
                  />
                ))}
          </div>
        </section>
      ) : null}

      {showHomeBlocks ? (
        <Card className="rounded-[32px] border-slate-200/80 bg-slate-950 px-6 py-8 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.34)] sm:px-8 sm:py-10">
          <div className="max-w-2xl space-y-3">
            <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em] text-white md:text-[2.6rem]">
              Tomar una buena decisión cambia todo.
            </h2>
            <p className="text-base leading-7 text-slate-300 md:text-lg md:leading-8">
              Cuando la información es clara, elegir deja de ser una apuesta.
            </p>
          </div>
        </Card>
      ) : null}

      {loading || hasActiveFilters || listingProperties.length > 0 || !hasAnyResults ? (
        <section className="space-y-6 pt-2 md:space-y-8">
          <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle
              eyebrow={hasActiveFilters ? 'Resultados' : 'Más alojamientos'}
              heading={hasActiveFilters ? 'Resultados para tu búsqueda' : 'Más alojamientos'}
              description={loading
                ? 'Estamos trayendo resultados para tu búsqueda actual.'
                : hasActiveFilters
                  ? `${formatPropertyCount(listingProperties.length)} para revisar con tu búsqueda actual.`
                  : listingProperties.length > 0
                    ? `${formatPropertyCount(listingProperties.length)} para seguir si querés ver más opciones.`
                    : 'No hay más alojamientos para mostrar por ahora.'}
              className="max-w-2xl"
            />

            {!loading && listingProperties.length > 0 ? (
              <p className="text-sm text-slate-500">
                {remainingResults > 0
                  ? `Mostrando ${visibleCount}. Quedan ${remainingResults} disponibles.`
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
                  title={hasActiveFilters ? 'No encontramos alojamientos para esa búsqueda' : 'No hay más alojamientos por ahora'}
                  description={hasActiveFilters ? 'Probá otro destino o ajustá los filtros.' : 'Cuando aparezcan nuevas opciones, las vas a ver acá.'}
                  action={hasActiveFilters ? { label: 'Limpiar filtros', onClick: onClearFilters } : undefined}
                />
              </div>
            ) : (
              visibleProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onClick={() => navigate(`/detail/${property.id}`)}
                  isFavorite={isFavorite(property.id)}
                  onFavoriteToggle={onFavoriteToggle}
                />
              ))
            )}
          </div>

          {!loading && hasMoreResults ? (
            <div className="flex flex-col items-center gap-4 pt-4 md:pt-6">
              <p className="text-sm text-slate-500">Mostrando {visibleCount} de {listingProperties.length} alojamientos.</p>
              <Button type="button" className="rounded-full px-6 md:px-8" onClick={onLoadMore}>
                Ver alojamientos
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
};

export default ExploreResultsSection;