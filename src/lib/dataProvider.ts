import { getMockApiResponse } from '../demo/mockApi';

type RuntimeEnv = Record<string, string | boolean | undefined>;

type DataProviderOptions = {
  method?: string;
  ttlMs?: number;
  noCache?: boolean;
};

type InvalidationOptions = {
  body?: BodyInit | null;
};

type ReadCacheEntry = {
  expiresAt: number;
  path: string;
  response?: Response;
  inFlight?: Promise<Response>;
};

type PathStats = {
  cacheHits: number;
  networkRequests: number;
  invalidations: number;
};

const runtimeEnv = (typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env
  : {}) as RuntimeEnv;

const globalProcessEnv = (() => {
  const globalScope = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return globalScope.process?.env ?? {};
})();

const readCache = new Map<string, ReadCacheEntry>();
const pathStats = new Map<string, PathStats>();

let cacheHits = 0;
let cacheMisses = 0;
let networkRequests = 0;
let invalidations = 0;

const isDev = Boolean(runtimeEnv.DEV);

const toBooleanEnv = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const getFallbackOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost';
};

const resolveRequestUrl = (endpoint: string) => new URL(endpoint, getFallbackOrigin());

const getRequestPath = (endpoint: string) => resolveRequestUrl(endpoint).pathname;

const getCacheKey = (endpoint: string, method: string) => `${method.toUpperCase()} ${resolveRequestUrl(endpoint).toString()}`;

const logDataEvent = (label: string, details?: unknown) => {
  if (!isDev) {
    return;
  }

  console.log(`[DATA] ${label}`, details ?? '');
};

const touchPathStat = (path: string, field: keyof PathStats) => {
  const current = pathStats.get(path) ?? {
    cacheHits: 0,
    networkRequests: 0,
    invalidations: 0,
  };

  current[field] += 1;
  pathStats.set(path, current);
};

const isSessionSensitivePath = (path: string) => /^\/api\/(?:auth|notifications|favorites)(?:\/|$)/.test(path);

const requiresFreshBrowserRead = (path: string) => path === '/api/properties';

const getDefaultTtlMs = (path: string) => {
  if (/^\/api\/properties\/[^/]+\/reviews(?:\/|$)/.test(path)) {
    return 60_000;
  }

  if (/^\/api\/properties(?:\/|$)/.test(path)) {
    return 60_000;
  }

  if (/^\/api\/host\/dashboard(?:\/|$)/.test(path)) {
    return 20_000;
  }

  if (/^\/api\/conversations\/[^/]+\/messages(?:\/|$)/.test(path)) {
    return 10_000;
  }

  if (/^\/api\/conversations(?:\/|$)/.test(path)) {
    return 15_000;
  }

  if (/^\/api\/bookings(?:\/|$)/.test(path)) {
    return 15_000;
  }

  if (/^\/api\/(?:notifications|favorites)(?:\/|$)/.test(path)) {
    return 10_000;
  }

  if (/^\/api\/users\/(?:preferences|activity|reviews)(?:\/|$)/.test(path)) {
    return 30_000;
  }

  return 15_000;
};

