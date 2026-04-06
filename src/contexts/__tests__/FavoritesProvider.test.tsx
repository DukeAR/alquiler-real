import { useContext } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import FavoritesProvider, { FavoritesContext } from '../FavoritesContext';

const useAuthMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../lib/apiConfig', () => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
}));

vi.mock('../../lib/toast', () => ({
  showToast: vi.fn(),
}));

import { apiFetch, apiJson } from '../../lib/apiConfig';

const FavoritesHarness = () => {
  const context = useContext(FavoritesContext);

  if (!context) {
    return null;
  }

  return (
    <div>
      <div data-testid="favorites-count">{context.getFavoritesCount()}</div>
      <div data-testid="unseen-count">{context.getUnseenFavoritesCount()}</div>
      <button type="button" onClick={() => void context.toggleFavorite('p2')}>
        Toggle p2
      </button>
      <button type="button" onClick={() => context.markFavoritesAsSeen()}>
        Mark seen
      </button>
    </div>
  );
};

describe('FavoritesProvider', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiJson).mockReset();
    localStorage.clear();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'tenant' },
      loading: false,
    });
  });

  test('uses the current favorites as the initial seen baseline for a user with no stored state', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([{ id: 'p1', title: 'Casa frente al mar' }]),
    } as Response);

    render(
      <FavoritesProvider>
        <FavoritesHarness />
      </FavoritesProvider>
    );

    await waitFor(() => expect(screen.getByTestId('favorites-count')).toHaveTextContent('1'));
    expect(screen.getByTestId('unseen-count')).toHaveTextContent('0');
    expect(localStorage.getItem('seenFavorites_v1:u1')).toBe(JSON.stringify(['p1']));
  });

  test('tracks newly added favorites as unseen until the user opens Guardados', async () => {
    localStorage.setItem('seenFavorites_v1:u1', JSON.stringify(['p1']));

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ([{ id: 'p1', title: 'Casa frente al mar' }]),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ success: true, propertyId: 'p2' }),
      } as Response);
    vi.mocked(apiJson).mockResolvedValueOnce({ id: 'p2', title: 'Departamento tranquilo' });

    render(
      <FavoritesProvider>
        <FavoritesHarness />
      </FavoritesProvider>
    );

    await waitFor(() => expect(screen.getByTestId('unseen-count')).toHaveTextContent('0'));

    fireEvent.click(screen.getByRole('button', { name: 'Toggle p2' }));

    await waitFor(() => expect(screen.getByTestId('favorites-count')).toHaveTextContent('2'));
    expect(screen.getByTestId('unseen-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Mark seen' }));

    await waitFor(() => expect(screen.getByTestId('unseen-count')).toHaveTextContent('0'));
    expect(localStorage.getItem('seenFavorites_v1:u1')).toBe(JSON.stringify(['p1', 'p2']));
  });

  test('keeps remote favorites unseen when they were not part of the last viewed set', async () => {
    localStorage.setItem('seenFavorites_v1:u1', JSON.stringify(['p1']));

    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([
        { id: 'p1', title: 'Casa frente al mar' },
        { id: 'p2', title: 'Departamento tranquilo' },
      ]),
    } as Response);

    render(
      <FavoritesProvider>
        <FavoritesHarness />
      </FavoritesProvider>
    );

    await waitFor(() => expect(screen.getByTestId('favorites-count')).toHaveTextContent('2'));
    expect(screen.getByTestId('unseen-count')).toHaveTextContent('1');
  });
});
