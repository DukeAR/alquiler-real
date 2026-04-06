import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useNotifications } from '../useNotifications';
import { apiFetch } from '../../lib/apiConfig';
import { APP_USER_NOTIFICATION_EVENT, showToast } from '../../lib/toast';

const useAuthMock = vi.fn();

vi.mock('../useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../lib/apiConfig', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../../lib/toast', async () => {
  const actual = await vi.importActual<typeof import('../../lib/toast')>('../../lib/toast');
  return {
    ...actual,
    showToast: vi.fn(),
  };
});

const Harness = () => {
  const notifications = useNotifications();

  return (
    <div>
      <div data-testid="status">{notifications.status}</div>
      <div data-testid="unread">{notifications.unreadCount}</div>
      <div data-testid="error">{notifications.errorMessage || ''}</div>
      <div data-testid="first-unread">{notifications.notifications[0] ? String(notifications.notifications[0].unread) : ''}</div>
      <button type="button" onClick={() => void notifications.loadNotifications()}>Actualizar</button>
      <button type="button" onClick={() => void notifications.markAllAsRead()}>Marcar</button>
      {notifications.notifications.map((notification) => (
        <p key={notification.id}>{notification.title}</p>
      ))}
    </div>
  );
};

describe('useNotifications', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(showToast).mockReset();
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'tenant' },
      loading: false,
      status: 'authenticated',
      refresh: vi.fn(async () => ({
        user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'tenant' },
        status: 'authenticated',
        error: null,
      })),
    });
  });

  test('loads the persisted unread count for an authenticated user', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            id: 'n1',
            title: 'Reserva confirmada',
            message: 'Tu anfitrión confirmó la reserva.',
            type: 'success',
            createdAt: '2026-04-03T12:00:00.000Z',
            unread: true,
          },
        ],
        unread_count: 1,
      }),
    } as Response);

    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    expect(screen.getByText('Reserva confirmada')).toBeInTheDocument();
  });

  test('distinguishes a confirmed logged-out state from an auth fetch error', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      status: 'error',
      refresh: vi.fn(async () => ({ user: null, status: 'error', error: 'session error' })),
    });

    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    expect(screen.getByTestId('error')).toHaveTextContent('No pudimos cargar las notificaciones. Reintentá.');
  });

  test('refreshes the session before treating a 401 as logged out', async () => {
    const refresh = vi.fn(async () => ({
      user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'tenant' },
      status: 'authenticated',
      error: null,
    }));

    useAuthMock.mockReturnValue({
      user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'tenant' },
      loading: false,
      status: 'authenticated',
      refresh,
    });

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'auth required' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'n1',
              title: 'Reserva confirmada',
              message: 'Tu anfitrión confirmó la reserva.',
              type: 'success',
              createdAt: '2026-04-03T12:00:00.000Z',
              unread: true,
            },
          ],
          unread_count: 1,
        }),
      } as Response);

    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('unread')).toHaveTextContent('1');
  });

  test('clears the unread count immediately and restores it if mark-as-read fails', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'n1',
              title: 'Reserva confirmada',
              message: 'Tu anfitrión confirmó la reserva.',
              type: 'success',
              createdAt: '2026-04-03T12:00:00.000Z',
              unread: true,
            },
          ],
          unread_count: 1,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'server error' }),
      } as Response);

    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('unread')).toHaveTextContent('1'));

    fireEvent.click(screen.getByRole('button', { name: 'Marcar' }));

    expect(screen.getByTestId('unread')).toHaveTextContent('0');
    expect(screen.getByTestId('first-unread')).toHaveTextContent('false');

    await waitFor(() => expect(vi.mocked(showToast)).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    expect(screen.getByTestId('first-unread')).toHaveTextContent('true');
  });

  test('clears the unread count immediately and keeps it cleared after read-all succeeds', async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'n1',
              title: 'Reserva confirmada',
              message: 'Tu anfitrión confirmó la reserva.',
              type: 'success',
              createdAt: '2026-04-03T12:00:00.000Z',
              unread: true,
            },
          ],
          unread_count: 1,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response);

    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('unread')).toHaveTextContent('1'));

    fireEvent.click(screen.getByRole('button', { name: 'Marcar' }));

    expect(screen.getByTestId('unread')).toHaveTextContent('0');
    expect(screen.getByTestId('first-unread')).toHaveTextContent('false');

    await waitFor(() => expect(screen.getByTestId('unread')).toHaveTextContent('0'));
    expect(screen.getByTestId('first-unread')).toHaveTextContent('false');
  });

  test('keeps socket-driven notifications in the shared state', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: [], unread_count: 0 }),
    } as Response);

    render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    act(() => {
      window.dispatchEvent(new CustomEvent(APP_USER_NOTIFICATION_EVENT, {
        detail: {
          id: 'live-1',
          title: 'Documentación enviada',
          message: 'Recibimos tu verificación.',
          type: 'info',
          createdAt: '2026-04-04T10:00:00.000Z',
          unread: true,
        },
      }));
    });

    expect(screen.getByTestId('unread')).toHaveTextContent('1');
    expect(screen.getByText('Documentación enviada')).toBeInTheDocument();
  });
});