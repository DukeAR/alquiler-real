import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/apiConfig';
import { APP_USER_NOTIFICATION_EVENT, showToast, type ToastPayload, type ToastType } from '../lib/toast';
import { useAuth } from './useAuth';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  createdAt: string;
  unread: boolean;
};

export type NotificationStatus = 'auth-loading' | 'logged-out' | 'loading' | 'ready' | 'error';

type NotificationResponseShape = {
  notifications?: unknown;
  items?: unknown;
  unread_count?: unknown;
  unreadCount?: unknown;
};

const DEFAULT_NOTIFICATIONS_ERROR = 'No pudimos cargar las notificaciones. Reintentá.';

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

export const useNotifications = () => {
  const { user, loading: authLoading, status: authStatus, refresh } = useAuth();
  const [status, setStatus] = useState<NotificationStatus>(authLoading ? 'auth-loading' : user ? 'loading' : authStatus === 'error' ? 'error' : 'logged-out');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const activeUserIdRef = useRef<string | null>(user?.id ?? null);
  const requestIdRef = useRef(0);
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  const resetState = useCallback(() => {
    requestIdRef.current += 1;
    setNotifications([]);
    setErrorMessage(null);
    setHasLoaded(false);
    setHasAttemptedLoad(false);
    setIsMarkingAllRead(false);
  }, []);

  const setLoggedOutState = useCallback(() => {
    setStatus('logged-out');
    setErrorMessage(null);
  }, []);

  const setErrorState = useCallback((message = DEFAULT_NOTIFICATIONS_ERROR) => {
    setStatus('error');
    setErrorMessage(message);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (authLoading || authStatus === 'loading') {
      setStatus('auth-loading');
      return;
    }

    if (!user) {
      if (authStatus === 'error') {
        setErrorState();
        return;
      }

      setLoggedOutState();
      return;
    }

    const requestUserId = user.id;
    setHasAttemptedLoad(true);

    const run = async (retryAfterRefresh: boolean): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setStatus('loading');
      setErrorMessage(null);

      try {
        const response = await apiFetch('/api/notifications', { includeCredentials: true });

        if (activeUserIdRef.current !== requestUserId || requestId !== requestIdRef.current) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          const session = await refresh();

          if (activeUserIdRef.current !== requestUserId || requestId !== requestIdRef.current) {
            return;
          }

          if (session.status === 'authenticated' && session.user?.id === requestUserId && retryAfterRefresh) {
            await run(false);
            return;
          }

          if (session.status === 'unauthenticated') {
            resetState();
            setLoggedOutState();
            return;
          }

          setErrorState();
          return;
        }

        if (!response.ok) {
          setErrorState();
          return;
        }

        const payload = await response.json();

        if (activeUserIdRef.current !== requestUserId || requestId !== requestIdRef.current) {
          return;
        }

        const nextState = parseNotificationResponse(payload);
        setNotifications(nextState.items);
        setHasLoaded(true);
        setStatus('ready');
        setErrorMessage(null);
      } catch (error) {
        if (activeUserIdRef.current !== requestUserId || requestId !== requestIdRef.current) {
          return;
        }

        console.error('[useNotifications] Failed to load notifications:', error);
        setErrorState();
      }
    };

    await run(true);
  }, [authLoading, authStatus, refresh, resetState, setErrorState, setLoggedOutState, user]);

  const markAllAsRead = useCallback(async () => {
    if (!user || unreadCount === 0 || isMarkingAllRead) {
      return false;
    }

    const requestUserId = user.id;
    const unreadNotificationIds = new Set(
      notifications
        .filter((notification) => notification.unread)
        .map((notification) => notification.id)
    );

    setNotifications((current) => current.map((notification) => (
      unreadNotificationIds.has(notification.id) && notification.unread
        ? { ...notification, unread: false }
        : notification
    )));
    setStatus('ready');
    setErrorMessage(null);
    setHasAttemptedLoad(true);
    setHasLoaded(true);
    setIsMarkingAllRead(true);

    try {
      let response = await apiFetch('/api/notifications/read-all', {
        method: 'POST',
        includeCredentials: true,
      });

      if (response.status === 401 || response.status === 403) {
        const session = await refresh();

        if (session.status === 'unauthenticated') {
          resetState();
          setLoggedOutState();
          return false;
        }

        if (session.status !== 'authenticated' || session.user?.id !== requestUserId) {
          setNotifications((current) => current.map((notification) => (
            unreadNotificationIds.has(notification.id) ? { ...notification, unread: true } : notification
          )));
          showToast('Notificaciones', DEFAULT_NOTIFICATIONS_ERROR, 'error');
          return false;
        }

        response = await apiFetch('/api/notifications/read-all', {
          method: 'POST',
          includeCredentials: true,
        });
      }

      if (!response.ok) {
        throw new Error('mark-all-read-failed');
      }

      return true;
    } catch (error) {
      setNotifications((current) => current.map((notification) => (
        unreadNotificationIds.has(notification.id) ? { ...notification, unread: true } : notification
      )));
      console.error('[useNotifications] Failed to mark notifications as read:', error);
      showToast('Notificaciones', 'No pudimos actualizar tus notificaciones. Reintentá.', 'error');
      return false;
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [isMarkingAllRead, notifications, refresh, resetState, setLoggedOutState, unreadCount, user]);

  useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (activeUserIdRef.current !== nextUserId) {
      activeUserIdRef.current = nextUserId;
      resetState();
    }

    if (authLoading || authStatus === 'loading') {
      setStatus('auth-loading');
      return;
    }

    if (!user) {
      if (authStatus === 'error') {
        setErrorState();
      } else {
        setLoggedOutState();
      }
      return;
    }

    if (!hasAttemptedLoad) {
      void loadNotifications();
      return;
    }

    if (status === 'loading') {
      return;
    }

    if (errorMessage) {
      setStatus('error');
      return;
    }

    setStatus('ready');
  }, [authLoading, authStatus, errorMessage, hasAttemptedLoad, loadNotifications, resetState, setErrorState, setLoggedOutState, status, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleNotification = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload & { id?: string; createdAt?: string; unread?: boolean }>).detail;
      const nextNotification = normalizeNotificationItem(detail as unknown as Record<string, unknown>, 0, true);

      setNotifications((current) => {
        return [nextNotification, ...current.filter((item) => item.id !== nextNotification.id)];
      });

      setHasAttemptedLoad(true);
      setHasLoaded(true);
      setStatus('ready');
      setErrorMessage(null);
    };

    window.addEventListener(APP_USER_NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(APP_USER_NOTIFICATION_EVENT, handleNotification);
  }, [user]);

  return {
    status,
    notifications,
    unreadCount,
    errorMessage,
    hasLoaded,
    isMarkingAllRead,
    loadNotifications,
    markAllAsRead,
  };
};

export default useNotifications;