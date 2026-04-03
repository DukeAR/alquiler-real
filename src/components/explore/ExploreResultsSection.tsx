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

const formatPropertyCount = (count: number) => `${count} ${count === 1 ? 'propiedad' : 'propiedades'}`;
const formatFeaturedCount = (count: number) => `${count} ${count === 1 ? 'destacada' : 'destacadas'}`;

const renderSkeletons = (count = 6) => Array.from({ length: count }, (_, index) => <SkeletonCard key={`skeleton-${index}`} />);

type ExploreResultsSectionProps = {
  loading: boolean;
  loadError: string | null;
  viewMode: 'grid' | 'map';
  hasActiveFilters: boolean;
  searchQuery: string;
  appliedFilterCount: number;
  filteredProperties: Property[];
  topRated: Property[];
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
  topRated,
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
  const featuredCount = topRated.length;
  const visibleCount = visibleProperties.length;
  const remainingResults = Math.max(listingProperties.length - visibleCount, 0);
  const hasAnyResults = totalResults > 0;
  const failedToLoadResults = Boolean(loadError) && !loading && !hasAnyResults;
  const showingStaleResults = Boolean(loadError) && !loading && hasAnyResults;

  const summaryEyebrow = viewMode === 'map'
    ? 'Exploración en mapa'
    : hasActiveFilters
      ? 'Resultados filtrados'
      : 'Exploración';

  const summaryHeading = loading
    ? 'Buscando propiedades para comparar mejor'
    : failedToLoadResults
      ? 'No pudimos actualizar las propiedades ahora'
    : hasActiveFilters
      ? hasAnyResults
        ? 'Resultados listos para decidir con más claridad'
        : 'No encontramos coincidencias con esa búsqueda'
      : featuredCount > 0
        ? 'Empezá por propiedades con mejores señales'
        : 'Todavía no hay propiedades para mostrar';

  const summaryDescription = loading
    ? 'Estamos actualizando precios, ubicación y señales de confianza para mostrarte resultados al día.'
    : failedToLoadResults
      ? 'Puede ser un problema temporal de conexión. Reintentá sin perder el contexto de búsqueda.'
    : hasActiveFilters
      ? hasAnyResults
        ? `${formatPropertyCount(totalResults)} para revisar ubicación, precio, anfitrión y señales de confianza desde el inicio.`
        : 'Probá otra ubicación o ajustá filtros para volver a explorar con mejores coincidencias.'
      : featuredCount > 0
        ? 'Primero ves una selección destacada y después el resto de las propiedades para seguir comparando sin ruido.'
        : 'Cuando haya nuevas publicaciones disponibles, van a aparecer acá para seguir explorando.';

  const summaryCard = (
    <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <SectionTitle
          eyebrow={summaryEyebrow}
          heading={summaryHeading}
          description={summaryDescription}
          className="max-w-3xl"
        />

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Badge variant="brand" size="md" className="gap-2">
            {viewMode === 'map' ? <Icons.Map className="h-3.5 w-3.5" /> : <Icons.LayoutGrid className="h-3.5 w-3.5" />}
            <span>{viewMode === 'map' ? 'Mapa' : 'Galería'}</span>
          </Badge>
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
          ) : featuredCount > 0 ? (
            <Badge variant="success" size="md" className="gap-2">
              <Icons.Star className="h-3.5 w-3.5 fill-current" />
              <span>{formatFeaturedCount(featuredCount)}</span>
            </Badge>
          ) : null}
        </div>
      </div>

      {!loading && hasActiveFilters && hasAnyResults ? (
        <NoticeBanner
          className="mt-5"
          tone="info"
          heading="Compará antes de decidir"
          description="Abrí el detalle para revisar amenities, confianza y condiciones de reserva antes de avanzar."
        />
      ) : null}

      {!loading && !hasActiveFilters && featuredCount > 0 ? (
        <NoticeBanner
          className="mt-5"
          tone="success"
          heading="La exploración arranca por las mejores señales"
          description="Primero ves publicaciones con mejor valoración y después el resto de la oferta para seguir comparando con contexto." 
        />
      ) : null}

      {showingStaleResults ? (
        <NoticeBanner
          className="mt-5"
          tone="warning"
          heading="Mostrando la última versión disponible"
          description={`${loadError} Podés seguir comparando con estos resultados o reintentar para traer datos actualizados.`}
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
            heading="No pudimos cargar propiedades en este momento"
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
            title={hasActiveFilters ? 'No encontramos propiedades para mostrar en el mapa' : 'Todavía no hay propiedades para mostrar'}
            description={hasActiveFilters ? 'Probá otra búsqueda o limpiá filtros para volver a explorar zonas con resultados.' : 'Cuando se publiquen nuevas propiedades, también van a aparecer en el mapa.'}
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
                  ? 'Estamos ubicando las propiedades para que puedas comparar mejor la zona.'
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
      {summaryCard}

      {!hasActiveFilters && (loading || featuredCount > 0) ? (
        <section className="space-y-5 md:space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle
              eyebrow="Selección destacada"
              heading="Propiedades mejor valoradas"
              description="Una selección breve para arrancar por publicaciones con mejores señales visibles."
              className="max-w-2xl"
            />

            {!loading && featuredCount > 0 ? (
              <Card padding="sm" variant="muted" className="rounded-[26px] border-slate-200/80 bg-white lg:min-w-52">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Icons.Star className="h-5 w-5 fill-current" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{formatFeaturedCount(featuredCount)}</div>
                    <div className="text-sm text-slate-500">Elegidas por valoración y señales de confianza.</div>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-7 lg:grid-cols-3">
            {loading
              ? renderSkeletons()
              : topRated.map((property) => (
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

      {loading || hasActiveFilters || listingProperties.length > 0 || !hasAnyResults ? (
        <section className="space-y-6 pt-2 md:space-y-8">
          <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionTitle
              eyebrow={hasActiveFilters ? 'Resultados para comparar' : 'Más propiedades'}
              heading={hasActiveFilters ? 'Resultados filtrados' : 'Seguí explorando propiedades'}
              description={loading
                ? 'Estamos trayendo las mejores coincidencias para tu búsqueda actual.'
                : hasActiveFilters
                  ? `${formatPropertyCount(listingProperties.length)} para revisar con tu búsqueda actual.`
                  : listingProperties.length > 0
                    ? `${formatPropertyCount(listingProperties.length)} adicionales para seguir comparando después de la selección destacada.`
                    : 'No hay más propiedades para mostrar por ahora.'}
              className="max-w-2xl"
            />

            {!loading && listingProperties.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral" size="md" className="gap-2">
                  <Icons.LayoutGrid className="h-3.5 w-3.5" />
                  <span>{visibleCount} visibles</span>
                </Badge>
                {remainingResults > 0 ? (
                  <Badge variant="info" size="md" className="gap-2">
                    <Icons.ChevronRight className="h-3.5 w-3.5" />
                    <span>Quedan {remainingResults}</span>
                  </Badge>
                ) : null}
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
                  title={hasActiveFilters ? 'No encontramos propiedades con esa combinación' : 'Todavía no hay propiedades para seguir explorando'}
                  description={hasActiveFilters ? 'Probá otro destino o ajustá los filtros para seguir comparando.' : 'Cuando aparezcan nuevas publicaciones, las vas a ver acá para seguir explorando.'}
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