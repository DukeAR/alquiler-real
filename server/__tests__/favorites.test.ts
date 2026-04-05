import request from 'supertest';
import { describe, test, expect, vi } from 'vitest';

vi.mock('express-session', () => ({
  default: ((_options?: unknown) => (req: { session?: Record<string, never> }, _res: unknown, next: () => void) => {
    req.session = {};
    next();
  }) as unknown,
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class MockStore {},
}));

import app from '../index';

describe('Favorites endpoints - unauthenticated', () => {
  test('GET /api/favorites -> 401 when not logged in', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers.vary).toContain('Cookie');
    expect(res.headers.vary).toContain('Origin');
  });

  test('POST /api/favorites/:id -> 401 when not logged in', async () => {
    const res = await request(app).post('/api/favorites/prop_test');
    expect(res.status).toBe(401);
  });

  test('DELETE /api/favorites -> 401 when not logged in', async () => {
    const res = await request(app).delete('/api/favorites');
    expect(res.status).toBe(401);
  });
});
