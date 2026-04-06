import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const useFavoritesMock = vi.fn();

vi.mock('../../hooks/useFavorites', () => ({
  useFavorites: () => useFavoritesMock(),
}));

vi.mock('../PropertyCard', () => ({
  PropertyCard: ({ property, onFavoriteToggle }: any) => (
    <div data-testid="saved-property-card" data-title={property.title}>
      <span>{property.title}</span>
      <button type="button" onClick={() => onFavoriteToggle?.(property.id, false)}>
        Quitar guardado
      </button>
    </div>
  ),
}));

import { FavoritesView } from '../FavoritesView';

describe('FavoritesView', () => {
  beforeEach(() => {
    useFavoritesMock.mockReset();
  });

  test('renders the empty state when there are no favorites', () => {
    useFavoritesMock.mockReturnValue({
      favoritesMap: new Map(),
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
      isLoading: false,
      clearAllFavorites: vi.fn(),
    });

    render(
      <MemoryRouter>
        <FavoritesView />
      </MemoryRouter>
    );

    expect(screen.getByText('Todavía no guardaste propiedades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explorá propiedades/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cómo funciona/i })).toBeInTheDocument();
  });

  test('orders saved properties by real verification before the original saved order', () => {
    useFavoritesMock.mockReturnValue({
      favoritesMap: new Map([
        ['p-low', {
          id: 'p-low',
          title: 'Casa con menos comprobaciones',
          identityValidated: true,
          locationVerified: false,
          videoValidated: false,
          propertyRelationshipVerified: false,
          hasPresencialVerification: false,
        }],
        ['p-high', {
          id: 'p-high',
          title: 'Casa con más comprobaciones',
          identityValidated: true,
          locationVerified: true,
          videoValidated: true,
          propertyRelationshipVerified: false,
          hasPresencialVerification: true,
        }],
      ]),
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => true),
      isLoading: false,
      clearAllFavorites: vi.fn(),
    });

    render(
      <MemoryRouter>
        <FavoritesView />
      </MemoryRouter>
    );

    expect(screen.getByText('Compará con calma, retomá lo que te interesó y revisá primero las que ya tienen más comprobaciones reales.')).toBeInTheDocument();
    expect(screen.getAllByTestId('saved-property-card').map((card) => card.getAttribute('data-title'))).toEqual([
      'Casa con más comprobaciones',
      'Casa con menos comprobaciones',
    ]);
  });

  test('shows local removal feedback with undo after removing a favorite', async () => {
    const toggleFavoriteMock = vi
      .fn()
      .mockResolvedValueOnce('removed')
      .mockResolvedValueOnce('added');

    useFavoritesMock.mockReturnValue({
      favoritesMap: new Map([
        ['p1', { id: 'p1', title: 'Casa frente al mar', location: 'San Clemente', price: 120000 }],
      ]),
      toggleFavorite: toggleFavoriteMock,
      isFavorite: vi.fn(() => true),
      isLoading: false,
      clearAllFavorites: vi.fn(),
    });

    render(
      <MemoryRouter>
        <FavoritesView />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Quitar guardado/i }));

    expect(await screen.findByText('Quitamos una propiedad de tus guardados.')).toBeInTheDocument();
    expect(screen.getAllByText('Casa frente al mar')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /Deshacer/i }));

    await waitFor(() => {
      expect(toggleFavoriteMock).toHaveBeenCalledTimes(2);
    });

    expect(toggleFavoriteMock).toHaveBeenNthCalledWith(1, 'p1');
    expect(toggleFavoriteMock).toHaveBeenNthCalledWith(2, 'p1');
  });
});