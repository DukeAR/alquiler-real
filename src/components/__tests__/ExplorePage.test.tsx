import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  clearVerificationPreferenceState,
  getVerificationPreferenceState,
} from '../../lib/verificationPreference';

const apiJsonMock = vi.fn();
const useFavoritesMock = vi.fn();
const exploreResultsSectionMock = vi.fn();

vi.mock('../../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../../hooks/useFavorites', () => ({
  useFavorites: () => useFavoritesMock(),
}));

vi.mock('../explore/ExploreHero', () => ({
  ExploreHero: () => <div>ExploreHero</div>,
}));

vi.mock('../explore/ExploreResultsSection', () => ({
  ExploreResultsSection: (props: any) => {
    exploreResultsSectionMock(props);

    return (
      <div>
        <div>{props.filteredProperties.length} resultados</div>
        {props.caresAboutVerification ? <div>Prefiere verificación</div> : null}
        <button type="button" onClick={() => props.onFavoriteToggle('p1', true)}>
          Guardar desde resultados
        </button>
      </div>
    );
  },
}));

import { ExplorePage } from '../explore/ExplorePage';

describe('ExplorePage', () => {
  beforeEach(() => {
    apiJsonMock.mockReset();
    useFavoritesMock.mockReset();
    exploreResultsSectionMock.mockReset();
    clearVerificationPreferenceState();

    apiJsonMock.mockResolvedValue([]);
    useFavoritesMock.mockReturnValue({
      toggleFavorite: vi.fn(),
      isFavorite: vi.fn(() => false),
    });
  });

  test('sends verifiedOnly=true when the presencial verification filter is enabled', async () => {
    render(<ExplorePage />);

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /Solo verificados presencialmente/i }));

    await waitFor(() => {
      expect(
        apiJsonMock.mock.calls.some(([url]) => (
          typeof url === 'string'
          && url.includes('/api/properties?')
          && url.includes('verifiedOnly=true')
        )),
      ).toBe(true);
    });
  });

  test('activates the local verification preference after saving a highly verified property', async () => {
    const toggleFavorite = vi.fn().mockResolvedValue('added');

    apiJsonMock.mockResolvedValue([
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
        coordinates: { lat: -36.7, lng: -56.7 },
      },
    ]);
    useFavoritesMock.mockReturnValue({
      toggleFavorite,
      isFavorite: vi.fn(() => false),
    });

    render(<ExplorePage />);

    await waitFor(() => {
      expect(screen.getByText('1 resultados')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar desde resultados/i }));

    await waitFor(() => {
      expect(toggleFavorite).toHaveBeenCalledWith('p1');
    });

    await waitFor(() => {
      expect(getVerificationPreferenceState().caresAboutVerification).toBe(true);
    });
  });

  test('keeps verification-first home results in a single mixed grid without rigid featured blocks', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'presencial-1',
        title: 'Casa verificada frente al mar',
        location: 'Costa del Este',
        price: 60000,
        description: 'Con visita presencial completa.',
        propertyType: 'house',
        maxGuests: 5,
        rating: 4.9,
        reviewsCount: 16,
        identityValidated: true,
        locationVerified: true,
        propertyRelationshipVerified: true,
        availabilityValidated: true,
        hasPresencialVerification: true,
        videoValidated: true,
        coordinates: { lat: -36.7, lng: -56.7 },
      },
      {
        id: 'presencial-2',
        title: 'Departamento con verificación presencial',
        location: 'San Bernardo',
        price: 70000,
        description: 'Con identidad, ubicación y acceso confirmados.',
        propertyType: 'apartment',
        maxGuests: 4,
        rating: 4.8,
        reviewsCount: 12,
        identityValidated: true,
        locationVerified: true,
        propertyRelationshipVerified: true,
        availabilityValidated: true,
        hasPresencialVerification: true,
        coordinates: { lat: -36.68, lng: -56.68 },
      },
      {
        id: 'identity-1',
        title: 'PH con identidad validada',
        location: 'Santa Teresita',
        price: 50000,
        description: 'Con validación de identidad visible.',
        propertyType: 'house',
        maxGuests: 4,
        rating: 4.7,
        reviewsCount: 10,
        identityValidated: true,
        hasPresencialVerification: false,
        coordinates: { lat: -36.54, lng: -56.69 },
      },
      {
        id: 'presencial-3',
        title: 'Loft con visita real',
        location: 'Mar de Ajó',
        price: 80000,
        description: 'Con verificación presencial reciente.',
        propertyType: 'apartment',
        maxGuests: 3,
        rating: 4.7,
        reviewsCount: 9,
        identityValidated: true,
        locationVerified: true,
        propertyRelationshipVerified: true,
        availabilityValidated: true,
        hasPresencialVerification: true,
        coordinates: { lat: -36.72, lng: -56.7 },
      },
      {
        id: 'none-1',
        title: 'Cabaña sin validación',
        location: 'Aguas Verdes',
        price: 40000,
        description: 'Sin validaciones visibles.',
        propertyType: 'cabin',
        maxGuests: 3,
        rating: 4.4,
        reviewsCount: 5,
        identityValidated: false,
        hasPresencialVerification: false,
        coordinates: { lat: -36.64, lng: -56.9 },
      },
      {
        id: 'identity-2',
        title: 'Casa con identidad confirmada',
        location: 'Las Toninas',
        price: 55000,
        description: 'Solo con identidad verificada.',
        propertyType: 'house',
        maxGuests: 4,
        rating: 4.5,
        reviewsCount: 6,
        identityValidated: true,
        hasPresencialVerification: false,
        coordinates: { lat: -36.5, lng: -56.7 },
      },
    ]);

    render(<ExplorePage />);

    await waitFor(() => {
      expect(exploreResultsSectionMock).toHaveBeenCalled();
    });

    const latestCall = exploreResultsSectionMock.mock.calls.at(-1)?.[0];

    expect(latestCall.featuredProperties).toEqual([]);
    expect(latestCall.listingProperties.map((property: { id: string }) => property.id)).toEqual([
      'presencial-1',
      'presencial-2',
      'identity-1',
      'presencial-3',
      'none-1',
      'identity-2',
    ]);
  });

  test('keeps a single presencial result at the front of the main verification-first grid', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'presencial-1',
        title: 'Casa verificada frente al mar',
        location: 'Costa del Este',
        price: 120000,
        description: 'Con visita presencial completa.',
        propertyType: 'house',
        maxGuests: 5,
        rating: 4.9,
        reviewsCount: 16,
        identityValidated: true,
        locationVerified: true,
        propertyRelationshipVerified: true,
        availabilityValidated: true,
        hasPresencialVerification: true,
        videoValidated: true,
        coordinates: { lat: -36.7, lng: -56.7 },
      },
      {
        id: 'identity-1',
        title: 'PH con identidad validada',
        location: 'Santa Teresita',
        price: 78000,
        description: 'Con validación de identidad visible.',
        propertyType: 'house',
        maxGuests: 4,
        rating: 4.7,
        reviewsCount: 10,
        identityValidated: true,
        hasPresencialVerification: false,
        coordinates: { lat: -36.54, lng: -56.69 },
      },
      {
        id: 'none-1',
        title: 'Cabaña sin validación',
        location: 'Aguas Verdes',
        price: 52000,
        description: 'Sin validaciones visibles.',
        propertyType: 'cabin',
        maxGuests: 3,
        rating: 4.4,
        reviewsCount: 5,
        identityValidated: false,
        hasPresencialVerification: false,
        coordinates: { lat: -36.64, lng: -56.9 },
      },
    ]);

    render(<ExplorePage />);

    await waitFor(() => {
      expect(exploreResultsSectionMock).toHaveBeenCalled();
    });

    const latestCall = exploreResultsSectionMock.mock.calls.at(-1)?.[0];

    expect(latestCall.featuredProperties).toEqual([]);
    expect(latestCall.listingProperties.map((property: { id: string }) => property.id)).toEqual(['presencial-1', 'identity-1', 'none-1']);
    expect(latestCall.visibleProperties.map((property: { id: string }) => property.id)).toEqual(['presencial-1', 'identity-1', 'none-1']);
  });
});