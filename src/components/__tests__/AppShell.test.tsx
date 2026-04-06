import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppShell } from '../AppShell';

const useAuthMock = vi.fn();
const getUnseenFavoritesCountMock = vi.fn();
const markFavoritesAsSeenMock = vi.fn();
const useNotificationsMock = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => useNotificationsMock(),
}));

vi.mock('../../hooks/useFavorites', () => ({
  useFavorites: () => ({
    getUnseenFavoritesCount: getUnseenFavoritesCountMock,
    markFavoritesAsSeen: markFavoritesAsSeenMock,
  }),
}));

vi.mock('../../hooks/useSocket', () => ({
  useSocket: vi.fn(),
}));

vi.mock('../NotificationToast', () => ({
  NotificationToast: () => null,
}));

vi.mock('../NotificationsMenu', () => ({
  NotificationsMenu: () => <div data-testid="notifications-menu" />,
}));

vi.mock('../AIAssistant', () => ({
  AIAssistant: () => null,
}));

vi.mock('../LoginModal', () => ({
  default: () => null,
}));

const renderShell = async () => {
  await act(async () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenido</div>
        </AppShell>
      </MemoryRouter>,
    );
  });
};

describe('AppShell', () => {
  beforeEach(() => {
    getUnseenFavoritesCountMock.mockReset();
    markFavoritesAsSeenMock.mockReset();
    useAuthMock.mockReset();
    useNotificationsMock.mockReset();
    getUnseenFavoritesCountMock.mockReturnValue(0);
    useNotificationsMock.mockReturnValue({
      status: 'logged-out',
      notifications: [],
      unreadCount: 0,
      errorMessage: null,
      isMarkingAllRead: false,
      loadNotifications: vi.fn(async () => undefined),
      markAllAsRead: vi.fn(async () => true),
    });
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      status: 'unauthenticated',
      refresh: vi.fn(async () => undefined),
    });
  });

  test('hides Guardados for guests while keeping the public navigation and auth actions visible', async () => {
    await renderShell();

    expect(screen.queryByRole('button', { name: 'Guardados' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Explorar' })).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Cómo funciona' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ayuda' })).not.toHaveLength(0);
    expect(screen.getAllByRole('button', { name: 'Ingresá' })).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Creá tu cuenta' })).toBeInTheDocument();
  });

  test('shows Guardados when the user is authenticated', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'u1',
        name: 'Ana',
        email: 'ana@test.com',
        role: 'tenant',
      },
      loading: false,
      status: 'authenticated',
      refresh: vi.fn(async () => undefined),
    });

    await renderShell();

    expect(screen.getAllByRole('button', { name: 'Guardados' })).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Creá tu cuenta' })).not.toBeInTheDocument();
  });

  test('marks Guardados as seen when an authenticated user opens the section', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'u1',
        name: 'Ana',
        email: 'ana@test.com',
        role: 'tenant',
      },
      loading: false,
      status: 'authenticated',
      refresh: vi.fn(async () => undefined),
    });
    getUnseenFavoritesCountMock.mockReturnValue(2);

    await renderShell();

    act(() => {
      screen.getAllByRole('button', { name: /Guardados/i })[0]?.click();
    });

    expect(markFavoritesAsSeenMock).toHaveBeenCalledTimes(1);
  });

  test('keeps the header neutral while auth is still loading', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: true,
      status: 'loading',
      refresh: vi.fn(async () => undefined),
    });

    await renderShell();

    expect(screen.queryAllByRole('button', { name: 'Ingresá' })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Creá tu cuenta' })).not.toBeInTheDocument();
    expect(screen.getByText('Verificando sesión...')).toBeInTheDocument();
  });

  test('does not show guest auth actions when session verification failed', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      status: 'error',
      refresh: vi.fn(async () => ({ user: null, status: 'error', error: 'session failed' })),
    });

    await renderShell();

    expect(screen.queryAllByRole('button', { name: 'Ingresá' })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Creá tu cuenta' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar sesión' })).toBeInTheDocument();
  });
});