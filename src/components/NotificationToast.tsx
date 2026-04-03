import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from './Icons';
import { cn } from '../lib/utils';
import { APP_TOAST_EVENT, type ToastPayload, type ToastType } from '../lib/toast';

type Notification = Required<ToastPayload>;

const notificationStyles: Record<ToastType, {
  container: string;
  iconWrap: string;
  icon: React.ReactNode;
  progress: string;
  close: string;
  role: 'status' | 'alert';
  live: 'polite' | 'assertive';
}> = {
  info: {
    container: 'border-sky-200/80 bg-white/95 text-slate-900 dark:border-sky-900/30 dark:bg-slate-900/95 dark:text-white',
    iconWrap: 'border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-900/30 dark:bg-sky-900/20 dark:text-sky-300',
    icon: <Icons.Info className="h-5 w-5" />,
    progress: 'bg-sky-500',
    close: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    role: 'status',
    live: 'polite',
  },
  success: {
    container: 'border-emerald-200/80 bg-white/95 text-slate-900 dark:border-emerald-900/30 dark:bg-slate-900/95 dark:text-white',
    iconWrap: 'border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300',
    icon: <Icons.CheckCircle2 className="h-5 w-5" />,
    progress: 'bg-emerald-500',
    close: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    role: 'status',
    live: 'polite',
  },
  warning: {
    container: 'border-amber-200/80 bg-white/95 text-slate-900 dark:border-amber-900/30 dark:bg-slate-900/95 dark:text-white',
    iconWrap: 'border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300',
    icon: <Icons.ShieldAlert className="h-5 w-5" />,
    progress: 'bg-amber-500',
    close: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    role: 'alert',
    live: 'assertive',
  },
  error: {
    container: 'border-red-200/80 bg-white/95 text-slate-900 dark:border-red-900/30 dark:bg-slate-900/95 dark:text-white',
    iconWrap: 'border border-red-200 bg-red-50 text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300',
    icon: <Icons.AlertTriangle className="h-5 w-5" />,
    progress: 'bg-red-500',
    close: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    role: 'alert',
    live: 'assertive',
  },
};

export const NotificationToast: React.FC = () => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearScheduledDismiss = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleNotification = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      const nextNotification: Notification = {
        title: detail.title,
        message: detail.message,
        type: detail.type ?? 'info',
        duration: detail.duration ?? 5000,
      };

      clearScheduledDismiss();
      setNotification(nextNotification);
      timeoutRef.current = window.setTimeout(() => {
        setNotification(null);
        timeoutRef.current = null;
      }, nextNotification.duration);
    };

    window.addEventListener(APP_TOAST_EVENT, handleNotification);

    return () => {
      clearScheduledDismiss();
      window.removeEventListener(APP_TOAST_EVENT, handleNotification);
    };
  }, []);

  const closeToast = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setNotification(null);
  };

  return (
    <AnimatePresence>
      {notification && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-3 sm:top-5">
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role={notificationStyles[notification.type].role}
            aria-live={notificationStyles[notification.type].live}
            className={cn(
              'pointer-events-auto w-full max-w-md overflow-hidden rounded-[28px] border p-4 shadow-[0_30px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur',
              notificationStyles[notification.type].container,
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]', notificationStyles[notification.type].iconWrap)}>
                {notificationStyles[notification.type].icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-tight">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{notification.message}</p>
              </div>

              <button
                type="button"
                onClick={closeToast}
                aria-label={`Cerrar notificación: ${notification.title}`}
                className={cn('rounded-full p-2 transition-colors', notificationStyles[notification.type].close)}
              >
                <Icons.X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
              <motion.span
                key={`${notification.title}-${notification.message}-${notification.type}-${notification.duration}`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: notification.duration / 1000, ease: 'linear' }}
                className={cn('block h-full origin-left rounded-full', notificationStyles[notification.type].progress)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
