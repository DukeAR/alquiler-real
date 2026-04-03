import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/apiConfig';
import { APP_USER_NOTIFICATION_EVENT, type ToastPayload, type ToastType } from '../lib/toast';
import type { User } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { Button } from './ui/Button';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  createdAt: string;
  unread: boolean;
};

type NotificationStatus = 'auth-loading' | 'logged-out' | 'loading' | 'ready' | 'error';

type NotificationsMenuProps = {
  user: User | null;
  authLoading: boolean;
  refreshSession: () => Promise<void>;
  onLoginRequired: () => Promise<void> | void;
};

type NotificationResponseShape = {
  notifications?: unknown;
  items?: unknown;
  unread_count?: unknown;
  unreadCount?: unknown;
};

const normalizeNotificationType = (value: unknown): ToastType => {
  if (value === 'success' || value === 'warning' || value === 'error') {
    return value;
  }

  return 'info';
};

const normalizeNotificationItem = (
  value: Record<string, unknown>,
  index: number,
  defaultUnread: boolean,
): NotificationItem => ({
  id: typeof value.id === 'string' && value.id.trim()
    ? value.id
    : `notification-${index}-${typeof value.createdAt === 'string' ? value.createdAt : Date.now()}`,
  title: typeof value.title === 'string' && value.title.trim()
    ? value.title
    : 'Notificación',
  message: typeof value.message === 'string' && value.message.trim()
    ? value.message
    : typeof value.body === 'string' && value.body.trim()
      ? value.body
      : 'Tenemos una actualización para vos.',
  type: normalizeNotificationType(value.type),
  createdAt: typeof value.createdAt === 'string'
    ? value.createdAt
    : typeof value.created_at === 'string'
      ? value.created_at
      : new Date().toISOString(),
  unread: typeof value.unread === 'boolean'
    ? value.unread
    : typeof value.read === 'boolean'
      ? !value.read
      : defaultUnread,
});

const parseNotificationResponse = (payload: unknown) => {
  const response = (payload && typeof payload === 'object' ? payload : {}) as NotificationResponseShape;
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(response.notifications)
      ? response.notifications
      : Array.isArray(response.items)
        ? response.items
        : [];

  const items = rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, index) => normalizeNotificationItem(item, index, false))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const unreadCount = typeof response.unread_count === 'number'
    ? response.unread_count
    : typeof response.unreadCount === 'number'
      ? response.unreadCount
      : items.filter((item) => item.unread).length;

  return { items, unreadCount };
};

const formatNotificationDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Ahora';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({
  user,
  authLoading,
  refreshSession,
  onLoginRequired,
}) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<NotificationStatus>(authLoading ? 'auth-loading' : user ? 'ready' : 'logged-out');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [notificationsApiAvailable, setNotificationsApiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (authLoading) {
      setStatus('auth-loading');
      return;
    }

    if (!user) {
      setStatus('logged-out');
      setNotifications([]);
      setUnreadCount(0);
      setErrorMessage(null);
      setHasLoaded(false);
      setNotificationsApiAvailable(null);
      return;
    }

    setStatus(errorMessage ? 'error' : 'ready');
  }, [authLoading, errorMessage, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleNotification = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload & { id?: string; createdAt?: string; unread?: boolean }>).detail;
      const nextNotification = normalizeNotificationItem(detail as unknown as Record<string, unknown>, 0, true);

      setNotifications((current) => {
        const alreadyPresent = current.some((item) => item.id === nextNotification.id);
        if (!alreadyPresent && nextNotification.unread) {
          setUnreadCount((count) => count + 1);
        }

        return [nextNotification, ...current.filter((item) => item.id !== nextNotification.id)];
      });
      setHasLoaded(true);
      setStatus('ready');
      setErrorMessage(null);
    };

    window.addEventListener(APP_USER_NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(APP_USER_NOTIFICATION_EVENT, handleNotification);
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (authLoading) {
      setStatus('auth-loading');
      return;
    }

    if (!user) {
      setStatus('logged-out');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await apiFetch('/api/notifications', { includeCredentials: true });

      if (response.status === 404) {
        setNotificationsApiAvailable(false);
        setHasLoaded(true);
        setStatus('ready');
        return;
      }

      if (response.status === 401 || response.status === 403) {
        await refreshSession();
        setNotifications([]);
        setUnreadCount(0);
        setHasLoaded(false);
        setStatus('logged-out');
        return;
      }

      if (!response.ok) {
        setStatus('error');
        setErrorMessage('No pudimos cargar las notificaciones. Reintentá.');
        return;
      }

      const payload = await response.json();
      const nextState = parseNotificationResponse(payload);
      setNotifications(nextState.items);
      setUnreadCount(nextState.unreadCount);
      setNotificationsApiAvailable(true);
      setHasLoaded(true);
      setStatus('ready');
    } catch (error) {
      console.error('[NotificationsMenu] Failed to load notifications:', error);
      setStatus('error');
      setErrorMessage('No pudimos cargar las notificaciones. Reintentá.');
    }
  }, [authLoading, refreshSession, user]);

  const handleToggle = () => {
    setIsOpen((current) => {
      const nextOpen = !current;

      if (nextOpen) {
        if (authLoading) {
          setStatus('auth-loading');
        } else if (!user) {
          setStatus('logged-out');
        } else if (!hasLoaded && notificationsApiAvailable !== false) {
          void loadNotifications();
        } else if (errorMessage) {
          setStatus('error');
        } else {
          setStatus('ready');
        }
      }

      return nextOpen;
    });
  };

  const buttonLabel = unreadCount > 0 ? `Notificaciones, ${unreadCount} nuevas` : 'Notificaciones';

  const panelBody = useMemo(() => {
    if (status === 'auth-loading' || status === 'loading') {
      return (
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-sm text-slate-500">
          <Icons.Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <p>Cargando notificaciones…</p>
        </div>
      );
    }

    if (status === 'logged-out') {
      return (
        <div className="space-y-4 px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">Iniciá sesión para ver tus notificaciones</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => void onLoginRequired()}>
            Ingresá
          </Button>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="space-y-4 px-5 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">{errorMessage || 'No pudimos cargar las notificaciones. Reintentá.'}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => void loadNotifications()}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (notifications.length === 0) {
      return <div className="px-5 py-10 text-center text-sm text-slate-500">No tenés notificaciones nuevas</div>;
    }

    return (
      <div className="max-h-72 overflow-y-auto">
        {notifications.map((notification) => (
          <div key={notification.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
            <div className="flex items-start gap-3">
              <span className={cn(
                'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                notification.unread ? 'bg-red-500' : 'bg-slate-200',
              )} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">{formatNotificationDate(notification.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{notification.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [errorMessage, loadNotifications, notifications, onLoginRequired, status]);

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={handleToggle}
        className="app-icon-button"
        aria-label={buttonLabel}
        aria-expanded={isOpen}
        aria-controls="app-notifications-panel"
      >
        <Icons.Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div id="app-notifications-panel" aria-label="Panel de notificaciones" className="absolute right-0 top-14 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-[0_30px_60px_-32px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-black tracking-tight text-slate-900">Notificaciones</h3>
            {user ? (
              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="text-xs font-bold text-brand"
              >
                Actualizar
              </button>
            ) : null}
          </div>
          {panelBody}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationsMenu;