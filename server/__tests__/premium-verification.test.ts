import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../config/db', () => ({
  db: {
    query: (text: string, params?: unknown[]) => queryMock(text, params),
    getClient: vi.fn(),
  },
}));

vi.mock('../internalRisk', () => ({
  evaluateInternalRisk: vi.fn(),
  getInternalRiskDecision: vi.fn().mockResolvedValue({
    blocked: false,
    evaluation: {
      userContext: {
        emailVerified: true,
        phoneVerified: true,
        phone: '+5491112345678',
        bio: 'Perfil completo',
        zone: 'Pinamar',
        profilePhoto: null,
        totalReviews: 0,
        documentaryVerified: false,
      },
      snapshot: {
        riskScore: 0,
        trustScore: 100,
      },
    },
  }),
}));

vi.mock('express-session', () => ({
  default: ((_options?: unknown) => (req: { headers: Record<string, string | string[] | undefined>; session?: { userId?: string } }, _res: unknown, next: () => void) => {
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

describe('Premium verification endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('POST /api/verification/premium-checkout creates a complimentary documentary order for early users', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT (COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE)) as "documentaryVerified"')) {
        return { rows: [{ documentaryVerified: false }] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('is_promotional = TRUE')) {
        return { rows: [] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('ORDER BY created_at DESC') && text.includes('offer_type = $2')) {
        return { rows: [] };
      }

      if (text.includes('INSERT INTO premium_verification_orders')) {
        return { rows: [] };
      }

      if (text.includes('INSERT INTO user_activity_logs')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/verification/premium-checkout')
      .set('x-test-user-id', 'user-1')
      .send({ offerType: 'documentary-user' });

    expect(res.status).toBe(200);
    expect(res.body.orderId).toMatch(/^pvo_/);
    expect(res.body.offer).toMatchObject({
      offerType: 'documentary-user',
      targetType: 'user',
      isComplimentary: true,
      purchased: true,
      completed: false,
    });
    expect(String(res.body.redirectTo)).toContain('/verification?');
    expect(String(res.body.redirectTo)).toContain('mode=documentary');
  });
});