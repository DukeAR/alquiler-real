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

describe('Verification status endpoint', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('GET /api/verification/status returns the canonical guest verification model', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('FROM premium_verification_orders') && text.includes('is_promotional = TRUE')) {
        return { rows: [] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('ORDER BY created_at DESC') && text.includes('offer_type = $2')) {
        return { rows: [] };
      }

      if (text.includes('FROM users') && text.includes('identity_verification_status')) {
        return {
          rows: [
            {
              role: 'tenant',
              isHost: false,
              activeMode: 'guest',
              phone: '+54 11 5555 0000',
              bio: 'Viajo seguido.',
              zone: 'Caballito',
              profilePhoto: 'https://example.com/avatar.jpg',
              totalReviews: 1,
              dni_front: null,
              dni_back: null,
              selfie_with_dni: null,
              emailVerified: true,
              phoneVerified: true,
              documentaryVerified: false,
              identityVerificationStatus: 'unverified',
              identityVerificationProvider: null,
              identityVerifiedAt: null,
            },
          ],
        };
      }

      if (text.includes('FROM bookings') && text.includes('COUNT(*)::int as "totalBookings"')) {
        return { rows: [{ totalBookings: 2, completedBookings: 2 }] };
      }

      if (text.includes('FROM reviews')) {
        return { rows: [{ writtenReviewsCount: 1, receivedReviewsCount: 1 }] };
      }

      if (text.includes('FROM conversations c')) {
        return { rows: [{ totalConversations: 2, totalMessages: 6 }] };
      }

      if (text.includes('FROM user_verification_documents')) {
        return { rows: [{ documentsCount: 0 }] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .get('/api/verification/status')
      .set('x-test-user-id', 'guest-1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      verificationScore: 4,
      progress: 80,
      verificationSummary: {
        score: 4,
        maxScore: 5,
      },
      identityVerification: {
        status: 'unverified',
        provider: null,
        verifiedAt: null,
      },
      missingRequirements: [],
    });
    expect(res.body.verificationItems).toHaveLength(5);
    expect(res.body.verificationSummary.items).toEqual(res.body.verificationItems);
    expect(res.body.nextStep).toContain('comprobación documental adicional');
    expect(res.body.optionalUpgrade).toContain('comprobación documental adicional');
  });
});