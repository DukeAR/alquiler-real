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
              pendingRequestsCount: 2,
              activeReservationsCount: 1,
              nextArrivalDate: '18/10/2026',
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
      pendingRequestsCount: 2,
      activeReservationsCount: 1,
      nextArrivalDate: '18/10/2026',
    });
    expect(res.body.properties[0].verificationItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'identity', status: 'complete' }),
      expect.objectContaining({ key: 'relationship', status: 'pending' }),
    ]));
  });

  test('GET /api/host/dashboard includes guest profiles built from backend data', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT host_rating, host_verified, trust_score, badge')) {
        return { rows: [{ host_rating: 4.8, host_verified: true, trust_score: 84, badge: 'Verificado' }] };
      }

      if (text.includes('FROM properties p') && text.includes('LEFT JOIN users u ON u.id = p."hostId"')) {
        return { rows: [] };
      }

      if (text.includes('FROM bookings b') && text.includes('LIMIT 5')) {
        return {
          rows: [
            {
              id: 'booking-1',
              status: 'pending',
              date: '12/10/2026',
              startDate: '12/10/2026',
              endDate: '15/10/2026',
              guests: 2,
              totalPrice: 320000,
              userId: 'guest-1',
              userName: 'Marina',
              propertyTitle: 'Casa del bosque',
            },
          ],
        };
      }

      if (text.includes('total_bookings_hosted')) {
        return { rows: [{ total_bookings_hosted: 4, estimated_income: 250000 }] };
      }

      if (text.includes('recent_guests')) {
        return {
          rows: [
            {
              id: 'guest-1',
              name: 'Marina',
              trust_score: 82,
              risk_score: 8,
            },
          ],
        };
      }

      if (text.includes('COALESCE(u.member_since, u.created_at) as "memberSince"')) {
        return {
          rows: [
            {
              id: 'guest-1',
              identityVerified: true,
              memberSince: '2022-02-10T00:00:00.000Z',
              profilePhoto: 'https://example.com/guest.jpg',
              bio: 'Viaja por escapadas cortas.',
              phone: '+54 11 5555 0000',
              zone: 'Caballito',
              emailVerified: true,
              phoneVerified: true,
              completedStays: 4,
              cancellationsCount: 1,
              conflictsCount: 0,
            },
          ],
        };
      }

      if (text.includes('WHERE r.type = \'host_to_guest\'')) {
        return {
          rows: [
            {
              guestId: 'guest-1',
              id: 'review-1',
              authorName: 'Laura',
              date: '2025-11-14T00:00:00.000Z',
              comment: 'La coordinación fue clara y mantuvo buena comunicación durante toda la reserva.',
            },
          ],
        };
      }

      if (text.includes('consultedBeforeReserve')) {
        return {
          rows: [
            {
              bookingId: 'booking-1',
              consultedBeforeReserve: true,
              savedProperty: true,
              returnedToView: null,
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .get('/api/host/dashboard')
      .set('x-test-user-id', 'host-1');

    expect(res.status).toBe(200);
    expect(res.body.recentBookings).toHaveLength(1);
    expect(res.body.recentBookings[0].guestProfile).toEqual({
      identityVerified: true,
      memberSince: '2022-02-10',
      platformHistory: {
        completedStays: 4,
        conflictsCount: 0,
        cancellationsCount: 1,
      },
      hostReviews: [
        {
          id: 'review-1',
          authorName: 'Laura',
          date: '2025-11-14',
          comment: 'La coordinación fue clara y mantuvo buena comunicación durante toda la reserva.',
        },
      ],
      profileCompletion: {
        profileComplete: true,
        photoUploaded: true,
        basicDetailsComplete: true,
      },
      operationSignals: [
        { id: 'consulted-before', label: 'Consultó antes de reservar', active: true, source: 'api' },
        { id: 'saved-property', label: 'Guardó la propiedad', active: true, source: 'api' },
        { id: 'returned-to-view', label: 'Volvió a verla', active: false, source: 'pending' },
        { id: 'completed-profile', label: 'Completó sus datos', active: true, source: 'derived' },
      ],
    });
    expect(res.body.contactedGuests[0].guestProfile).toMatchObject({
      identityVerified: true,
      memberSince: '2022-02-10',
    });
    expect(res.body.contactedGuests[0].guestProfile).not.toHaveProperty('operationSignals');
  });
});