const parseJsonBody = (body?: BodyInit | null) => {
  if (typeof body !== 'string') {
    return null;
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const buildInvalidationPrefixes = (endpoint: string, options: InvalidationOptions = {}) => {
  const path = getRequestPath(endpoint);
  const payload = parseJsonBody(options.body);
  const prefixes = new Set<string>();

  if (path.startsWith('/api/auth')) {
    prefixes.add('/api/auth');
    prefixes.add('/api/favorites');
    prefixes.add('/api/notifications');
    prefixes.add('/api/bookings');
    prefixes.add('/api/conversations');
    prefixes.add('/api/host/dashboard');
    prefixes.add('/api/users/');
  }

  if (path.startsWith('/api/favorites')) {
    prefixes.add('/api/favorites');
    prefixes.add('/api/properties');
  }

  if (path.startsWith('/api/notifications')) {
    prefixes.add('/api/notifications');
  }

  if (path.startsWith('/api/messages')) {
    prefixes.add('/api/conversations');

    if (typeof payload?.conversation_id === 'string' && payload.conversation_id.trim()) {
      prefixes.add(`/api/conversations/${payload.conversation_id.trim()}/messages`);
    }
  }

  if (path.startsWith('/api/conversations')) {
    prefixes.add('/api/conversations');
  }

  if (path.startsWith('/api/bookings')) {
    prefixes.add('/api/bookings');
    prefixes.add('/api/conversations');
    prefixes.add('/api/host/dashboard');

    if (typeof payload?.propertyId === 'string' && payload.propertyId.trim()) {
      prefixes.add(`/api/properties/${payload.propertyId.trim()}/availability`);
    }
  }

  if (path.startsWith('/api/properties')) {
    prefixes.add('/api/properties');
    prefixes.add('/api/favorites');
    prefixes.add('/api/host/dashboard');

    const propertyMatch = path.match(/^\/api\/properties\/([^/]+)/);
    if (propertyMatch?.[1]) {
      prefixes.add(`/api/properties/${propertyMatch[1]}`);
      prefixes.add(`/api/properties/${propertyMatch[1]}/reviews`);
      prefixes.add(`/api/properties/${propertyMatch[1]}/availability`);
    }
  }

  if (path.startsWith('/api/verification')) {
    prefixes.add('/api/host/dashboard');
    prefixes.add('/api/properties');
    prefixes.add('/api/users/');
  }

  return Array.from(prefixes);
};

export const clearDataProviderCache = () => {
  readCache.clear();
  pathStats.clear();
  cacheHits = 0;
  cacheMisses = 0;
  networkRequests = 0;
  invalidations = 0;
};

export const getDataProviderStats = () => ({
  cacheHits,
  cacheMisses,
  networkRequests,
  invalidations,
  byPath: Object.fromEntries(pathStats.entries()),
});

export const isDemoModeEnabled = () => {
  if (toBooleanEnv(runtimeEnv.VITE_DEMO_MODE) || toBooleanEnv(runtimeEnv.NEXT_PUBLIC_DEMO_MODE)) {
    return true;
  }

  if (toBooleanEnv(globalProcessEnv.NEXT_PUBLIC_DEMO_MODE) || toBooleanEnv(globalProcessEnv.VITE_DEMO_MODE)) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return new URLSearchParams(window.location.search).get('demo') === 'true';
  } catch {
    return false;
  }
};

export const maybeGetMockApiResponse = async (endpoint: string, options: RequestInit = {}) => {
  if (!isDemoModeEnabled()) {
    return null;
  }

  const response = await getMockApiResponse(endpoint, options);

  if (response) {
    logDataEvent('mock-response', { endpoint, method: options.method || 'GET' });
  }

  return response;
};

export const getRequestCacheMode = (
  endpoint: string,
  method: string,
  explicitCache?: RequestCache,
  noCache = false,
): RequestCache | undefined => {
  const path = getRequestPath(endpoint);

  if (explicitCache) {
    return explicitCache;
  }

  if (method.toUpperCase() !== 'GET' || noCache) {
    return undefined;
  }

  if (requiresFreshBrowserRead(path)) {
    return 'no-store';
  }

  return isSessionSensitivePath(path) ? 'default' : 'force-cache';
};

export const getRequestTtlMs = (
  endpoint: string,
  explicitTtlMs?: number,
  revalidateSeconds?: number,
) => {
  if (typeof explicitTtlMs === 'number' && Number.isFinite(explicitTtlMs) && explicitTtlMs >= 0) {
    return explicitTtlMs;
  }

  if (typeof revalidateSeconds === 'number' && Number.isFinite(revalidateSeconds) && revalidateSeconds >= 0) {
    return revalidateSeconds * 1000;
  }

  return getDefaultTtlMs(getRequestPath(endpoint));
};

export const invalidateRelatedData = (endpoint: string, options: InvalidationOptions = {}) => {
  const prefixes = buildInvalidationPrefixes(endpoint, options);

  if (prefixes.length === 0) {
    return 0;
  }

  let removedEntries = 0;

  for (const [cacheKey, entry] of readCache.entries()) {
    const shouldRemove = prefixes.some((prefix) => (
      entry.path === prefix
      || entry.path.startsWith(`${prefix}/`)
      || prefix.endsWith('/') && entry.path.startsWith(prefix)
    ));

    if (!shouldRemove) {
      continue;
    }

    readCache.delete(cacheKey);
    invalidations += 1;
    removedEntries += 1;
    touchPathStat(entry.path, 'invalidations');
  }

  if (removedEntries > 0) {
    logDataEvent('invalidate', { endpoint, prefixes, removedEntries });
  }

  return removedEntries;
};

export const loadResponse = async (
  endpoint: string,
  options: DataProviderOptions,
  loader: () => Promise<Response>,
) => {
  const method = (options.method || 'GET').toUpperCase();
  const path = getRequestPath(endpoint);
  const useCache = method === 'GET' && !options.noCache;

  if (!useCache) {
    const response = await loader();
    networkRequests += 1;
    touchPathStat(path, 'networkRequests');
    return response;
  }

  const cacheKey = getCacheKey(endpoint, method);
  const currentTime = Date.now();
  const ttlMs = getRequestTtlMs(endpoint, options.ttlMs);
  const currentEntry = readCache.get(cacheKey);

  if (currentEntry?.response && currentEntry.expiresAt > currentTime) {
    cacheHits += 1;
    touchPathStat(path, 'cacheHits');
    logDataEvent('cache-hit', { endpoint, ttlMs });
    return currentEntry.response.clone();
  }

  if (currentEntry?.inFlight) {
    cacheHits += 1;
    touchPathStat(path, 'cacheHits');
    logDataEvent('request-deduped', { endpoint });
    const response = await currentEntry.inFlight;
    return response.clone();
  }

  cacheMisses += 1;

  const inFlight = (async () => {
    const response = await loader();
    return response;
  })();

  readCache.set(cacheKey, {
    expiresAt: currentTime + ttlMs,
    path,
    inFlight,
  });

  try {
    const response = await inFlight;
    networkRequests += 1;
    touchPathStat(path, 'networkRequests');

    if (response.ok) {
      readCache.set(cacheKey, {
        expiresAt: Date.now() + ttlMs,
        path,
        response: response.clone(),
      });
    } else {
      readCache.delete(cacheKey);
    }

    return response;
  } catch (error) {
    readCache.delete(cacheKey);
    throw error;
  }
};