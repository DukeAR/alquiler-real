import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const useAuthMock = vi.fn();
const apiJsonMock = vi.fn();
const consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../lib/apiConfig', () => ({
  apiJson: (...args: unknown[]) => apiJsonMock(...args),
}));

vi.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../contexts/FavoritesContext', () => ({
  FavoritesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/LoadingState', () => ({
  LoadingState: ({ message, description }: { message?: string; description?: string }) => (
    <div>
      <p>{message}</p>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock('../components/ErrorState', () => ({
  ErrorState: ({
    title,
    description,
    onRetry,
    onDismiss,
    dismissLabel,
  }: {
    title: string;
    description?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    dismissLabel?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {onRetry ? <button type="button" onClick={onRetry}>Intentar de nuevo</button> : null}
      {onDismiss ? <button type="button" onClick={onDismiss}>{dismissLabel ?? 'Cerrar'}</button> : null}
    </div>
  ),
}));

vi.mock('../components/EmptyState', () => ({
  EmptyState: ({
    title,
    description,
    action,
    secondaryAction,
  }: {
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
    secondaryAction?: { label: string; onClick: () => void };
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {action ? <button type="button" onClick={action.onClick}>{action.label}</button> : null}
      {secondaryAction ? <button type="button" onClick={secondaryAction.onClick}>{secondaryAction.label}</button> : null}
    </div>
  ),
}));

vi.mock('../components/explore/ExplorePage', () => ({
  ExplorePage: () => <div>Explore page</div>,
}));

vi.mock('../components/HostProfileView', () => ({
  HostProfileView: ({ profile }: { profile: { name: string } }) => <div>Perfil: {profile.name}</div>,
}));

vi.mock('../components/Register', () => ({
  Register: ({ mode = 'login' }: { mode?: 'login' | 'register' }) => (
    <div>{mode === 'register' ? 'Register page' : 'Login page'}</div>
  ),
}));

vi.mock('../components/ProfileViewNew.tsx', () => ({
  default: () => <div>Profile page</div>,
}));

vi.mock('../components/HostDashboard', () => ({
  HostDashboard: () => <div>Host dashboard</div>,
}));

vi.mock('../components/TenantProfileView', () => ({
  TenantProfileView: () => <div>Tenant profile</div>,
}));

import App from '../App';

describe('App routing states', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    apiJsonMock.mockReset();
    consoleErrorMock.mockClear();
    useAuthMock.mockReturnValue({ loading: false, user: null, status: 'unauthenticated', refresh: vi.fn(async () => ({ user: null, status: 'unauthenticated', error: null })) });
  });

  afterEach(() => {
    consoleErrorMock.mockClear();
  });

  test('renders public routes while auth is bootstrapping', () => {
    useAuthMock.mockReturnValue({ loading: true, user: null, status: 'loading', refresh: vi.fn(async () => ({ user: null, status: 'unauthenticated', error: null })) });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('Explore page')).toBeInTheDocument();
    expect(screen.queryByText('Cargando tu cuenta...')).not.toBeInTheDocument();
  });

  test('keeps the shared loading state on guest-only routes while auth is bootstrapping', () => {
    useAuthMock.mockReturnValue({ loading: true, user: null, status: 'loading', refresh: vi.fn(async () => ({ user: null, status: 'unauthenticated', error: null })) });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cargando tu cuenta...')).toBeInTheDocument();
    expect(screen.getByText(/Estamos preparando tu sesión, tus preferencias y tus accesos/i)).toBeInTheDocument();
  });

  test('shows a retryable error state when the host profile cannot be loaded', async () => {
    apiJsonMock
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce({
        id: 'host-1',
        name: 'Carla',
      });

    render(
      <MemoryRouter initialEntries={['/host/host-1']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /No pudimos cargar este perfil/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Intentar de nuevo/i }));

    await waitFor(() => {
      expect(screen.getByText('Perfil: Carla')).toBeInTheDocument();
    });

    expect(apiJsonMock).toHaveBeenCalledTimes(2);
  });

  test('shows a soft empty state when the host profile is not found', async () => {
    apiJsonMock.mockRejectedValueOnce(new Error('No encontramos lo que buscás.'));

    render(
      <MemoryRouter initialEntries={['/host/host-404']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: /No encontramos este anfitrión/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explorá propiedades/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Volver$/i })).toBeInTheDocument();
  });

  test('redirects guests to login when they open a role-protected route', async () => {
    render(
      <MemoryRouter initialEntries={['/host-dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  test('allows any authenticated user into the host dashboard', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: {
        id: 'tenant-1',
        name: 'Tenant User',
        email: 'tenant@test.com',
        role: 'tenant',
        canGuest: true,
        canHost: false,
        activeMode: 'guest',
      },
      status: 'authenticated',
      refresh: vi.fn(async () => ({
        user: {
          id: 'tenant-1',
          name: 'Tenant User',
          email: 'tenant@test.com',
          role: 'tenant',
          canGuest: true,
          canHost: false,
          activeMode: 'guest',
        },
        status: 'authenticated',
        error: null,
      })),
    });

    render(
      <MemoryRouter initialEntries={['/host-dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Host dashboard')).toBeInTheDocument();
  });

  test('allows hosts into the host dashboard', async () => {
    useAuthMock.mockReturnValue({
      loading: false,
      user: {
        id: 'host-1',
        name: 'Host User',
        email: 'host@test.com',
        role: 'host',
        canGuest: true,
        canHost: true,
        activeMode: 'host',
      },
      status: 'authenticated',
      refresh: vi.fn(async () => ({
        user: {
          id: 'host-1',
          name: 'Host User',
          email: 'host@test.com',
          role: 'host',
          canGuest: true,
          canHost: true,
          activeMode: 'host',
        },
        status: 'authenticated',
        error: null,
      })),
    });

    render(
      <MemoryRouter initialEntries={['/host-dashboard']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Host dashboard')).toBeInTheDocument();
  });
});