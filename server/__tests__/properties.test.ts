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
    expect(res.body).toHaveLength(2);
    expect(res.body.map((property: any) => property.id)).toEqual(['prop-strong', 'prop-low-real']);
    expect(res.body[0]).toMatchObject({
      id: 'prop-strong',
      verificationScore: 4,
      hostTrustScore: 4,
      hostTrust: {
        score: 4,
        level: 'high',
      },
    });
    expect(res.body[1]).toMatchObject({
      id: 'prop-low-real',
      verificationScore: 3,
      hostTrustScore: 1,
      hostTrust: {
        score: 1,
        level: 'low',
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

  test('GET /api/properties prioritizes healthier host coordination signals without exposing an internal score', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'prop-slower',
          title: 'Casa con respuesta lenta',
          location: 'Pinamar',
          price: '120000',
          hostId: 'host-1',
          hostName: 'Ana',
          description: 'Más lenta para responder.',
          imageUrl: 'https://example.com/slow.jpg',
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
          hostGuestReviewsCount: '4',
          hostGuestFeedbackCount: '4',
          hostGuestAgreementsKeptCount: '2',
          hostListingConsistentCount: '3',
          hostGuestWouldInteractAgainCount: '2',
          hostGuestIncidentsCount: '1',
          hostAverageResponseTimeMinutes: '420',
          hostMemberSince: '2021-02-10T00:00:00.000Z',
          internalVisibilityPenalty: 0,
          lat: '-37.1',
          lng: '-56.8',
          bedrooms: 2,
          bathrooms: 1,
          propertyType: 'house',
          isVerifiedProperty: false,
          hostProfileName: 'Ana',
        },
        {
          id: 'prop-faster',
          title: 'Casa con mejor coordinación',
          location: 'Pinamar',
          price: '120000',
          hostId: 'host-2',
          hostName: 'Bruno',
          description: 'Más ágil y clara para coordinar.',
          imageUrl: 'https://example.com/fast.jpg',
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
          hostGuestReviewsCount: '4',
          hostGuestFeedbackCount: '4',
          hostGuestAgreementsKeptCount: '4',
          hostListingConsistentCount: '4',
          hostGuestWouldInteractAgainCount: '4',
          hostGuestIncidentsCount: '0',
          hostAverageResponseTimeMinutes: '18',
          hostMemberSince: '2021-02-10T00:00:00.000Z',
          internalVisibilityPenalty: 0,
          lat: '-37.1',
          lng: '-56.8',
          bedrooms: 2,
          bathrooms: 1,
          propertyType: 'house',
          isVerifiedProperty: false,
          hostProfileName: 'Bruno',
        },
      ],
    });

    const res = await request(app).get('/api/properties');

    expect(res.status).toBe(200);
    expect(res.body.map((property: any) => property.id)).toEqual(['prop-faster', 'prop-slower']);
    expect(res.body[0]).not.toHaveProperty('internalVisibilityPenalty');
    expect(res.body[0]).not.toHaveProperty('hostVisibilityBoost');
  });

  test('POST /api/properties publishes the first property without forcing prior identity verification', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('COALESCE(report_stats.total_reports') && text.includes('profile_photo as "profilePhoto"')) {
        return {
          rows: [{
            role: 'tenant',
            phone: null,
            bio: null,
            zone: null,
            profilePhoto: null,
            totalReviews: 0,
            emailVerified: false,
            phoneVerified: false,
            documentaryVerified: false,
            identityVerificationStatus: 'unverified',
            reportsCount: 0,
            pendingReportsCount: 0,
            guestCancellationsCount: 0,
            hostCancellationsCount: 0,
            blockedMessagesCount: 0,
            notAdvancedRequestsCount: 0,
            phoneMatchesCount: 0,
            dniMatchesCount: 0,
          }],
        };
      }

      if (text.includes('JOIN messages m ON m.conversation_id = c.id')) {
        return { rows: [] };
      }

      if (text.includes('UPDATE users') && text.includes('internal_trust_score')) {
        return { rows: [] };
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
    expect(queryMock).toHaveBeenCalledTimes(5);
    expect(queryMock.mock.calls[0]?.[0]).toContain('COALESCE(report_stats.total_reports');
    expect(queryMock.mock.calls[1]?.[0]).toContain('JOIN messages m ON m.conversation_id = c.id');
    expect(queryMock.mock.calls[2]?.[0]).toContain('internal_trust_score');
    expect(queryMock.mock.calls[3]?.[0]).toContain('INSERT INTO properties');
    expect(queryMock.mock.calls[4]?.[0]).toContain('total_properties = total_properties + 1');
  });
});