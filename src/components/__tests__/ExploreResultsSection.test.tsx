import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../PropertyCard', () => ({
  PropertyCard: ({ property }: { property: { title: string } }) => <div>{property.title}</div>,
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
  },
  {
    id: 'p2',
    title: 'Departamento luminoso',
    location: 'Pinamar',
    price: 98000,
    rating: 4.6,
    reviewsCount: 8,
  },
  {
    id: 'p3',
    title: 'Cabaña entre pinos',
    location: 'Mar de las Pampas',
    price: 143000,
    rating: 4.7,
    reviewsCount: 10,
  },
] as any[];

const renderSection = (props?: Partial<React.ComponentProps<typeof ExploreResultsSection>>) => {
  const defaultProps: React.ComponentProps<typeof ExploreResultsSection> = {
    loading: false,
    loadError: null,
    viewMode: 'grid',
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

    expect(screen.getByRole('heading', { name: 'Primero revisá estas opciones' })).toBeInTheDocument();
    expect(screen.getByText('Cada aviso te muestra quién publica, dónde está y qué ya se pudo confirmar.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Más opciones para comparar' })).toBeInTheDocument();
    expect(screen.getByText('Casa frente al mar')).toBeInTheDocument();
    expect(screen.getByText('Departamento luminoso')).toBeInTheDocument();
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