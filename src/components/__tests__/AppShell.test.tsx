import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppShell } from '../AppShell';

const useAuthMock = vi.fn();
const getUnseenFavoritesCountMock = vi.fn();
const markFavoritesAsSeenMock = vi.fn();
const useNotificationsMock = vi.fn();
const accountModeSwitchMock = vi.fn(({
  buttonClassName,
  activeButtonClassName,
  inactiveButtonClassName,
}: {
  buttonClassName?: string;
  activeButtonClassName?: string;
  inactiveButtonClassName?: string;
}) => (
  <div
    data-testid="account-mode-switch"
    data-button-class-name={buttonClassName}
    data-active-button-class-name={activeButtonClassName}
    data-inactive-button-class-name={inactiveButtonClassName}
  >
    Mode switch
  </div>
));

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
  AccountModeSwitch: (props: { buttonClassName?: string }) => accountModeSwitchMock(props),
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
    accountModeSwitchMock.mockClear();
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

  test('keeps the detail header brand clean by removing the badge icon on /detail routes', async () => {
    await renderShell(['/detail/demo_prop_casa_familiar_1']);

    const homeButton = screen.getByRole('button', { name: 'Ir al inicio de Alquiler Real' });
    const logoMark = homeButton.querySelector('img[src="/verified-presencial-badge3.png"]');

    expect(homeButton).toHaveTextContent('Alquiler Real');
    expect(logoMark).toBeNull();
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
    expect(screen.getAllByRole('button', { name: 'Guardados' })[0]).not.toHaveClass('rounded-full');
    expect(screen.queryByRole('button', { name: 'Mis reservas' })).not.toBeInTheDocument();
    expect(screen.getByTestId('notifications-menu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar propiedad' })).not.toBeInTheDocument();
    expect(screen.getByTestId('account-mode-switch')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
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

  test('stretches the public desktop header without relying on fixed offset margins', async () => {
    await renderShell();

    const header = screen.getByRole('banner');
    const headerRow = header.firstElementChild;
    const homeButton = within(header).getByRole('button', { name: 'Ir al inicio de Alquiler Real' });
    const desktopNav = within(header).getByRole('navigation', { name: 'Navegación principal' });
    const exploreLink = within(desktopNav).getByRole('link', { name: 'Explorar' });
    const aboutLink = within(desktopNav).getByRole('link', { name: 'Cómo funciona' });
    const helpLink = within(desktopNav).getByRole('link', { name: 'Ayuda' });
    const aboutIcon = aboutLink.querySelector('svg');
    const helpIcon = helpLink.querySelector('svg');
    const leftGroup = homeButton.parentElement;
    const guestActionsGroup = screen.getByRole('button', { name: 'Publicar propiedad' }).parentElement;

    expect(headerRow).not.toBeNull();
    expect(headerRow).toHaveClass('justify-between');
    expect(leftGroup).not.toBeNull();
    expect(leftGroup).toHaveClass('flex-1');
    expect(leftGroup).toHaveClass('justify-between');
    expect(leftGroup).toHaveClass('lg:gap-8');
    expect(leftGroup).toHaveClass('xl:gap-10');
    expect(desktopNav).toHaveClass('flex-1');
    expect(desktopNav).toHaveClass('justify-between');
    expect(desktopNav).toHaveClass('gap-5');
    expect(desktopNav).toHaveClass('xl:gap-6');
    expect(desktopNav).toHaveClass('px-5');
    expect(desktopNav).toHaveClass('xl:px-8');
    expect(desktopNav).not.toHaveClass('lg:ml-auto');
    expect(desktopNav).not.toHaveClass('lg:pl-6');
    expect(exploreLink).not.toHaveClass('rounded-full');
    expect(exploreLink).not.toHaveClass('border');
    expect(aboutLink).toHaveClass('after:scale-x-100');
    expect(helpLink).toHaveClass('after:scale-x-100');
    expect(aboutIcon).not.toBeNull();
    expect(helpIcon).not.toBeNull();
    expect(aboutIcon).toHaveClass('text-brand');
    expect(helpIcon).toHaveClass('text-brand');

    expect(guestActionsGroup).not.toBeNull();
    expect(guestActionsGroup).toHaveClass('justify-end');
    expect(guestActionsGroup).toHaveClass('lg:pl-3');
    expect(guestActionsGroup).toHaveClass('xl:pl-4');
    expect(guestActionsGroup).toHaveClass('lg:gap-6');
    expect(guestActionsGroup).toHaveClass('xl:gap-7');
    expect(guestActionsGroup).not.toHaveClass('lg:ml-8');
  });

  test('keeps authenticated desktop actions balanced after the header stretches', async () => {
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

    const header = screen.getByRole('banner');
    const desktopNav = within(header).getByRole('navigation', { name: 'Navegación principal' });
    const aboutLink = within(desktopNav).getByRole('link', { name: 'Cómo funciona' });
    const actionsGroup = screen.getByRole('button', { name: 'Ir al perfil' }).parentElement;
    const modeSwitch = screen.getByTestId('account-mode-switch');

    expect(desktopNav).toHaveClass('flex-1');
    expect(desktopNav).toHaveClass('justify-center');
    expect(within(aboutLink).getByText('Cómo funciona')).toBeInTheDocument();
    expect(desktopNav.querySelector('svg')).toBeNull();
    expect(actionsGroup).not.toBeNull();
    expect(actionsGroup).toHaveClass('justify-end');
    expect(actionsGroup).toHaveClass('lg:gap-3');
    expect(actionsGroup).toHaveClass('xl:gap-3.5');
    expect(modeSwitch.getAttribute('data-button-class-name') ?? '').toContain('!h-9');
    expect(modeSwitch.getAttribute('data-active-button-class-name') ?? '').toContain('!bg-brand');
    expect(modeSwitch.getAttribute('data-inactive-button-class-name') ?? '').toContain('!bg-transparent');
  });

  test('replaces the authenticated mobile bottom nav with a menu drawer', async () => {
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

    expect(screen.queryByRole('button', { name: 'Explorar' })).not.toBeInTheDocument();

    const menuButton = screen.getByRole('button', { name: 'Abrir menú' });
    fireEvent.click(menuButton);

    expect(screen.getByRole('dialog', { name: 'Menú principal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mis reservas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cómo funciona' })).toBeInTheDocument();
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