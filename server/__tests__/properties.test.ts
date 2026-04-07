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

describe('Properties endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('GET /api/properties?verifiedOnly=true requires a real verification score of 3 or more and ignores the legacy flag', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'prop-strong',
          title: 'Casa con tres comprobaciones reales',
          location: 'Pinamar',
          price: '120000',
          hostId: 'host-1',
          hostName: 'Ana',
          description: 'Lista para reservar.',
          imageUrl: 'https://example.com/real.jpg',
          rating: '4.8',
          reviewsCount: '10',
          identityValidated: 0,
          hostIdentityValidated: 1,
          hostIdentityVerified: 0,
          locationVerified: 1,
          videoValidated: 1,
          traceabilityLevel: 'medium',
          maxGuests: 4,
          hasPresencialVerification: 0,
          hasDigitalVerification: 0,
          hostCompletedReservationsCount: '5',
          hostGuestReviewsCount: '3',
          hostMemberSince: '2021-02-10T00:00:00.000Z',
          lat: '-37.1',
          lng: '-56.8',
          bedrooms: 2,
          bathrooms: 1,
          propertyType: 'house',
          isVerifiedProperty: false,
          hostProfileName: 'Ana',
        },
        {
          id: 'prop-low-real',
          title: 'Casa con dos comprobaciones reales',
          location: 'Cariló',
          price: '110000',
          hostId: 'host-3',
          hostName: 'Clara',
          description: 'Todavía en revisión.',
          imageUrl: 'https://example.com/partial.jpg',
          rating: '4.6',
          reviewsCount: '7',
          identityValidated: 0,
          hostIdentityValidated: 1,
          hostIdentityVerified: 0,
          locationVerified: 1,
          videoValidated: 0,
          traceabilityLevel: 'medium',
          maxGuests: 4,
          hasPresencialVerification: 0,
          hasDigitalVerification: 0,
          hostCompletedReservationsCount: '1',
          hostGuestReviewsCount: '1',
          hostMemberSince: '2025-11-01T00:00:00.000Z',
          lat: '-37.0',
          lng: '-56.7',
          bedrooms: 2,
          bathrooms: 1,
          propertyType: 'house',
          isVerifiedProperty: false,
          hostProfileName: 'Clara',
        },
        {
          id: 'prop-legacy',
          title: 'Casa con flag legacy',
          location: 'Villa Gesell',
          price: '99000',
          hostId: 'host-2',
          hostName: 'Bruno',
          description: 'Sin verificaciones reales.',
          imageUrl: 'https://example.com/legacy.jpg',
          rating: '4.7',
          reviewsCount: '8',
          identityValidated: 0,
          hostIdentityValidated: 0,
          hostIdentityVerified: 0,
          locationVerified: 0,
          videoValidated: 0,
          traceabilityLevel: 'low',
          maxGuests: 3,
          hasPresencialVerification: 0,
          hasDigitalVerification: 0,
          hostCompletedReservationsCount: '0',
          hostGuestReviewsCount: '0',
          hostMemberSince: '2026-02-01T00:00:00.000Z',
          lat: '-37.2',
          lng: '-56.9',
          bedrooms: 1,
          bathrooms: 1,
          propertyType: 'apartment',
          isVerifiedProperty: true,
          hostProfileName: 'Bruno',
        },
      ],
    });

    const res = await request(app).get('/api/properties?verifiedOnly=true');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 'prop-strong',
      verificationScore: 3,
      hostTrustScore: 4,
      hostTrust: {
        score: 4,
        level: 'high',
      },
    });
    expect(res.body[0].verificationItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'identity',
        status: 'complete',
      }),
    ]));
    expect(res.body[0].hostTrust.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'identity', status: 'complete' }),
      expect.objectContaining({ key: 'reservations', status: 'complete' }),
      expect.objectContaining({ key: 'reviews', status: 'complete' }),
      expect.objectContaining({ key: 'tenure', status: 'complete' }),
    ]));
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).not.toContain('p.is_verified_property = TRUE');
  });

  test('POST /api/properties publishes the first property without forcing prior identity verification', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT risk_score, role, is_identity_verified FROM users')) {
        return { rows: [{ risk_score: 0, role: 'tenant', is_identity_verified: false }] };
      }

      if (text.includes('INSERT INTO properties')) {
        return {
          rows: [
            {
              id: 'prop_new',
              title: 'Casa en Santa Teresita',
              location: 'Santa Teresita · Calle 35',
              price: 98000,
              hostId: 'user-1',
              description: 'Lista para publicarse.',
              imageUrl: 'https://example.com/photo.jpg',
              maxGuests: 4,
              bedrooms: 2,
              bathrooms: 1,
              property_type: 'house',
              status: 'active',
            },
          ],
        };
      }

      if (text.includes('UPDATE users') && text.includes('total_properties = total_properties + 1')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/properties')
      .set('x-test-user-id', 'user-1')
      .send({
        title: 'Casa en Santa Teresita',
        location: 'Santa Teresita · Calle 35',
        price: 98000,
        description: 'Lista para publicarse.',
        imageUrl: 'https://example.com/photo.jpg',
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1,
        propertyType: 'house',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'prop_new',
      title: 'Casa en Santa Teresita',
      location: 'Santa Teresita · Calle 35',
      price: 98000,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      property_type: 'house',
      status: 'active',
    });
    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(queryMock.mock.calls[1]?.[0]).toContain('INSERT INTO properties');
    expect(queryMock.mock.calls[2]?.[0]).toContain('UPDATE users');
  });
});