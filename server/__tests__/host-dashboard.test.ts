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

describe('Host dashboard endpoint', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('GET /api/host/dashboard returns properties enriched with the real verification model', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT host_rating, host_verified, trust_score, badge')) {
        return { rows: [{ host_rating: 4.9, host_verified: true, trust_score: 88, badge: 'Verificado' }] };
      }

      if (text.includes('FROM properties p') && text.includes('LEFT JOIN users u ON u.id = p."hostId"')) {
        return {
          rows: [
            {
              id: 'prop-1',
              title: 'Casa del bosque',
              location: 'Pinamar',
              price: '150000',
              status: 'active',
              reviewsCount: '8',
              rating: '4.9',
              imageUrl: 'https://example.com/property.jpg',
              hostId: 'host-1',
              hostName: 'Laura',
              identityValidated: 0,
              hostIdentityValidated: 1,
              hostIdentityVerified: 0,
              locationVerified: 1,
              videoValidated: 1,
              hasPresencialVerification: 1,
              hasDigitalVerification: 0,
              isVerifiedProperty: false,
              hostProfileName: 'Laura',
              propertyType: 'house',
            },
          ],
        };
      }

      if (text.includes('FROM bookings b') && text.includes('LIMIT 5')) {
        return { rows: [] };
      }

      if (text.includes('total_bookings_hosted')) {
        return { rows: [{ total_bookings_hosted: 3, estimated_income: 250000 }] };
      }

      if (text.includes('recent_guests')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .get('/api/host/dashboard')
      .set('x-test-user-id', 'host-1');

    expect(res.status).toBe(200);
    expect(res.body.properties).toHaveLength(1);
    expect(res.body.properties[0]).toMatchObject({
      id: 'prop-1',
      verificationScore: 4,
    });
    expect(res.body.properties[0].verificationItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'identity', status: 'complete' }),
      expect.objectContaining({ key: 'relationship', status: 'pending' }),
    ]));
  });
});