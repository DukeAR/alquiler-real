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

vi.mock('../ui/AccountModeSwitch', () => ({
  AccountModeSwitch: () => <div data-testid="account-mode-switch">Mode switch</div>,
}));

const createDomRect = (bottom: number) => ({
  x: 0,
  y: 0,
  width: 100,
  height: bottom,
  top: 0,
  right: 100,
  bottom,
  left: 0,
  toJSON: () => ({}),
});

const DetailHeroMarker = ({ bottom = 640 }: { bottom?: number }) => (
  <div
    data-property-detail-hero
    ref={(node) => {
      if (!node) {
        return;
      }

      Object.defineProperty(node, 'getBoundingClientRect', {
        configurable: true,
        value: () => createDomRect(bottom),
      });
    }}
  >
    Hero
  </div>
);

const renderShell = async (initialEntries: string[] = ['/'], children: React.ReactNode = <div>Contenido</div>) => {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <AppShell>
          {children}
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

    const homeButton = screen.getByRole('button', { name: 'Ir al inicio de Alquiler Real' });
    const logoMark = homeButton.querySelector('img');

    expect(screen.queryByRole('button', { name: 'Guardados' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('notifications-menu')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cómo funciona' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ayuda' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ingresá' })).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Publicar propiedad' })).toBeInTheDocument();
    expect(logoMark).not.toBeNull();
    expect(logoMark).toHaveAttribute('src', '/verified-presencial-badge3.png');
  });

  test('shows Guardados when the user is authenticated', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'u1',
        name: 'Ana',
        email: 'ana@test.com',
        role: 'tenant',
        canGuest: true,
        canHost: false,
        activeMode: 'guest',
      },
      loading: false,
      status: 'authenticated',
      refresh: vi.fn(async () => undefined),
    });

    await renderShell();

    expect(screen.getAllByRole('button', { name: 'Guardados' })).not.toHaveLength(0);
    expect(screen.getByTestId('notifications-menu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar propiedad' })).not.toBeInTheDocument();
    expect(screen.getByTestId('account-mode-switch')).toBeInTheDocument();
  });

  test('marks Guardados as seen when an authenticated user opens the section', async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: 'u1',
        name: 'Ana',
        email: 'ana@test.com',
        role: 'tenant',
        canGuest: true,
        canHost: false,
        activeMode: 'guest',
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
    expect(screen.queryByRole('button', { name: 'Publicar propiedad' })).not.toBeInTheDocument();
    expect(screen.getByText('Verificando sesión...')).toBeInTheDocument();
  });

  test('falls back to guest auth actions on public routes when session verification failed', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      status: 'error',
      refresh: vi.fn(async () => ({ user: null, status: 'error', error: 'session failed' })),
    });

    await renderShell();

    expect(screen.getAllByRole('button', { name: 'Ingresá' })).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Publicar propiedad' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar sesión' })).not.toBeInTheDocument();
  });

  test('hides the mobile navigation on detail routes to avoid stacked fixed bars', async () => {
    await renderShell(['/detail/p1']);

    expect(screen.getByRole('link', { name: 'Explorar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ayuda' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Explorar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ayuda' })).not.toBeInTheDocument();
  });

  test('uses the transparent overlay header on property detail while the hero is visible', async () => {
    await renderShell(['/detail/p1'], <DetailHeroMarker />);

    expect(screen.getByRole('banner')).toHaveClass('app-header-detail');
    expect(screen.getByRole('banner')).toHaveClass('app-header-on-hero');
  });
});