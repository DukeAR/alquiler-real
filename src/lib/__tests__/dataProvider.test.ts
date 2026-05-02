import { beforeEach, describe, expect, test, vi } from 'vitest';

import { clearDataProviderCache, getDataProviderStats, invalidateRelatedData, loadResponse } from '../dataProvider';

const createJsonResponse = (payload: unknown) => new Response(JSON.stringify(payload), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
  },
});

describe('dataProvider', () => {
  beforeEach(() => {
    clearDataProviderCache();
  });

  test('deduplicates identical GET requests within the cache window', async () => {
    const loader = vi.fn(async () => createJsonResponse({ ok: true }));

    const [firstResponse, secondResponse] = await Promise.all([
      loadResponse('/api/properties?guests=1', { method: 'GET', ttlMs: 1_000 }, loader),
      loadResponse('/api/properties?guests=1', { method: 'GET', ttlMs: 1_000 }, loader),
    ]);

    expect(loader).toHaveBeenCalledTimes(1);
    await expect(firstResponse.json()).resolves.toEqual({ ok: true });
    await expect(secondResponse.json()).resolves.toEqual({ ok: true });

    expect(getDataProviderStats()).toMatchObject({
      networkRequests: 1,
      cacheHits: 1,
      cacheMisses: 1,
    });
  });

  test('invalidates related cached reads after a write', async () => {
    const loader = vi.fn(async () => createJsonResponse({ id: 'prop-1' }));

    await loadResponse('/api/favorites', { method: 'GET', ttlMs: 1_000 }, loader);
    expect(loader).toHaveBeenCalledTimes(1);

    invalidateRelatedData('/api/favorites/prop-1');

    await loadResponse('/api/favorites', { method: 'GET', ttlMs: 1_000 }, loader);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(getDataProviderStats().invalidations).toBeGreaterThanOrEqual(1);
  });
});