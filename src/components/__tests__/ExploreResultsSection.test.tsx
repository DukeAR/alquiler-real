import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../PropertyCard', () => ({
  PropertyCard: ({
    property,
    verificationGuidanceLabel,
    emphasizeVerification,
  }: {
    property: { title: string };
    verificationGuidanceLabel?: string | null;
    emphasizeVerification?: boolean;
  }) => (
    <div>
      <span>{property.title}</span>
      {verificationGuidanceLabel ? <span>{verificationGuidanceLabel}</span> : null}
      {emphasizeVerification ? <span>Verificación más visible</span> : null}
    </div>
  ),
}));

import { ExploreResultsSection } from '../explore/ExploreResultsSection';

const sampleProperties = [
  {
    id: 'p1',
    title: 'Casa frente al mar',
    location: 'Santa Teresita',
    price: 120000,
    rating: 4.8,
    reviewsCount: 12,
    verificationScore: 4,
  },
  {
    id: 'p2',
    title: 'Departamento luminoso',
    location: 'Pinamar',
    price: 98000,
    rating: 4.6,
    reviewsCount: 8,
    verificationScore: 3,
  },
  {
    id: 'p3',
    title: 'Cabaña entre pinos',
    location: 'Mar de las Pampas',
    price: 143000,
    rating: 4.7,
    reviewsCount: 10,
    verificationScore: 2,
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
    featuredProperties: [sampleProperties[0]],
    listingProperties: [sampleProperties[1], sampleProperties[2]],
    visibleProperties: [sampleProperties[1], sampleProperties[2]],
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
  test('renders the decision-oriented hierarchy on the home results view', () => {
    renderSection();

    expect(screen.getByText('Mostramos qué está comprobado para que puedas decidir mejor.')).toBeInTheDocument();
    expect(screen.getByText('Después siguen las opciones con mejor combinación de información validada, reseñas y señales concretas.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Avisos para mirar primero' })).toBeInTheDocument();
    expect(screen.getByText('Acá ves tipo de propiedad, ubicación, precio, rating y qué parte del aviso ya fue comprobada en una sola lectura.')).toBeInTheDocument();
    expect(screen.getByText('Más comprobado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Más opciones' })).toBeInTheDocument();
    expect(screen.getByText('Casa frente al mar')).toBeInTheDocument();
    expect(screen.getByText('Departamento luminoso')).toBeInTheDocument();
    expect(screen.queryByText('Cabaña entre pinos')).toBeInTheDocument();
  });

  test('shows the subtle verification hint and emphasizes cards when the preference is active', () => {
    renderSection({ caresAboutVerification: true });

    expect(screen.getByText('Estás viendo avisos con más comprobaciones visibles')).toBeInTheDocument();
    expect(screen.getAllByText('Verificación más visible')).toHaveLength(3);
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
});