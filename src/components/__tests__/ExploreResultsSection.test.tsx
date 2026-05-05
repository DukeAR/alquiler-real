import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../PropertyCard', () => ({
  PropertyCard: ({
    property,
    verificationGuidanceLabel,
    emphasizeVerification,
    decisionFeatured,
  }: {
    property: { title: string };
    verificationGuidanceLabel?: string | null;
    emphasizeVerification?: boolean;
    decisionFeatured?: boolean;
  }) => {
    const badgeLabel = decisionFeatured ? 'Más verificado' : verificationGuidanceLabel;

    return (
      <div>
        <span>{property.title}</span>
        {badgeLabel ? <span>{badgeLabel}</span> : null}
        {emphasizeVerification ? <span>Verificación más visible</span> : null}
      </div>
    );
  },
}));

vi.mock('../PropertyMap', () => ({
  PropertyMap: ({ properties }: { properties: Array<{ title: string }> }) => (
    <div data-testid="property-map">{properties.length} propiedades en mapa</div>
  ),
}));

import { ExploreResultsSection } from '../explore/ExploreResultsSection';

const sampleProperties = [
  {
    id: 'p1',
    title: 'Casa frente al mar',
    location: 'Santa Teresita',
    price: 120000,
    description: 'Amplia, luminosa y cerca de la playa.',
    propertyType: 'house',
    maxGuests: 5,
    rating: 4.8,
    reviewsCount: 12,
    identityValidated: true,
    locationVerified: true,
    videoValidated: true,
    hasPresencialVerification: true,
    coordinates: { lat: -36.7, lng: -56.7 },
  },
  {
    id: 'p2',
    title: 'Departamento luminoso',
    location: 'Pinamar',
    price: 98000,
    description: 'Ideal para escapadas cortas cerca del centro.',
    propertyType: 'apartment',
    maxGuests: 3,
    rating: 4.6,
    reviewsCount: 8,
    identityValidated: true,
    locationVerified: true,
    hasPresencialVerification: false,
    coordinates: { lat: -37.0, lng: -56.8 },
  },
  {
    id: 'p3',
    title: 'Cabaña entre pinos',
    location: 'Mar de las Pampas',
    price: 143000,
    description: 'Rodeada de bosque y a pocas cuadras del mar.',
    propertyType: 'cabin',
    maxGuests: 4,
    rating: 4.7,
    reviewsCount: 10,
    identityValidated: false,
    hasPresencialVerification: false,
  },
] as any[];

const renderSection = (props?: Partial<React.ComponentProps<typeof ExploreResultsSection>>) => {
  const defaultProps: React.ComponentProps<typeof ExploreResultsSection> = {
    loading: false,
    loadError: null,
    viewMode: 'grid',
    sortBy: 'verification',
    caresAboutVerification: false,
    hasActiveFilters: false,
    searchQuery: '',
    appliedFilterCount: 0,
    filteredProperties: sampleProperties,
    featuredProperties: [],
    listingProperties: sampleProperties,
    visibleProperties: sampleProperties,
    hasMoreResults: false,
    onLoadMore: vi.fn(),
    onRetry: vi.fn(),
    onClearFilters: vi.fn(),
    onFavoriteToggle: vi.fn(),
    isFavorite: vi.fn(() => false),
  };

  return render(
    <MemoryRouter>
      <ExploreResultsSection {...defaultProps} {...props} />
    </MemoryRouter>,
  );
};

describe('ExploreResultsSection', () => {
  test('renders a single verification-first grid without rigid featured blocks', () => {
    renderSection();

    const heading = screen.getByRole('heading', { name: 'Más verificados primero' });
    const resultsSection = heading.closest('section');
    const listingGrid = screen.getByText('Casa frente al mar').closest('div')?.parentElement;

    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Priorizamos la verificación presencial sin perder diversidad de oferta.')).toBeInTheDocument();
    expect(resultsSection).not.toBeNull();
    expect(resultsSection).toHaveClass('space-y-5');
    expect(screen.queryByRole('heading', { name: 'Más para comparar' })).toBeNull();
    expect(screen.queryByText('Propiedades con menor nivel de validación')).toBeNull();
    expect(screen.getAllByText('Más verificado')).toHaveLength(1);
    expect(screen.getByText('Casa frente al mar')).toBeInTheDocument();
    expect(screen.getByText('Departamento luminoso')).toBeInTheDocument();
    expect(screen.queryByText('Cabaña entre pinos')).toBeInTheDocument();

    expect(listingGrid).not.toBeNull();
    expect(listingGrid).toHaveClass('grid-cols-1', 'auto-rows-fr', 'items-stretch', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  test('updates the home heading when sorting by the highest prices first', () => {
    renderSection({ sortBy: 'price-desc' });

    expect(screen.getByRole('heading', { name: 'Precio más alto primero' })).toBeInTheDocument();
    expect(screen.getByText('Las opciones de mayor precio aparecen primero.')).toBeInTheDocument();
  });

  test('shows the subtle verification hint and emphasizes cards when the preference is active', () => {
    renderSection({ caresAboutVerification: true });

    expect(screen.getAllByText('Verificación más visible')).toHaveLength(3);
  });

  test('renders the filtered results header as editorial metadata without the old green hint', () => {
    renderSection({
      hasActiveFilters: true,
      caresAboutVerification: true,
      searchQuery: 'Villa Gesell',
      appliedFilterCount: 2,
      filteredProperties: sampleProperties,
      featuredProperties: [],
      listingProperties: sampleProperties,
      visibleProperties: sampleProperties.slice(0, 2),
    });

    expect(screen.getAllByRole('heading', { name: 'Resultados para revisar' })).toHaveLength(1);
    expect(screen.getByText('3 propiedades en esta búsqueda.')).toBeInTheDocument();
    expect(screen.getByText('2 visibles en esta búsqueda.')).toBeInTheDocument();
    expect(screen.getByText('Más verificados primero')).toBeInTheDocument();
    expect(screen.queryByText('Resaltando las comprobaciones reales')).toBeNull();
    expect(screen.getByText('Villa Gesell')).toBeInTheDocument();
    expect(screen.queryByText('Estás priorizando avisos con más información comprobada')).toBeNull();
  });

  test('shows the filtered empty state and clears filters when requested', () => {
    const onClearFilters = vi.fn();

    renderSection({
      hasActiveFilters: true,
      searchQuery: 'Villa Gesell',
      appliedFilterCount: 2,
      filteredProperties: [],
      featuredProperties: [],
      listingProperties: [],
      visibleProperties: [],
      onClearFilters,
    });

    expect(screen.getByText('No encontramos coincidencias')).toBeInTheDocument();
    expect(screen.getByText('No encontramos propiedades para esa zona')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  test('shows the firmer unavailable-results error state', () => {
    const onRetry = vi.fn();

    renderSection({
      loadError: 'No pudimos cargar resultados ahora.',
      filteredProperties: [],
      featuredProperties: [],
      listingProperties: [],
      visibleProperties: [],
      onRetry,
    });

    expect(screen.getByText('No pudimos cargar resultados ahora.')).toBeInTheDocument();
    expect(screen.getByText('Probá con otra zona o volvé a intentar en unos segundos.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /volver a intentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('renders the map block with the compact property map preview', async () => {
    renderSection({ viewMode: 'map' });

    const propertyMap = await screen.findByTestId('property-map');

    expect(screen.getByText('Mapa de resultados')).toBeInTheDocument();
    expect(screen.getByText('3 propiedades para revisar.')).toBeInTheDocument();
    expect(propertyMap).toHaveTextContent('3 propiedades en mapa');
  });
});