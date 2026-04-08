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

  test('sends verifiedOnly=true when the more-information filter is enabled', async () => {
    render(<ExplorePage />);

    await waitFor(() => {
      expect(apiJsonMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /Solo con más información comprobada/i }));

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
        rating: 4.8,
        reviewsCount: 12,
        identityValidated: true,
        locationVerified: true,
        videoValidated: true,
        verificationScore: 4,
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
});