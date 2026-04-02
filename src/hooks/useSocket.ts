import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;

    // Connect to the same host that served the page
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('notification', (notification: { title: string; message: string; type: string }) => {
      // In a real app, we'd use a toast library. For now, we'll use a custom event or just alert.
      const event = new CustomEvent('app-notification', { detail: notification });
      window.dispatchEvent(event);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return socketRef.current;
}
