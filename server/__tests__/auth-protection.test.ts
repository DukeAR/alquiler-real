import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

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

describe('Protected auth and verification endpoints - unauthenticated', () => {
  test('GET /api/auth/me returns uncached guest session state', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.headers.vary).toContain('Cookie');
    expect(res.headers.vary).toContain('Origin');
  });

  test('POST /api/auth/change-password -> 401 when not logged in', async () => {
    const res = await request(app).post('/api/auth/change-password').send({
      currentPassword: '123456',
      newPassword: 'abcdef',
    });

    expect(res.status).toBe(401);
  });

  test('PUT /api/auth/profile -> 401 when not logged in', async () => {
    const res = await request(app).put('/api/auth/profile').send({ bio: 'Hola' });
    expect(res.status).toBe(401);
  });

  test('PUT /api/auth/context -> 401 when not logged in', async () => {
    const res = await request(app).put('/api/auth/context').send({ mode: 'host' });
    expect(res.status).toBe(401);
  });

  test('POST /api/verification/validate-id -> 401 when not logged in', async () => {
    const res = await request(app)
      .post('/api/verification/validate-id')
      .field('dni', '12345678');

    expect(res.status).toBe(401);
  });

  test('POST /api/verification/complete -> 401 when not logged in', async () => {
    const res = await request(app).post('/api/verification/complete').send({});
    expect(res.status).toBe(401);
  });

  test('POST /api/verification/submit -> 401 when not logged in', async () => {
    const res = await request(app).post('/api/verification/submit').send({
      dniFront: 'data:image/png;base64,front',
      dniBack: 'data:image/png;base64,back',
      selfie: 'data:image/png;base64,selfie',
    });

    expect(res.status).toBe(401);
  });

  test('GET /api/verification/status -> 401 when not logged in', async () => {
    const res = await request(app).get('/api/verification/status');
    expect(res.status).toBe(401);
  });

  test('POST /api/verification/confirm-contact -> 401 when not logged in', async () => {
    const res = await request(app).post('/api/verification/confirm-contact').send({ field: 'email' });
    expect(res.status).toBe(401);
  });

  test('GET /api/internal/support/review-queue -> 401 when not logged in', async () => {
    const res = await request(app)
      .get('/api/internal/support/review-queue')
      .set('x-internal-ops-secret', 'dev-secret-change-in-production');

    expect(res.status).toBe(401);
  });
});