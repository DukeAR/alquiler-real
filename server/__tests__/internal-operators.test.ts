import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../config/db', () => ({
  db: {
    query: (text: string, params?: unknown[]) => queryMock(text, params),
    getClient: vi.fn(),
  },
}));

vi.mock('express-session', () => ({
  default: ((_options?: unknown) => (
    req: { headers: Record<string, string | string[] | undefined>; session?: { userId?: string } },
    _res: unknown,
    next: () => void,
  ) => {
    const testUserId = req.headers['x-test-user-id'];
    req.session = {};

    if (typeof testUserId === 'string' && testUserId) {
      req.session.userId = testUserId;
    }

    next();
  }) as unknown,
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class MockStore {},
}));

import app from '../index';

const internalOpsSecret = process.env.INTERNAL_OPS_SECRET || process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const INTERNAL_OPS_USER_ID = 'ops_user_1';

const buildInternalOpsAuthRow = () => ({
  id: INTERNAL_OPS_USER_ID,
  email: 'ops@alquilerreal.com',
  role: 'tenant',
  isHost: false,
  isInternalOperator: true,
  activeMode: 'guest',
  name: 'Ops Ana',
  zone: null,
  phone: null,
  bio: null,
  interests: '[]',
  memberSince: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  profilePhoto: null,
  rating: 0,
  totalReviews: 0,
  hostRating: 0,
  totalProperties: 0,
  totalBookingsHosted: 0,
  badge: 'Operaciones',
});

describe('Internal operator management endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('GET /api/internal/operators -> 401 when not logged in', async () => {
    const res = await request(app)
      .get('/api/internal/operators')
      .set('x-internal-ops-secret', internalOpsSecret);

    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  test('GET /api/internal/operators lists current internal operators', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM users WHERE id = $1')) {
        expect(params).toEqual([INTERNAL_OPS_USER_ID]);
        return { rows: [buildInternalOpsAuthRow()] };
      }

      if (text.includes('WHERE is_internal_operator = TRUE')) {
        return {
          rows: [
            {
              id: INTERNAL_OPS_USER_ID,
              email: 'ops@alquilerreal.com',
              name: 'Ops Ana',
              role: 'tenant',
              isInternalOperator: true,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'demo_host_valeria',
              email: 'valeria@demo.com',
              name: 'Valeria Soria',
              role: 'host',
              isInternalOperator: true,
              createdAt: '2026-01-02T00:00:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .get('/api/internal/operators')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', internalOpsSecret);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        {
          id: INTERNAL_OPS_USER_ID,
          email: 'ops@alquilerreal.com',
          name: 'Ops Ana',
          role: 'tenant',
          isInternalOperator: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'demo_host_valeria',
          email: 'valeria@demo.com',
          name: 'Valeria Soria',
          role: 'host',
          isInternalOperator: true,
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
  });

  test('POST /api/internal/operators/access grants internal access to an existing user by email', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM users WHERE id = $1')) {
        expect(params).toEqual([INTERNAL_OPS_USER_ID]);
        return { rows: [buildInternalOpsAuthRow()] };
      }

      if (text.includes('WHERE email = $1')) {
        expect(params).toEqual(['valeria@demo.com']);
        return {
          rows: [
            {
              id: 'demo_host_valeria',
              email: 'valeria@demo.com',
              name: 'Valeria Soria',
              role: 'host',
              isInternalOperator: false,
              createdAt: '2026-01-02T00:00:00.000Z',
            },
          ],
        };
      }

      if (text.includes('UPDATE users') && text.includes('SET is_internal_operator = $2')) {
        expect(params).toEqual(['demo_host_valeria', true]);
        return {
          rows: [
            {
              id: 'demo_host_valeria',
              email: 'valeria@demo.com',
              name: 'Valeria Soria',
              role: 'host',
              isInternalOperator: true,
              createdAt: '2026-01-02T00:00:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/internal/operators/access')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', internalOpsSecret)
      .send({
        email: 'valeria@demo.com',
        enabled: true,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      user: {
        id: 'demo_host_valeria',
        email: 'valeria@demo.com',
        name: 'Valeria Soria',
        role: 'host',
        isInternalOperator: true,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    });
  });

  test('POST /api/internal/operators/access rejects revoking the current operator session', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM users WHERE id = $1')) {
        expect(params).toEqual([INTERNAL_OPS_USER_ID]);
        return { rows: [buildInternalOpsAuthRow()] };
      }

      if (text.includes('WHERE email = $1')) {
        expect(params).toEqual(['ops@alquilerreal.com']);
        return {
          rows: [
            {
              id: INTERNAL_OPS_USER_ID,
              email: 'ops@alquilerreal.com',
              name: 'Ops Ana',
              role: 'tenant',
              isInternalOperator: true,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/internal/operators/access')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', internalOpsSecret)
      .send({
        email: 'ops@alquilerreal.com',
        enabled: false,
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'No podés revocarte tu propio acceso interno desde esta sesión.',
    });
  });
});