export const INTERNAL_OPS_SECRET_STORAGE_KEY = 'ar_internal_ops_secret';
export const INTERNAL_SUPPORT_ACCESS_EVENT = 'ar-internal-support-access-change';

const emitInternalSupportAccessChange = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(INTERNAL_SUPPORT_ACCESS_EVENT));
};

export const readInternalSupportSecret = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(INTERNAL_OPS_SECRET_STORAGE_KEY) ?? '';
};

export const hasInternalSupportAccess = () => Boolean(readInternalSupportSecret().trim());

export const persistInternalSupportSecret = (secret: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(INTERNAL_OPS_SECRET_STORAGE_KEY, secret);
  emitInternalSupportAccessChange();
};

export const clearInternalSupportSecret = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(INTERNAL_OPS_SECRET_STORAGE_KEY);
  emitInternalSupportAccessChange();
};