export const navigateToExternalUrl = (url: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/\bjsdom\b/i.test(userAgent)) {
    return;
  }

  window.location.assign(url);
};
