import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { isDemoMode } from '../lib/demoMode';
import { emitUserNotification, showToast, type ToastType } from '../lib/toast';

const normalizeNotificationType = (value: string): ToastType => {
  if (value === 'success' || value === 'warning' || value === 'error') {
    return value;
  }

  return 'info';
};

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || isDemoMode()) return;

    // Connect to the same host that served the page
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('notification', (notification: { title: string; message: string; type: string; id?: string; createdAt?: string }) => {
      const type = normalizeNotificationType(notification.type);

      emitUserNotification({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type,
        createdAt: notification.createdAt,
        unread: true,
      });
      showToast(notification.title, notification.message, type);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return socketRef.current;
}
