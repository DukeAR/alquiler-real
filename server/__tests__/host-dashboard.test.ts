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
      if (text.includes('SELECT host_rating, host_verified, badge')) {
        return { rows: [{ host_rating: 4.9, host_verified: true, badge: 'Verificado' }] };
      }

      if (text.includes('SELECT DISTINCT ON (property_id)')) {
        return { rows: [] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('is_promotional = TRUE')) {
        return { rows: [] };
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
              description: 'Casa amplia con jardin y parrilla.',
              maxGuests: 5,
              verificationPhotoCount: 4,
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

      if (text.includes('COALESCE(u.member_since, u.created_at) as "memberSince"')) {
        return {
          rows: [
            {
              id: 'guest-1',
              identityVerified: true,
              memberSince: '2022-02-10T00:00:00.000Z',
              emailVerified: true,
              phoneVerified: true,
              completedStays: 0,
              cancellationsCount: 0,
              conflictsCount: 0,
              feedbackCount: 0,
              agreementsKeptCount: 0,
              wouldInteractAgainCount: 0,
              incidentsCount: 0,
            },
          ],
        };
      }

      if (text.includes("WHERE r.type = 'host_to_guest'")) {
        return { rows: [] };
      }

      if (text.includes('consultedBeforeReserve')) {
        return { rows: [] };
      }

      if (text.includes('FUNNEL_PROPERTY_DETAIL_VIEWED')) {
        return {
          rows: [
            {
              detailViews: 20,
              availabilityClicks: 12,
              chatStarts: 7,
              chatsWithFirstMessage: 5,
              acceptedRequests: 4,
              depositsCompleted: 2,
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
    expect(res.body.properties).toHaveLength(1);
    expect(res.body.properties[0]).toMatchObject({
      id: 'prop-1',
      verificationScore: 4,
      pendingRequestsCount: 2,
      activeReservationsCount: 1,
      nextArrivalDate: '18/10/2026',
      premiumOnsiteOffer: {
        offerType: 'onsite-property',
        completed: true,
      },
    });
    expect(res.body.properties[0].verificationItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'location', status: 'complete' }),
      expect.objectContaining({ key: 'identity', status: 'complete' }),
      expect.objectContaining({ key: 'photos', status: 'complete' }),
      expect.objectContaining({ key: 'availability', status: 'complete' }),
    ]));
    expect(res.body.funnelMetrics).toEqual({
      windowDays: 30,
      detailViews: 20,
      availabilityClicks: 12,
      availabilityClickRate: 60,
      chatStarts: 7,
      chatsWithFirstMessage: 5,
      firstMessageRate: 71,
      acceptedRequests: 4,
      depositsCompleted: 2,
      depositConversionRate: 50,
    });
  });

  test('GET /api/host/dashboard includes guest profiles built from backend data', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT host_rating, host_verified, badge')) {
        return { rows: [{ host_rating: 4.8, host_verified: true, badge: 'Verificado' }] };
      }

      if (text.includes('SELECT DISTINCT ON (property_id)')) {
        return { rows: [] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('is_promotional = TRUE')) {
        return { rows: [] };
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
              feedbackCount: 2,
              agreementsKeptCount: 2,
              wouldInteractAgainCount: 2,
              incidentsCount: 0,
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
              agreementKept: true,
              wouldInteractAgain: true,
              hadIncident: false,
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

      if (text.includes('FUNNEL_PROPERTY_DETAIL_VIEWED')) {
        return {
          rows: [
            {
              detailViews: 0,
              availabilityClicks: 0,
              chatStarts: 0,
              chatsWithFirstMessage: 0,
              acceptedRequests: 0,
              depositsCompleted: 0,
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
      interactionHistory: {
        completedStays: 4,
        feedbackCount: 2,
        agreementsKeptCount: 2,
        wouldInteractAgainCount: 2,
        incidentsCount: 0,
        publicSignals: [
          {
            key: 'agreements',
            label: 'Se cumplió lo acordado',
            tone: 'positive',
            detail: '2 cierres compartidos hablaron de acuerdos respetados.',
          },
          {
            key: 'return',
            label: 'Volverían a interactuar',
            tone: 'positive',
            detail: '2 anfitriones dejaron esta señal al cerrar la estadía.',
          },
        ],
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
      verificationScore: 5,
      verificationItems: [
        {
          key: 'email',
          label: 'Email verificado',
          status: 'complete',
          description: 'El email principal de la cuenta ya está confirmado.',
        },
        {
          key: 'phone',
          label: 'Teléfono verificado',
          status: 'complete',
          description: 'El teléfono principal de la cuenta ya está confirmado.',
        },
        {
          key: 'profile',
          label: 'Perfil completo',
          status: 'complete',
          description: 'La cuenta ya tiene foto, presentación, zona y teléfono cargados.',
        },
        {
          key: 'history',
          label: 'Historial real en la plataforma',
          status: 'complete',
          description: 'La cuenta ya muestra 4 estadías completadas y 1 reseña de anfitrión dentro de la plataforma.',
        },
        {
          key: 'documentary',
          label: 'Identidad documental',
          status: 'complete',
          description: 'La identidad ya fue verificada.',
        },
      ],
      identityVerification: {
        status: 'verified',
        provider: null,
        verifiedAt: null,
      },
      verificationSummary: {
        score: 5,
        maxScore: 5,
        items: [
          {
            key: 'email',
            label: 'Email verificado',
            status: 'complete',
            description: 'El email principal de la cuenta ya está confirmado.',
          },
          {
            key: 'phone',
            label: 'Teléfono verificado',
            status: 'complete',
            description: 'El teléfono principal de la cuenta ya está confirmado.',
          },
          {
            key: 'profile',
            label: 'Perfil completo',
            status: 'complete',
            description: 'La cuenta ya tiene foto, presentación, zona y teléfono cargados.',
          },
          {
            key: 'history',
            label: 'Historial real en la plataforma',
            status: 'complete',
            description: 'La cuenta ya muestra 4 estadías completadas y 1 reseña de anfitrión dentro de la plataforma.',
          },
          {
            key: 'documentary',
            label: 'Identidad documental',
            status: 'complete',
            description: 'La identidad ya fue verificada.',
          },
        ],
      },
      operationSignals: [
        { id: 'consulted-before', label: 'Consultó antes de reservar', active: true, source: 'api' },
        { id: 'saved-property', label: 'Guardó la propiedad', active: true, source: 'api' },
        { id: 'returned-to-view', label: 'Volvió a verla', active: false, source: 'pending' },
        { id: 'completed-profile', label: 'Completó sus datos', active: true, source: 'derived' },
      ],
    });
    expect(res.body.funnelMetrics).toEqual({
      windowDays: 30,
      detailViews: 0,
      availabilityClicks: 0,
      availabilityClickRate: null,
      chatStarts: 0,
      chatsWithFirstMessage: 0,
      firstMessageRate: null,
      acceptedRequests: 0,
      depositsCompleted: 0,
      depositConversionRate: null,
    });
    expect(res.body.contactedGuests[0].guestProfile).toMatchObject({
      identityVerified: true,
      memberSince: '2022-02-10',
      verificationScore: 5,
      verificationSummary: {
        score: 5,
      },
    });
    expect(res.body.contactedGuests[0].guestProfile).not.toHaveProperty('operationSignals');
  });

  test('GET /api/host/dashboard keeps not advanced requests in recent activity with requestStatus', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT host_rating, host_verified, badge')) {
        return { rows: [{ host_rating: 4.8, host_verified: true, badge: 'Verificado' }] };
      }

      if (text.includes('SELECT DISTINCT ON (property_id)')) {
        return { rows: [] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('is_promotional = TRUE')) {
        return { rows: [] };
      }

      if (text.includes('FROM properties p') && text.includes('LEFT JOIN users u ON u.id = p."hostId"')) {
        return { rows: [] };
      }

      if (text.includes('FROM bookings b') && text.includes('LIMIT 5')) {
        expect(text).toContain('c.request_status as "requestStatus"');
        expect(text).toContain("AND (b.status <> 'cancelled' OR c.request_status = 'not_advanced')");

        return {
          rows: [
            {
              id: 'booking-not-advanced',
              status: 'cancelled',
              requestStatus: 'not_advanced',
              date: '12/10/2026',
              startDate: '12/10/2026',
              endDate: '15/10/2026',
              guests: 2,
              totalPrice: 320000,
              userId: null,
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
        return { rows: [] };
      }

      if (text.includes('FUNNEL_PROPERTY_DETAIL_VIEWED')) {
        return {
          rows: [
            {
              detailViews: 0,
              availabilityClicks: 0,
              chatStarts: 0,
              chatsWithFirstMessage: 0,
              acceptedRequests: 0,
              depositsCompleted: 0,
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
    expect(res.body.recentBookings[0]).toMatchObject({
      id: 'booking-not-advanced',
      status: 'cancelled',
      requestStatus: 'not_advanced',
    });
  });
});