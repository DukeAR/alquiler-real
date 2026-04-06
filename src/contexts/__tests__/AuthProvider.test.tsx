import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthProvider, useAuthContext } from '../AuthContext';

vi.mock('../../lib/apiConfig', () => ({
  apiFetch: vi.fn()
}));

import { apiFetch } from '../../lib/apiConfig';

const mockedApiFetch = vi.mocked(apiFetch);

const AuthHarness = () => {
  const { login, updateProfile, user, error, loading, status, sessionError, refresh } = useAuthContext();

  return (
    <div>
      <button type="button" onClick={() => void login(' TEST@TEST.COM ', 'secret123')}>
        Ingresar
      </button>
      <button type="button" onClick={() => void updateProfile({ name: 'Nuevo Nombre', zone: 'Costa del Este' })}>
        Guardar perfil
      </button>
      <button type="button" onClick={() => void refresh()}>
        Refrescar sesión
      </button>
      <div data-testid="user-email">{user?.email || 'guest'}</div>
      <div data-testid="user-name">{user?.name || 'guest'}</div>
      <div data-testid="user-role">{user?.role || 'guest'}</div>
      <div data-testid="user-interests">{user?.interests || ''}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="status">{status}</div>
      <div data-testid="error">{error || ''}</div>
      <div data-testid="session-error">{sessionError || ''}</div>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  test('uses the login response user directly', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 'u1',
            name: 'Test User',
            email: 'test@test.com',
            role: 'tenant',
            interests: ['mate', 'futbol']
          }
        })
      } as Response);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('test@test.com'));
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    expect(screen.getByTestId('user-role')).toHaveTextContent('tenant');
    expect(screen.getByTestId('user-interests')).toHaveTextContent('["mate","futbol"]');
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('error')).toHaveTextContent('');
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);

    const loginRequest = mockedApiFetch.mock.calls[1];
    expect(loginRequest?.[0]).toBe('/api/auth/login');
    expect(JSON.parse(String(loginRequest?.[1]?.body))).toEqual({
      email: 'test@test.com',
      password: 'secret123'
    });
  });

  test('falls back to session sync when the login response has no user payload', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 'u2',
            name: 'Fallback User',
            email: 'fallback@test.com',
            role: 'host'
          }
        })
      } as Response);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('fallback@test.com'));
    expect(screen.getByTestId('user-name')).toHaveTextContent('Fallback User');
    expect(screen.getByTestId('user-role')).toHaveTextContent('host');
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('error')).toHaveTextContent('');
    expect(mockedApiFetch).toHaveBeenCalledTimes(3);
    expect(mockedApiFetch.mock.calls[2]?.[0]).toBe('/api/auth/me');
  });

  test('updates the user in context when profile changes are saved', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: null })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 'u3',
            name: 'Nuevo Nombre',
            email: 'nuevo@test.com',
            role: 'tenant',
            zone: 'Costa del Este'
          }
        })
      } as Response);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('Nuevo Nombre'));
    expect(screen.getByTestId('user-email')).toHaveTextContent('nuevo@test.com');
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(mockedApiFetch.mock.calls[1]?.[0]).toBe('/api/auth/profile');
    expect(JSON.parse(String(mockedApiFetch.mock.calls[1]?.[1]?.body))).toEqual({
      name: 'Nuevo Nombre',
      zone: 'Costa del Este'
    });
  });

  test('does not downgrade the session to logged out when /me fails during bootstrap', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: {
        get: () => 'application/json',
      },
      json: async () => ({ error: 'server exploded' }),
    } as unknown as Response);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user-email')).toHaveTextContent('guest');
    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('session-error')).toHaveTextContent('server exploded');
  });

  test('uses the fallback message when /me fails with an empty non-json body', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: {
        get: () => 'text/plain',
      },
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
      text: async () => '',
    } as unknown as Response);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('session-error')).toHaveTextContent('No pudimos recuperar tu sesión. Intentá de nuevo.');
  });

  test('shows the proxy message when the backend local is unavailable', async () => {
    mockedApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: {
        get: () => 'application/json; charset=utf-8',
      },
      json: async () => ({ error: 'No pudimos conectar con el backend local. Levantá npm run server o npm run dev para seguir.' }),
    } as unknown as Response);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('status')).toHaveTextContent('error');
    expect(screen.getByTestId('session-error')).toHaveTextContent('No pudimos conectar con el backend local. Levantá npm run server o npm run dev para seguir.');
  });

  test('preserves the authenticated user when a background session refresh fails', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 'u4',
            name: 'Persisted User',
            email: 'persisted@test.com',
            role: 'tenant',
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'session unavailable' }),
      } as Response);

    render(
      <AuthProvider>
        <AuthHarness />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('persisted@test.com'));

    fireEvent.click(screen.getByRole('button', { name: 'Refrescar sesión' }));

    await waitFor(() => expect(screen.getByTestId('session-error')).toHaveTextContent('session unavailable'));
    expect(screen.getByTestId('user-email')).toHaveTextContent('persisted@test.com');
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });
});