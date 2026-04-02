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
    viewMode: 'grid',
    hasActiveFilters: false,
    searchQuery: '',
    appliedFilterCount: 0,
    filteredProperties: sampleProperties,
    topRated: [sampleProperties[0]],
    listingProperties: [sampleProperties[1], sampleProperties[2]],
    visibleProperties: [sampleProperties[1], sampleProperties[2]],
    hasMoreResults: false,
    onLoadMore: vi.fn(),
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
  test('renders the improved summary and featured hierarchy in gallery mode', () => {
    renderSection();

    expect(screen.getByText('Empezá por propiedades con mejores señales')).toBeInTheDocument();
    expect(screen.getByText('La exploración arranca por las mejores señales')).toBeInTheDocument();
    expect(screen.getByText('Propiedades mejor valoradas')).toBeInTheDocument();
    expect(screen.getAllByText('1 destacada')).toHaveLength(2);
    expect(screen.getByText('Seguí explorando propiedades')).toBeInTheDocument();
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
      topRated: [],
      listingProperties: [],
      visibleProperties: [],
      onClearFilters,
    });

    expect(screen.getByText('No encontramos coincidencias con esa búsqueda')).toBeInTheDocument();
    expect(screen.getByText('No encontramos propiedades con esa combinación')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});