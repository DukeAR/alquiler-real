export type ToastType = 'info' | 'error' | 'warning' | 'success';
export const APP_TOAST_EVENT = 'app-toast';
export const APP_LEGACY_NOTIFICATION_EVENT = 'app-notification';
export const APP_USER_NOTIFICATION_EVENT = 'app-user-notification';

export interface ToastPayload {
  title: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface UserNotificationPayload extends ToastPayload {
  id?: string;
  createdAt?: string;
  unread?: boolean;
}

export const emitUserNotification = (payload: UserNotificationPayload) => {
  window.dispatchEvent(new CustomEvent<UserNotificationPayload>(APP_USER_NOTIFICATION_EVENT, { detail: payload }));
};

export const showToast = (title: string, message: string, type: ToastType = 'info', duration = 5000) => {
  try {
    const detail = { title, message, type, duration };
    window.dispatchEvent(new CustomEvent<ToastPayload>(APP_TOAST_EVENT, { detail }));
    window.dispatchEvent(new CustomEvent<ToastPayload>(APP_LEGACY_NOTIFICATION_EVENT, { detail }));
  } catch (err) {
    // fallback to alert in non-browser environments
    try { alert(`${title}: ${message}`); } catch { /* noop */ }
  }
};

export default showToast;
