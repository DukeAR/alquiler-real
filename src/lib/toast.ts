export type ToastType = 'info' | 'error' | 'warning' | 'success';

export interface ToastPayload {
  title: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export const showToast = (title: string, message: string, type: ToastType = 'info', duration = 5000) => {
  try {
    window.dispatchEvent(new CustomEvent<ToastPayload>('app-notification', { detail: { title, message, type, duration } }));
  } catch (err) {
    // fallback to alert in non-browser environments
    try { alert(`${title}: ${message}`); } catch { /* noop */ }
  }
};

export default showToast;
