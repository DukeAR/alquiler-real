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

  test('GET /api/properties allows project Vercel preview origins', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'prop-preview',
          title: 'Casa lista para preview',
          location: 'Pinamar',
          price: '120000',
          hostId: 'host-1',
          hostName: 'Ana',
          description: 'Lista para reservar.',
          imageUrl: 'https://example.com/preview.jpg',
          rating: '4.8',
          reviewsCount: '10',
          identityValidated: 0,
          hostIdentityValidated: 1,
          hostIdentityVerified: 0,
          locationVerified: 1,
          videoValidated: 1,
          availabilityValidated: 1,
          traceabilityLevel: 'medium',
          maxGuests: 4,
          hasPresencialVerification: 1,
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
      ],
    });

    const previewOrigin = 'https://alquiler-real-cxkcxeoo6-dukears-projects.vercel.app';

    const res = await request(app)
      .get('/api/properties?guests=1')
      .set('Origin', previewOrigin);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(previewOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'prop-preview' });
  });

  test('GET /api/properties?verifiedOnly=true requires presencial verification with 5/5 and ignores the legacy flag', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'prop-onsite',
          title: 'Casa con verificación presencial completa',
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
          availabilityValidated: 1,
          traceabilityLevel: 'medium',
          maxGuests: 4,
          hasPresencialVerification: 1,
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
          id: 'prop-max-without-onsite',
          title: 'Casa con 5/5 sin verificación presencial',
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
          videoValidated: 1,
          availabilityValidated: 1,
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
          id: 'prop-strong',
          title: 'Casa con cuatro comprobaciones reales',
          location: 'Villa Gesell',
          price: '99000',
          hostId: 'host-2',
          hostName: 'Bruno',
          description: 'Sin verificaciones reales.',
          imageUrl: 'https://example.com/legacy.jpg',
          rating: '4.7',
          reviewsCount: '8',
          identityValidated: 0,
          hostIdentityValidated: 1,
          hostIdentityVerified: 0,
          locationVerified: 1,
          videoValidated: 1,
          traceabilityLevel: 'medium',
          maxGuests: 3,
          hasPresencialVerification: 0,
          hasDigitalVerification: 0,
          hostCompletedReservationsCount: '2',
          hostGuestReviewsCount: '1',
          hostMemberSince: '2024-02-01T00:00:00.000Z',
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
    expect(res.body.map((property: any) => property.id)).toEqual(['prop-onsite']);
    expect(res.body[0]).toMatchObject({
      id: 'prop-onsite',
      verificationScore: 5,
      hasPresencialVerification: true,
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
      expect.objectContaining({ key: 'onsite', status: 'complete' }),
      expect.objectContaining({ key: 'operations', status: 'complete' }),
      expect.objectContaining({ key: 'tenure', status: 'complete' }),
    ]));
    expect(res.body.every((property: any) => property.verificationScore === 5 && property.hasPresencialVerification === true)).toBe(true);
    expect(res.body.find((property: any) => property.id === 'prop-max-without-onsite')).toBeUndefined();
    expect(res.body.find((property: any) => property.id === 'prop-strong')).toBeUndefined();
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).not.toContain('p.is_verified_property = TRUE');
  });

  test('GET /api/properties prioritizes healthier host coordination signals without exposing an internal score', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'prop-slower',
          title: 'Casa con respuesta lenta',
          location: 'Santa Teresita',
          price: '110000',
          hostId: 'host-1',
          hostName: 'Ana',
          description: 'Con patio y parrilla.',
          imageUrl: 'https://example.com/slower.jpg',
          rating: '4.6',
          reviewsCount: '9',
          identityValidated: 0,
          hostIdentityValidated: 1,
          hostIdentityVerified: 0,
          locationVerified: 1,
          videoValidated: 0,
          traceabilityLevel: 'medium',
          maxGuests: 4,
          hasPresencialVerification: 0,
          hasDigitalVerification: 0,
          hostCompletedReservationsCount: '5',
          hostGuestReviewsCount: '4',
          hostGuestFeedbackCount: '4',
          hostGuestAgreementsKeptCount: '3',
          hostListingConsistentCount: '3',
          hostGuestWouldInteractAgainCount: '3',
          hostGuestIncidentsCount: '1',
          hostAverageResponseTimeMinutes: '180',
          hostMemberSince: '2021-02-10T00:00:00.000Z',
          internalVisibilityPenalty: 0,
          lat: '-37.0',
          lng: '-56.7',
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
    expect(res.body[0]).not.toHaveProperty('hostTrustInternalScore');
    expect(res.body[0]).not.toHaveProperty('internalVisibilityPenalty');
    expect(res.body[0]).not.toHaveProperty('hostVisibilityBoost');
  });

  test('GET /api/properties/:id/reviews returns property reviews without ambiguous joined columns', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'review-1',
          reviewerId: 'guest-1',
          rating: 5,
          comment: 'Todo coincidia con las fotos y la coordinacion fue clara.',
          agreementKept: true,
          wouldInteractAgain: true,
          hadIncident: false,
          photosMatchReality: true,
          userName: 'Lucia',
          date: '2026-04-01T12:00:00.000Z',
        },
      ],
    });

    const res = await request(app).get('/api/properties/prop-1/reviews');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 'review-1',
        reviewerId: 'guest-1',
        userId: 'guest-1',
        rating: 5,
        comment: 'Todo coincidia con las fotos y la coordinacion fue clara.',
        type: 'guest_review',
        categories: [],
        categoryScores: [],
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        userName: 'Lucia',
        createdAt: '2026-04-01T12:00:00.000Z',
        date: '2026-04-01T12:00:00.000Z',
      },
    ]);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]?.[0]).toContain('SELECT reviews.id');
    expect(queryMock.mock.calls[0]?.[0]).toContain('reviews.created_at as "createdAt"');
    expect(queryMock.mock.calls[0]?.[0]).toContain('ORDER BY reviews.created_at DESC');
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
              title: 'Casa para 4 personas en Santa Teresita · centro',
              location: 'Santa Teresita · centro',
              price: 98000,
              hostId: 'user-1',
              description: 'Lista para publicarse.',
              imageUrl: 'https://example.com/photo-1.jpg',
              images: JSON.stringify([
                'https://example.com/photo-1.jpg',
                'https://example.com/photo-2.jpg',
                'https://example.com/photo-3.jpg',
                'https://example.com/photo-4.jpg',
              ]),
              maxGuests: 4,
              beds: 3,
              bedrooms: null,
              bathrooms: null,
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
        title: 'Casa para 4 personas en Santa Teresita · centro',
        location: 'Santa Teresita · centro',
        price: 98000,
        description: 'Lista para publicarse.',
        images: [
          'https://example.com/photo-1.jpg',
          'https://example.com/photo-2.jpg',
          'https://example.com/photo-3.jpg',
          'https://example.com/photo-4.jpg',
        ],
        maxGuests: 4,
        beds: 3,
        propertyType: 'house',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'prop_new',
      title: 'Casa para 4 personas en Santa Teresita · centro',
      location: 'Santa Teresita · centro',
      price: 98000,
      maxGuests: 4,
      beds: 3,
      property_type: 'house',
      status: 'active',
    });
    expect(queryMock).toHaveBeenCalledTimes(5);
    expect(queryMock.mock.calls[0]?.[0]).toContain('COALESCE(report_stats.total_reports');
    expect(queryMock.mock.calls[1]?.[0]).toContain('JOIN messages m ON m.conversation_id = c.id');
    expect(queryMock.mock.calls[2]?.[0]).toContain('internal_trust_score');
    expect(queryMock.mock.calls[3]?.[0]).toContain('INSERT INTO properties');
    expect(queryMock.mock.calls[4]?.[0]).toContain('total_properties = total_properties + 1');
    expect(queryMock.mock.calls[3]?.[1]).toEqual(expect.arrayContaining([
      'Casa para 4 personas en Santa Teresita · centro',
      'Santa Teresita · centro',
      JSON.stringify([
        'https://example.com/photo-1.jpg',
        'https://example.com/photo-2.jpg',
        'https://example.com/photo-3.jpg',
        'https://example.com/photo-4.jpg',
      ]),
      4,
      3,
      'house',
    ]));
  });

  test('PUT /api/properties/:id lets the host complete location data and persist the visible location flag', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('SELECT id, location, lat, lng') && text.includes('LIMIT 1')) {
        expect(params).toEqual(['prop-1', 'host-1']);

        return {
          rows: [
            {
              id: 'prop-1',
              location: 'Pinamar',
              lat: -37.220001,
              lng: -56.778001,
            },
          ],
        };
      }

      if (text.includes('UPDATE properties SET') && text.includes('"locationVerified" = COALESCE($9, "locationVerified")')) {
        expect(params).toEqual([
          undefined,
          'Pinamar norte',
          undefined,
          undefined,
          undefined,
          -37.223344,
          -56.778899,
          undefined,
          1,
          'prop-1',
          'host-1',
        ]);

        return {
          rows: [
            {
              id: 'prop-1',
              location: 'Pinamar norte',
              lat: -37.223344,
              lng: -56.778899,
              locationVerified: 1,
            },
          ],
        };
      }

      if (text.includes('INSERT INTO user_activity_logs')) {
        expect(params?.[1]).toBe('host-1');
        expect(params?.[2]).toBe('PROPERTY_LOCATION_CHANGED');
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .put('/api/properties/prop-1')
      .set('x-test-user-id', 'host-1')
      .send({
        location: 'Pinamar norte',
        lat: -37.223344,
        lng: -56.778899,
        locationVerified: true,
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'prop-1',
      location: 'Pinamar norte',
      lat: -37.223344,
      lng: -56.778899,
      locationVerified: 1,
    });
  });
});