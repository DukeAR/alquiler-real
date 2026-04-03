import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { NotificationsMenu } from '../NotificationsMenu';
import { APP_USER_NOTIFICATION_EVENT } from '../../lib/toast';
import { apiFetch } from '../../lib/apiConfig';

vi.mock('../../lib/apiConfig', () => ({
  apiFetch: vi.fn(),
}));

const renderMenu = (props?: Partial<React.ComponentProps<typeof NotificationsMenu>>) => {
  const defaultProps: React.ComponentProps<typeof NotificationsMenu> = {
    user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'tenant' },
    authLoading: false,
    refreshSession: vi.fn(async () => undefined),
    onLoginRequired: vi.fn(async () => undefined),
  };

  return render(
    <MemoryRouter>
      <NotificationsMenu {...defaultProps} {...props} />
    </MemoryRouter>,
  );
};

describe('NotificationsMenu', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  test('shows the confirmed logged-out state instead of an auth error toast', async () => {
    const onLoginRequired = vi.fn(async () => undefined);

    renderMenu({ user: null, onLoginRequired });

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    expect(screen.getByText('Iniciá sesión para ver tus notificaciones')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresá' }));
    await waitFor(() => expect(onLoginRequired).toHaveBeenCalledTimes(1));
  });

  test('shows auth loading without treating the user as logged out', () => {
    renderMenu({ user: null, authLoading: true });

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    expect(screen.getByText('Cargando notificaciones…')).toBeInTheDocument();
  });

  test('keeps toast events out of the notifications badge and panel', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    renderMenu();

    window.dispatchEvent(new CustomEvent('app-notification', {
      detail: { title: 'Necesitás iniciar sesión', message: 'Iniciá sesión para seguir.', type: 'warning', duration: 5000 },
    }));

    const bellButton = screen.getByRole('button', { name: 'Notificaciones' });
    expect(bellButton).toBeInTheDocument();

    fireEvent.click(bellButton);
    await waitFor(() => expect(screen.getByText('No tenés notificaciones nuevas')).toBeInTheDocument());
  });

  test('shows backend-driven unread count and does not reset it on open', () => {
    renderMenu();

    act(() => {
      window.dispatchEvent(new CustomEvent(APP_USER_NOTIFICATION_EVENT, {
        detail: {
          id: 'n1',
          title: 'Reserva confirmada',
          message: 'Tu anfitrión confirmó la reserva.',
          type: 'success',
          createdAt: '2026-04-03T12:00:00.000Z',
          unread: true,
        },
      }));
    });

    const bellButton = screen.getByRole('button', { name: 'Notificaciones, 1 nuevas' });
    fireEvent.click(bellButton);

    expect(screen.getByText('Reserva confirmada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notificaciones, 1 nuevas' })).toBeInTheDocument();
  });

  test('shows a real error state when notifications cannot be loaded', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'server error' }),
    } as Response);

    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    await waitFor(() => expect(screen.getByText('No pudimos cargar las notificaciones. Reintentá.')).toBeInTheDocument());
  });
});