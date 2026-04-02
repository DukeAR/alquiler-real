export const getPostAuthRedirect = (state: unknown, fallback = '/profile') => {
  if (!state || typeof state !== 'object') {
    return fallback;
  }

  const maybeFrom = (state as { from?: unknown }).from;
  return typeof maybeFrom === 'string' && maybeFrom.startsWith('/') ? maybeFrom : fallback;
};

export const preserveAuthRedirectState = (state: unknown) => {
  const from = getPostAuthRedirect(state, '');
  return from ? { from } : undefined;
};