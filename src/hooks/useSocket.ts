import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../lib/apiConfig';
import { emitUserNotification, showToast, type ToastType, type UserNotificationPayload } from '../lib/toast';

const normalizeNotificationType = (value: string): ToastType => {
  if (value === 'success' || value === 'warning' || value === 'error') {
    return value;
  }

  return 'info';
};

const getSocketEndpoint = () => {
  const explicitEndpoint = typeof import.meta.env.VITE_DEV_API_PROXY_TARGET === 'string'
    ? import.meta.env.VITE_DEV_API_PROXY_TARGET.trim().replace(/\/+$/, '')
    : '';

  if (explicitEndpoint) {
    return explicitEndpoint;
  }

  if (API_BASE_URL) {
    return API_BASE_URL;
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return undefined;
};

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    // Connect to the same host that served the page
    const socketEndpoint = getSocketEndpoint();
    const socket = socketEndpoint
      ? io(socketEndpoint, { withCredentials: true })
      : io({ withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('notification', (notification: UserNotificationPayload) => {
      const type = normalizeNotificationType(notification.type);

      emitUserNotification({
        ...notification,
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type,
        createdAt: notification.createdAt,
        unread: notification.unread ?? true,
      });
      showToast(notification.title, notification.message, type);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return socketRef.current;
}
