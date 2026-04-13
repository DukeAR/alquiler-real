import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const useFavoritesMock = vi.fn();
const useAuthMock = vi.fn();

vi.mock('../../hooks/useFavorites', () => ({
  useFavorites: () => useFavoritesMock(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../lib/modal', () => ({
  showLoginModal: vi.fn(),
}));

import { FavoritesView } from '../FavoritesView';

const savedProperty = {
  id: 'p1',
  title: 'Casa frente al mar',
  location: 'Santa Teresita',
  price: 120000,
  hostName: 'Laura',
  hostId: 'h1',
  hostSince: '2022-01-01',
  hostExperienceYears: 3,
  historicalConsistency: 95,
  unresolvedReviewsCount: 0,
  identityValidated: true,
  locationVerified: true,
  videoValidated: false,
  traceabilityLevel: 'high' as const,
  imageUrl: 'https://example.com/image.jpg',
  coordinates: { lat: -36.7, lng: -56.7 },
  description: 'Amplia y luminosa.',
  rating: 4.8,
  reviewsCount: 12,
  isSuperHost: true,
  maxGuests: 5,
  propertyType: 'house',
  verificationPhotoCount: 4,
  propertyRelationshipVerified: true,
  hasPresencialVerification: true,
  isVerifiedProperty: true,
};

const secondarySavedProperty = {
  ...savedProperty,
  id: 'p2',
  title: 'Departamento tranquilo',
  location: 'San Clemente',
  identityValidated: true,
  locationVerified: true,
  videoValidated: false,
  propertyType: 'apartment',
  verificationPhotoCount: 0,
  propertyRelationshipVerified: false,
  hasPresencialVerification: false,
  isSuperHost: false,
};

describe('FavoritesView integration', () => {
  beforeEach(() => {
    useFavoritesMock.mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
  });

  test('renders saved properties ordered by real verification with the same card summary', () => {
    useFavoritesMock.mockReturnValue({
      favoritesMap: new Map([
        ['p2', secondarySavedProperty],
        ['p1', savedProperty],
      ]),
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => true),
      isLoading: false,
      markFavoritesAsSeen: vi.fn(),
      clearAllFavorites: vi.fn(),
    });

    render(
      <MemoryRouter>
        <FavoritesView />
      </MemoryRouter>,
    );

    expect(screen.getByText('Compará con calma, retomá lo que te interesó y revisá primero las que ya tienen más comprobaciones reales.')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((title) => title.textContent)).toEqual([
      'Casa frente al mar',
      'Departamento tranquilo',
    ]);
    expect(screen.getByLabelText('4 de 5 comprobaciones')).toBeInTheDocument();
    expect(screen.getByLabelText('3 de 5 comprobaciones')).toBeInTheDocument();
    expect(screen.getAllByText(/^Ubicación$/)).toHaveLength(2);
    expect(screen.getAllByText(/^Anfitrión$/)).toHaveLength(2);
    expect(screen.getAllByText(/^Datos$/)).toHaveLength(2);
    expect(screen.queryByText('Mejor verificado')).toBeNull();
    expect(screen.queryByText('Alto nivel de verificación')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Abrir detalle de/i })).toHaveLength(2);
  });
});