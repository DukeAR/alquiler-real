import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { NotificationsMenu } from '../NotificationsMenu';

const renderMenu = (props?: Partial<React.ComponentProps<typeof NotificationsMenu>>) => {
  const defaultProps: React.ComponentProps<typeof NotificationsMenu> = {
    status: 'ready',
    notifications: [],
    unreadCount: 0,
    errorMessage: null,
    isMarkingAllRead: false,
    onRefresh: vi.fn(async () => undefined),
    onMarkAllAsRead: vi.fn(async () => true),
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
  });

  test('shows the confirmed logged-out state instead of an auth error toast', async () => {
    const onLoginRequired = vi.fn(async () => undefined);

    renderMenu({ status: 'logged-out', onLoginRequired });

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    expect(screen.getByText('Iniciá sesión para ver tus notificaciones')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ingresá' }));
    await waitFor(() => expect(onLoginRequired).toHaveBeenCalledTimes(1));
  });

  test('shows auth loading without treating the user as logged out', () => {
    renderMenu({ status: 'auth-loading' });

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    expect(screen.getByText('Cargando notificaciones…')).toBeInTheDocument();
  });

  test('shows the empty authenticated state when there are no notifications', async () => {
    renderMenu({ status: 'ready', notifications: [], unreadCount: 0 });

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    await waitFor(() => expect(screen.getByText('No tenés notificaciones nuevas')).toBeInTheDocument());
  });

  test('requests mark-as-read when the user opens the panel with unread notifications', () => {
    const onMarkAllAsRead = vi.fn(async () => true);

    renderMenu({
      status: 'ready',
      unreadCount: 1,
      onMarkAllAsRead,
      notifications: [
        {
          id: 'n1',
          title: 'Reserva confirmada',
          message: 'Tu anfitrión confirmó la reserva.',
          type: 'success',
          createdAt: '2026-04-03T12:00:00.000Z',
          unread: true,
        },
      ],
    });

    const bellButton = screen.getByRole('button', { name: 'Notificaciones, 1 nuevas' });
    fireEvent.click(bellButton);

    expect(screen.getByText('Reserva confirmada')).toBeInTheDocument();
    expect(onMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  test('renders the panel as a fixed overlay so it stays above the page content', () => {
    renderMenu({
      status: 'ready',
      notifications: [
        {
          id: 'n1',
          title: 'Reserva confirmada',
          message: 'Tu anfitrión confirmó la reserva.',
          type: 'success',
          createdAt: '2026-04-03T12:00:00.000Z',
          unread: true,
        },
      ],
      unreadCount: 1,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones, 1 nuevas' }));

    expect(screen.getByLabelText('Panel de notificaciones')).toHaveClass('fixed');
    expect(screen.getByLabelText('Panel de notificaciones')).toHaveClass('z-[9999]');
  });

  test('shows a real error state when notifications cannot be loaded', async () => {
    const onRefresh = vi.fn(async () => undefined);

    renderMenu({
      status: 'error',
      errorMessage: 'No pudimos cargar las notificaciones. Reintentá.',
      onRefresh,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));

    await waitFor(() => expect(screen.getByText('No pudimos cargar las notificaciones. Reintentá.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  test('shows the mark-as-read action only when there are unread notifications', async () => {
    const onMarkAllAsRead = vi.fn(async () => true);

    renderMenu({
      status: 'ready',
      unreadCount: 2,
      onMarkAllAsRead,
      notifications: [
        {
          id: 'n1',
          title: 'Reserva confirmada',
          message: 'Tu anfitrión confirmó la reserva.',
          type: 'success',
          createdAt: '2026-04-03T12:00:00.000Z',
          unread: true,
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones, 2 nuevas' }));

    await waitFor(() => expect(onMarkAllAsRead).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Marcar leídas' })).toBeInTheDocument();
  });
});