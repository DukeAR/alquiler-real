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

    await waitFor(() => {
      const latestCall = exploreResultsSectionMock.mock.calls.at(-1)?.[0];

      expect(latestCall?.verifiedOnly).toBe(true);
    });
  });

  test('normalizes missing verification data and ignores null properties before applying the verified-only filter', async () => {
    apiJsonMock.mockResolvedValue([
      null,
      {
        id: 'p1',
        title: 'Departamento básico',
        location: 'Pinamar',
        price: 65000,
        description: 'Sin datos de verificación cargados.',
        propertyType: 'apartment',
        maxGuests: 2,
        rating: 4.2,
        reviewsCount: 3,
        coordinates: { lat: -37.11, lng: -56.86 },
      },
    ]);

    render(<ExplorePage />);

    await waitFor(() => {
      expect(exploreResultsSectionMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      const latestCall = exploreResultsSectionMock.mock.calls.at(-1)?.[0];

      expect(latestCall?.filteredProperties).toHaveLength(1);
      expect(latestCall?.filteredProperties[0]).toMatchObject({
        id: 'p1',
        verificationLevel: 'none',
        identityValidated: false,
        isIdentityVerified: false,
        hasPresencialVerification: false,
        isPresentiallyVerified: false,
      });
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /Solo verificados presencialmente/i }));

    await waitFor(() => {
      const latestCall = exploreResultsSectionMock.mock.calls.at(-1)?.[0];

      expect(latestCall?.verifiedOnly).toBe(true);
      expect(latestCall?.filteredProperties).toEqual([]);
      expect(latestCall?.listingProperties).toEqual([]);
    });
  });

  test('does not refetch properties on unrelated rerenders', async () => {
    apiJsonMock.mockResolvedValue([
      {
        id: 'p1',
        title: 'Departamento básico',
        location: 'Pinamar',
        price: 65000,
        description: 'Sin datos de verificación cargados.',
        propertyType: 'apartment',
        maxGuests: 2,
        rating: 4.2,
        reviewsCount: 3,
        coordinates: { lat: -37.11, lng: -56.86 },
      },
    ]);

    const { rerender } = render(<ExplorePage />);

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledTimes(1);
    });

    rerender(<ExplorePage />);

    await waitFor(() => {
      expect(exploreResultsSectionMock).toHaveBeenCalled();
    });

    expect(apiJsonMock).toHaveBeenCalledTimes(1);
  });

  test('filters results by real availability when a complete date range is selected', async () => {
    apiJsonMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/properties?')) {
        return [
          {
            id: 'p1',
            title: 'Casa ocupada',
            location: 'Pinamar',
            price: 65000,
            description: 'No disponible para el rango buscado.',
            propertyType: 'house',
            maxGuests: 4,
            rating: 4.3,
            reviewsCount: 5,
          },
          {
            id: 'p2',
            title: 'Depto disponible',
            location: 'Pinamar',
            price: 72000,
            description: 'Disponible para la fecha elegida.',
            propertyType: 'apartment',
            maxGuests: 3,
            rating: 4.5,
            reviewsCount: 7,
          },
        ];
      }

      if (url === '/api/properties/p1/availability') {
        return [{ start: '2099-01-15', end: '2099-01-18' }];
      }

      if (url === '/api/properties/p2/availability') {
        return [{ start: '2099-01-20', end: '2099-01-22' }];
      }

      return [];
    });

    render(<ExplorePage />);

    await waitFor(() => {
      expect(screen.getByText('2 resultados')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Ingreso'), { target: { value: '2099-01-15' } });
    fireEvent.change(screen.getByLabelText('Salida'), { target: { value: '2099-01-18' } });

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalledWith('/api/properties/p1/availability');
      expect(apiJsonMock).toHaveBeenCalledWith('/api/properties/p2/availability');
    });

    await waitFor(() => {
      const latestCall = exploreResultsSectionMock.mock.calls.at(-1)?.[0];

      expect(latestCall?.availabilityFiltering).toBe(true);
      expect(latestCall?.filteredProperties.map((property: { id: string }) => property.id)).toEqual(['p2']);
      expect(latestCall?.listingProperties.map((property: { id: string }) => property.id)).toEqual(['p2']);
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

  test('keeps verification-first home results ordered from the highest visible verification level', async () => {
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

    expect(latestCall.showSectionedCatalog).toBe(true);
    expect(latestCall.featuredProperties.map((property: { id: string }) => property.id)).toEqual([
      'presencial-1',
      'presencial-2',
      'presencial-3',
    ]);
    expect(latestCall.identityValidatedProperties.map((property: { id: string }) => property.id)).toEqual([
      'identity-1',
      'identity-2',
    ]);
    expect(latestCall.listingProperties.map((property: { id: string }) => property.id)).toEqual([
      'none-1',
    ]);
    expect(latestCall.newlyListedProperties).toEqual([]);
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

    expect(latestCall.showSectionedCatalog).toBe(true);
    expect(latestCall.featuredProperties.map((property: { id: string }) => property.id)).toEqual(['presencial-1']);
    expect(latestCall.identityValidatedProperties.map((property: { id: string }) => property.id)).toEqual(['identity-1']);
    expect(latestCall.listingProperties.map((property: { id: string }) => property.id)).toEqual(['none-1']);
    expect(latestCall.visibleProperties.map((property: { id: string }) => property.id)).toEqual(['none-1']);
  });
});