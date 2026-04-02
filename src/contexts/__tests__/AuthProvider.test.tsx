import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthProvider, useAuthContext } from '../AuthContext';

vi.mock('../../lib/apiConfig', () => ({
  apiFetch: vi.fn()
}));

import { apiFetch } from '../../lib/apiConfig';

const mockedApiFetch = vi.mocked(apiFetch);

const AuthHarness = () => {
  const { login, updateProfile, user, error, loading } = useAuthContext();

  return (
    <div>
      <button type="button" onClick={() => void login(' TEST@TEST.COM ', 'secret123')}>
        Ingresar
      </button>
      <button type="button" onClick={() => void updateProfile({ name: 'Nuevo Nombre', zone: 'Costa del Este' })}>
        Guardar perfil
      </button>
      <div data-testid="user-email">{user?.email || 'guest'}</div>
      <div data-testid="user-name">{user?.name || 'guest'}</div>
      <div data-testid="user-role">{user?.role || 'guest'}</div>
      <div data-testid="user-interests">{user?.interests || ''}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="error">{error || ''}</div>
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
        ok: false,
        status: 401,
        json: async () => ({ error: 'No session' })
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

    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));

    await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('test@test.com'));
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
    expect(screen.getByTestId('user-role')).toHaveTextContent('tenant');
    expect(screen.getByTestId('user-interests')).toHaveTextContent('["mate","futbol"]');
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
        ok: false,
        status: 401,
        json: async () => ({ error: 'No session' })
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
    expect(screen.getByTestId('error')).toHaveTextContent('');
    expect(mockedApiFetch).toHaveBeenCalledTimes(3);
    expect(mockedApiFetch.mock.calls[2]?.[0]).toBe('/api/auth/me');
  });

  test('updates the user in context when profile changes are saved', async () => {
    mockedApiFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'No session' })
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
    expect(mockedApiFetch.mock.calls[1]?.[0]).toBe('/api/auth/profile');
    expect(JSON.parse(String(mockedApiFetch.mock.calls[1]?.[1]?.body))).toEqual({
      name: 'Nuevo Nombre',
      zone: 'Costa del Este'
    });
  });
});