import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { NotificationItem, NotificationStatus } from '../hooks/useNotifications';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { Button } from './ui/Button';

type NotificationsMenuProps = {
  status: NotificationStatus;
  notifications: NotificationItem[];
  unreadCount: number;
  errorMessage: string | null;
  isMarkingAllRead: boolean;
  onRefresh: () => Promise<void>;
  onMarkAllAsRead: () => Promise<boolean>;
  onLoginRequired: () => Promise<void> | void;
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
  status,
  notifications,
  unreadCount,
  errorMessage,
  isMarkingAllRead,
  onRefresh,
  onMarkAllAsRead,
  onLoginRequired,
}) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [panelTop, setPanelTop] = useState(72);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePanelTop = () => {
      const headerElement = buttonRef.current?.closest('header') ?? document.querySelector('.app-header');
      const headerHeight = headerElement instanceof HTMLElement ? headerElement.offsetHeight : 56;
      setPanelTop(Math.max(16, headerHeight + 8));
    };

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setIsOpen(false);
      buttonRef.current?.focus();
    };

    updatePanelTop();

    window.addEventListener('resize', updatePanelTop);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updatePanelTop);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!justOpened || status !== 'ready' || unreadCount === 0 || isMarkingAllRead) {
      return;
    }

    void onMarkAllAsRead();
  }, [isMarkingAllRead, isOpen, onMarkAllAsRead, status, unreadCount]);

  const handleToggle = () => {
    setIsOpen((current) => !current);
  };

  const buttonLabel = unreadCount > 0 ? `Notificaciones, ${unreadCount} nuevas` : 'Notificaciones';

  const panelBody = useMemo(() => {
    if (status === 'auth-loading' || status === 'loading') {
      return (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
          </span>
          <p className="text-sm font-medium text-slate-600">Cargando notificaciones…</p>
        </div>
      );
    }

    if (status === 'logged-out') {
      return (
        <div className="space-y-4 px-6 py-8 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Icons.User className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-slate-700">Iniciá sesión para ver tus notificaciones</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => void onLoginRequired()}>
            Ingresá
          </Button>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="space-y-4 px-6 py-8 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Icons.AlertTriangle className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-slate-700">{errorMessage || 'No pudimos cargar las notificaciones. Reintentá.'}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => void onRefresh()}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="space-y-3 px-6 py-10 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Icons.Bell className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-slate-600">No tenés notificaciones nuevas</p>
        </div>
      );
    }

    return (
      <div className="max-h-[calc(min(70vh,32rem)-4.75rem)] overflow-y-auto sm:max-h-72">
        {notifications.map((notification) => (
          <div key={notification.id} className="border-b border-slate-100/90 px-5 py-4 transition-colors hover:bg-slate-50/70 last:border-b-0">
            <div className="flex items-start gap-3">
              <span className={cn(
                'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                notification.unread ? 'bg-red-500' : 'bg-slate-200',
              )} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{formatNotificationDate(notification.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{notification.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }, [errorMessage, notifications, onLoginRequired, onRefresh, status]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-[color,background-color] duration-150 hover:bg-slate-100/80 hover:text-slate-950 focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] sm:h-11 sm:w-11',
          isOpen && 'text-slate-950',
        )}
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
        <div
          id="app-notifications-panel"
          aria-label="Panel de notificaciones"
          style={{ top: `${panelTop}px` }}
          className="fixed inset-x-3 z-[9999] max-h-[min(70vh,32rem)] overflow-hidden rounded-[24px] border border-slate-200/90 bg-white/98 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:w-[22rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-[28px]"
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">Notificaciones</h3>
              <p className="mt-1 hidden text-[11px] font-medium text-slate-500 sm:block">Tu actividad reciente</p>
            </div>
            <div className="flex items-center gap-2">
              {status !== 'logged-out' ? (
                <button
                  type="button"
                  onClick={() => void onRefresh()}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
                >
                  Actualizar
                </button>
              ) : null}
              {status === 'ready' && unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void onMarkAllAsRead()}
                  disabled={isMarkingAllRead}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isMarkingAllRead ? 'Marcando...' : 'Marcar leídas'}
                </button>
              ) : null}
            </div>
          </div>
          {panelBody}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationsMenu;