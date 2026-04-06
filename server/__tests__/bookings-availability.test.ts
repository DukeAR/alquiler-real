import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const queryMock = vi.fn();
const getClientMock = vi.fn();

vi.mock('../config/db', () => ({
  db: {
    query: (text: string, params?: unknown[]) => queryMock(text, params),
    getClient: (...args: unknown[]) => getClientMock(...args),
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

const BOOKING_LOOKUP_QUERY_SNIPPET = 'FROM bookings b';
const LOG_ACTIVITY_QUERY_SNIPPET = 'INSERT INTO user_activity_logs';
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const getDateInArgentina = (offsetDays: number) => {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
};

describe('Bookings and availability endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
    getClientMock.mockReset();
  });

  test('POST /api/bookings creates a pending protected request when requestMode is protected', async () => {
    const clientQueryMock = vi.fn();

    getClientMock.mockResolvedValue({
      query: clientQueryMock,
      release: vi.fn(),
    });

    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT risk_score, role, is_identity_verified FROM users')) {
        return { rows: [{ risk_score: 10, role: 'tenant', is_identity_verified: true }] };
      }

      if (text.includes(LOG_ACTIVITY_QUERY_SNIPPET)) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    clientQueryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text === 'BEGIN' || text === 'COMMIT') {
        return { rows: [] };
      }

      if (text.includes('SELECT pg_advisory_xact_lock')) {
        return { rows: [] };
      }

      if (text.includes('FROM properties') && text.includes('WHERE id = $1')) {
        return {
          rows: [
            {
              id: 'prop-1',
              title: 'Casa del bosque',
              location: 'Pinamar',
              price: 120000,
              status: 'active',
              hostName: 'Mariana',
              hostId: 'host-1',
              maxGuests: 4,
            },
          ],
        };
      }

      if (text.includes('FROM bookings') && text.includes('LIMIT 1')) {
        return { rows: [] };
      }

      if (text.includes('SELECT name FROM users')) {
        return { rows: [{ name: 'Lucía' }] };
      }

      if (text.includes('INSERT INTO bookings')) {
        expect(params?.[3]).toBe('pending');

        return {
          rows: [
            {
              id: 'booking-1',
              propertyId: 'prop-1',
              userId: 'user-1',
              status: 'pending',
              startDate: '2099-09-20',
              endDate: '2099-09-23',
              totalPrice: 360000,
              guests: 2,
              stay_code: 'AR1234',
              contractAccepted: false,
              contractJson: '{}',
            },
          ],
        };
      }

      throw new Error(`Unexpected client query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('x-test-user-id', 'user-1')
      .send({
        propertyId: 'prop-1',
        startDate: '2099-09-20',
        endDate: '2099-09-23',
        guests: 2,
        requestMode: 'protected',
      });

    expect(res.status).toBe(201);
    expect(res.body.requestMode).toBe('protected');
    expect(res.body.booking.status).toBe('pending');
  });

  test('POST /api/conversations reuses the property conversation and links the booking id', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM properties') && text.includes('LIMIT 1')) {
        return { rows: [{ id: 'prop-1', hostId: 'host-1' }] };
      }

      if (text.includes('FROM bookings') && text.includes('WHERE id = $1')) {
        return { rows: [{ id: 'booking-1', propertyId: 'prop-1', userId: 'user-1' }] };
      }

      if (text.includes('SELECT * FROM conversations')) {
        expect(params).toEqual(['user-1', 'host-1', 'prop-1']);
        return { rows: [{ id: 'conv-1', booking_id: null, property_id: 'prop-1', tenant_id: 'user-1', host_id: 'host-1' }] };
      }

      if (text.includes('UPDATE conversations')) {
        return { rows: [{ id: 'conv-1', booking_id: 'booking-1', property_id: 'prop-1', tenant_id: 'user-1', host_id: 'host-1' }] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/conversations')
      .set('x-test-user-id', 'user-1')
      .send({
        propertyId: 'prop-1',
        hostId: 'frontend-host-id-that-should-be-ignored',
        bookingId: 'booking-1',
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('conv-1');
    expect(res.body.booking_id).toBe('booking-1');
  });

  test('GET /api/conversations/:id/messages injects the first reservation guidance messages into the chat', async () => {
    const insertedSystemKeys: string[] = [];

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('JOIN users u_tenant') && text.includes('WHERE c.id = $1')) {
        return {
          rows: [
            {
              id: 'conv-1',
              property_id: 'prop-1',
              booking_id: null,
              tenant_id: 'tenant-1',
              host_id: 'host-1',
              tenantName: 'Lucía',
              hostName: 'Mariana',
              propertyTitle: 'Casa del bosque',
              propertyImage: 'https://example.com/property.jpg',
              bookingStatus: null,
              startDate: null,
              endDate: null,
              guests: null,
              totalPrice: null,
              requestMode: 'direct',
              requestStatus: 'pending',
              requestStartDate: '2099-09-20',
              requestEndDate: '2099-09-23',
              requestGuests: 2,
              requestTotalPrice: 360000,
              depositStatus: null,
              created_at: '2099-09-01T10:00:00.000Z',
              updated_at: '2099-09-01T10:15:00.000Z',
            },
          ],
        };
      }

      if (text.includes('INSERT INTO messages') && text.includes('system_key')) {
        insertedSystemKeys.push(String(params?.[5] ?? ''));
        return { rows: [] };
      }

      if (text.includes('SELECT * FROM messages WHERE conversation_id = $1')) {
        return {
          rows: [
            {
              id: 'msg-system-1',
              conversation_id: 'conv-1',
              sender_id: 'host-1',
              receiver_id: 'tenant-1',
              content: 'Podés hacer todas las preguntas necesarias antes de avanzar.',
              is_system: true,
              created_at: '2099-09-01T10:00:00.000Z',
            },
            {
              id: 'msg-system-2',
              conversation_id: 'conv-1',
              sender_id: 'host-1',
              receiver_id: 'tenant-1',
              content: 'Tu solicitud fue enviada. El anfitrión puede responder por acá.',
              is_system: true,
              created_at: '2099-09-01T10:01:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .get('/api/conversations/conv-1/messages')
      .set('x-test-user-id', 'tenant-1');

    expect(res.status).toBe(200);
    expect(insertedSystemKeys).toEqual(['conversation-start', 'request-sent']);
    expect(res.body.map((message: { content: string }) => message.content)).toEqual([
      'Podés hacer todas las preguntas necesarias antes de avanzar.',
      'Tu solicitud fue enviada. El anfitrión puede responder por acá.',
    ]);
  });

  test('POST /api/conversations/:id/accept-request accepts the request and confirms a protected booking', async () => {
    const acceptanceMessage = 'El anfitrión aceptó tu solicitud. Ya pueden coordinar los detalles.';

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM conversations c') && text.includes('LEFT JOIN bookings b ON b.id = c.booking_id') && text.includes('WHERE c.id = $1') && text.includes('LIMIT 1') && !text.includes('JOIN users u_tenant')) {
        return {
          rows: [
            {
              id: 'conv-1',
              tenant_id: 'tenant-1',
              host_id: 'host-1',
              booking_id: 'booking-1',
              request_mode: 'protected',
              bookingStatus: 'pending',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings')) {
        expect(params).toEqual(['booking-1']);
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations')) {
        expect(params).toEqual([acceptanceMessage, 'conv-1']);
        return { rows: [] };
      }

      if (text.includes('INSERT INTO messages')) {
        expect(params?.[1]).toBe('conv-1');
        expect(params?.[4]).toBe(acceptanceMessage);
        expect(params?.[5]).toBe('request-accepted');
        return { rows: [] };
      }

      if (text.includes(LOG_ACTIVITY_QUERY_SNIPPET)) {
        return { rows: [] };
      }

      if (text.includes('JOIN users u_tenant') && text.includes('WHERE c.id = $1')) {
        return {
          rows: [
            {
              id: 'conv-1',
              property_id: 'prop-1',
              booking_id: 'booking-1',
              tenant_id: 'tenant-1',
              host_id: 'host-1',
              tenantName: 'Lucía',
              hostName: 'Mariana',
              propertyTitle: 'Casa del bosque',
              propertyImage: 'https://example.com/property.jpg',
              bookingStatus: 'confirmed',
              startDate: '2099-09-20',
              endDate: '2099-09-23',
              guests: 2,
              totalPrice: 360000,
              requestMode: 'protected',
              requestStatus: 'accepted',
              requestStartDate: '2099-09-20',
              requestEndDate: '2099-09-23',
              requestGuests: 2,
              requestTotalPrice: 360000,
              created_at: '2099-09-01T10:00:00.000Z',
              updated_at: '2099-09-01T10:15:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/conversations/conv-1/accept-request')
      .set('x-test-user-id', 'host-1');

    expect(res.status).toBe(200);
    expect(res.body.requestStatus).toBe('accepted');
    expect(res.body.bookingStatus).toBe('confirmed');
    expect(res.body.requestMode).toBe('protected');
  });

  test('POST /api/conversations/:id/report-direct-deposit marks a direct deposit as reported', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM conversations c') && text.includes('LEFT JOIN bookings b ON b.id = c.booking_id') && text.includes('WHERE c.id = $1') && text.includes('LIMIT 1') && !text.includes('JOIN users u_tenant')) {
        return {
          rows: [
            {
              id: 'conv-1',
              tenant_id: 'tenant-1',
              host_id: 'host-1',
              booking_id: null,
              request_mode: 'direct',
              request_status: 'accepted',
              deposit_status: null,
              bookingStatus: null,
            },
          ],
        };
      }

      if (text.includes('UPDATE conversations') && text.includes("deposit_status = 'reported'")) {
        expect(params).toEqual(['conv-1']);
        return { rows: [] };
      }

      if (text.includes('JOIN users u_tenant') && text.includes('WHERE c.id = $1')) {
        return {
          rows: [
            {
              id: 'conv-1',
              property_id: 'prop-1',
              booking_id: null,
              tenant_id: 'tenant-1',
              host_id: 'host-1',
              tenantName: 'Lucía',
              hostName: 'Mariana',
              propertyTitle: 'Casa del bosque',
              propertyImage: 'https://example.com/property.jpg',
              bookingStatus: null,
              startDate: null,
              endDate: null,
              guests: null,
              totalPrice: null,
              requestMode: 'direct',
              requestStatus: 'accepted',
              requestStartDate: '2099-09-20',
              requestEndDate: '2099-09-23',
              requestGuests: 2,
              requestTotalPrice: 360000,
              depositStatus: 'reported',
              created_at: '2099-09-01T10:00:00.000Z',
              updated_at: '2099-09-01T10:15:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/conversations/conv-1/report-direct-deposit')
      .set('x-test-user-id', 'tenant-1');

    expect(res.status).toBe(200);
    expect(res.body.depositStatus).toBe('reported');
    expect(res.body.requestMode).toBe('direct');
  });

  test('POST /api/conversations/:id/confirm-direct-deposit registers the direct reservation after host confirmation', async () => {
    const clientQueryMock = vi.fn();

    getClientMock.mockResolvedValue({
      query: clientQueryMock,
      release: vi.fn(),
    });

    queryMock.mockImplementation(async (text: string) => {
      if (text.includes(LOG_ACTIVITY_QUERY_SNIPPET)) {
        return { rows: [] };
      }

      if (text.includes('JOIN users u_tenant') && text.includes('WHERE c.id = $1')) {
        return {
          rows: [
            {
              id: 'conv-1',
              property_id: 'prop-1',
              booking_id: 'booking-1',
              tenant_id: 'tenant-1',
              host_id: 'host-1',
              tenantName: 'Lucía',
              hostName: 'Mariana',
              propertyTitle: 'Casa del bosque',
              propertyImage: 'https://example.com/property.jpg',
              bookingStatus: 'confirmed',
              startDate: '2099-09-20',
              endDate: '2099-09-23',
              guests: 2,
              totalPrice: 360000,
              requestMode: 'direct',
              requestStatus: 'accepted',
              requestStartDate: '2099-09-20',
              requestEndDate: '2099-09-23',
              requestGuests: 2,
              requestTotalPrice: 360000,
              depositStatus: 'confirmed',
              created_at: '2099-09-01T10:00:00.000Z',
              updated_at: '2099-09-01T10:15:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    clientQueryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text === 'BEGIN' || text === 'COMMIT') {
        return { rows: [] };
      }

      if (text.includes('FROM conversations c') && text.includes('JOIN properties p ON p.id = c.property_id')) {
        return {
          rows: [
            {
              id: 'conv-1',
              property_id: 'prop-1',
              tenant_id: 'tenant-1',
              host_id: 'host-1',
              booking_id: 'booking-1',
              request_mode: 'direct',
              request_status: 'accepted',
              deposit_status: 'reported',
              request_start_date: '2099-09-20',
              request_end_date: '2099-09-23',
              request_guests: 2,
              request_total_price: 360000,
              propertyTitle: 'Casa del bosque',
              location: 'Pinamar',
              hostName: 'Mariana',
              guestName: 'Lucía',
            },
          ],
        };
      }

      if (text.includes('SELECT pg_advisory_xact_lock')) {
        return { rows: [] };
      }

      if (text.includes('FROM bookings') && text.includes('status != \'cancelled\'')) {
        return { rows: [] };
      }

      if (text.includes('UPDATE bookings') && text.includes("request_mode = 'direct'")) {
        expect(params?.[0]).toBe('booking-1');
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations') && text.includes("deposit_status = 'confirmed'")) {
        expect(params).toEqual(['booking-1', 'conv-1']);
        return { rows: [] };
      }

      throw new Error(`Unexpected client query: ${text}`);
    });

    const res = await request(app)
      .post('/api/conversations/conv-1/confirm-direct-deposit')
      .set('x-test-user-id', 'host-1');

    expect(res.status).toBe(200);
    expect(res.body.depositStatus).toBe('confirmed');
    expect(res.body.booking_id).toBe('booking-1');
    expect(res.body.bookingStatus).toBe('confirmed');
  });

  test('POST /api/bookings/:id/pay-deposit keeps a protected deposit in custody', async () => {
    let bookingLookupCount = 0;

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes(BOOKING_LOOKUP_QUERY_SNIPPET) && text.includes('LIMIT 1')) {
        bookingLookupCount += 1;

        return {
          rows: [
            {
              id: 'booking-1',
              propertyId: 'prop-1',
              userId: 'user-1',
              status: 'confirmed',
              startDate: '2099-09-20',
              endDate: '2099-09-23',
              totalPrice: 360000,
              guests: 2,
              contractAccepted: false,
              contractJson: '{}',
              requestMode: 'protected',
              depositStatus: bookingLookupCount === 1 ? null : 'held',
              propertyTitle: 'Casa del bosque',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Pinamar',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings') && text.includes("deposit_status = 'held'")) {
        expect(params).toEqual(['booking-1', 'user-1']);
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations') && text.includes("deposit_status = 'held'")) {
        expect(params).toEqual(['booking-1']);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings/booking-1/pay-deposit')
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.booking.depositStatus).toBe('held');
  });

  test('POST /api/bookings/:id/confirm-arrival releases a protected deposit after arrival', async () => {
    let bookingLookupCount = 0;

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes(BOOKING_LOOKUP_QUERY_SNIPPET) && text.includes('LIMIT 1')) {
        bookingLookupCount += 1;

        return {
          rows: [
            {
              id: 'booking-1',
              propertyId: 'prop-1',
              userId: 'user-1',
              status: 'confirmed',
              startDate: '2099-09-20',
              endDate: '2099-09-23',
              totalPrice: 360000,
              guests: 2,
              contractAccepted: false,
              contractJson: '{}',
              requestMode: 'protected',
              depositStatus: bookingLookupCount === 1 ? 'held' : 'released',
              propertyTitle: 'Casa del bosque',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Pinamar',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings') && text.includes("deposit_status = 'released'")) {
        expect(params).toEqual(['booking-1', 'user-1']);
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations') && text.includes("deposit_status = 'released'")) {
        expect(params).toEqual(['booking-1']);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings/booking-1/confirm-arrival')
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.booking.depositStatus).toBe('released');
  });

  test('GET /api/properties/:id/availability merges booking and manual blocks with metadata', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT id, manual_blocked_dates FROM properties')) {
        return {
          rows: [
            {
              id: 'prop-1',
              manual_blocked_dates: JSON.stringify([{ start: '2099-09-10', end: '2099-09-12' }]),
            },
          ],
        };
      }

      if (text.includes('SELECT start_date as start')) {
        return {
          rows: [
            { start: '2099-09-15', end: '2099-09-18', status: 'confirmed', source: 'booking' },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app).get('/api/properties/prop-1/availability');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { start: '2099-09-15', end: '2099-09-18', status: 'confirmed', source: 'booking' },
      { start: '2099-09-10', end: '2099-09-12', status: 'blocked', source: 'manual' },
    ]);
  });

  test('PUT /api/properties/:id/availability normalizes overlapping manual blocks for the host owner', async () => {
    const persistedPayloads: string[] = [];

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM properties') && text.includes('"hostId" = $2')) {
        return { rows: [{ id: 'prop-1' }] };
      }

      if (text.includes('SET manual_blocked_dates = $1')) {
        persistedPayloads.push(String(params?.[0] ?? ''));
        return { rows: [] };
      }

      if (text.includes(LOG_ACTIVITY_QUERY_SNIPPET)) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .put('/api/properties/prop-1/availability')
      .set('x-test-user-id', 'host-1')
      .send({
        manualBlocks: [
          { start: '2099-09-10', end: '2099-09-12' },
          { start: '2099-09-11', end: '2099-09-14' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.manualBlocks).toEqual([{ start: '2099-09-10', end: '2099-09-14' }]);
    expect(persistedPayloads).toEqual([JSON.stringify([{ start: '2099-09-10', end: '2099-09-14' }])]);
  });

  test('POST /api/bookings/:id/cancel rejects reservations that are already inside the 24-hour window', async () => {
    const tomorrow = getDateInArgentina(1);

    queryMock.mockImplementation(async (text: string) => {
      if (text.includes(BOOKING_LOOKUP_QUERY_SNIPPET) && text.includes('LIMIT 1')) {
        return {
          rows: [
            {
              id: 'booking-1',
              propertyId: 'prop-1',
              userId: 'user-1',
              status: 'confirmed',
              startDate: tomorrow,
              endDate: getDateInArgentina(3),
              totalPrice: 180000,
              guests: 2,
              contractAccepted: true,
              contractJson: null,
              propertyTitle: 'Casa del bosque',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Pinamar',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings/booking-1/cancel')
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BOOKING_TOO_LATE_TO_CANCEL');
    expect(res.body.message).toBe('Podés cancelar solo hasta 24 horas antes del ingreso.');
  });

  test('POST /api/bookings/:id/cancel cancels eligible future reservations and returns the updated booking', async () => {
    let bookingLookupCount = 0;
    const futureStartDate = getDateInArgentina(7);
    const futureEndDate = getDateInArgentina(10);

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes(BOOKING_LOOKUP_QUERY_SNIPPET) && text.includes('LIMIT 1')) {
        bookingLookupCount += 1;

        return {
          rows: [
            {
              id: 'booking-2',
              propertyId: 'prop-2',
              userId: 'user-1',
              status: bookingLookupCount === 1 ? 'confirmed' : 'cancelled',
              startDate: futureStartDate,
              endDate: futureEndDate,
              totalPrice: 250000,
              guests: 3,
              contractAccepted: true,
              contractJson: null,
              requestMode: 'direct',
              depositStatus: null,
              cancellationActor: bookingLookupCount === 1 ? null : 'guest',
              propertyTitle: 'Casa con patio',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Cariló',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings') && text.includes("cancellation_actor = 'guest'")) {
        expect(params).toEqual(['booking-2', 'user-1', null]);
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations') && text.includes('deposit_status = $1')) {
        expect(params).toEqual([null, 'booking-2']);
        return { rows: [] };
      }

      if (text.includes(LOG_ACTIVITY_QUERY_SNIPPET)) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings/booking-2/cancel')
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
    expect(res.body.booking.cancellationDeadline).toBeTruthy();
  });

  test('POST /api/bookings/:id/cancel moves a protected guest cancellation into review and records the actor', async () => {
    let bookingLookupCount = 0;
    const futureStartDate = getDateInArgentina(9);
    const futureEndDate = getDateInArgentina(12);

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes(BOOKING_LOOKUP_QUERY_SNIPPET) && text.includes('WHERE b."userId" = $1 AND b.id = $2')) {
        bookingLookupCount += 1;

        return {
          rows: [
            {
              id: 'booking-protected-cancel',
              propertyId: 'prop-3',
              userId: 'user-1',
              status: bookingLookupCount === 1 ? 'confirmed' : 'cancelled',
              startDate: futureStartDate,
              endDate: futureEndDate,
              totalPrice: 420000,
              guests: 2,
              contractAccepted: true,
              contractJson: null,
              requestMode: 'protected',
              depositStatus: bookingLookupCount === 1 ? 'held' : 'review',
              cancellationActor: bookingLookupCount === 1 ? null : 'guest',
              propertyTitle: 'Casa con patio',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Cariló',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings') && text.includes("cancellation_actor = 'guest'")) {
        expect(params).toEqual(['booking-protected-cancel', 'user-1', 'review']);
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations') && text.includes('deposit_status = $1')) {
        expect(params).toEqual(['review', 'booking-protected-cancel']);
        return { rows: [] };
      }

      if (text.includes(LOG_ACTIVITY_QUERY_SNIPPET)) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings/booking-protected-cancel/cancel')
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
    expect(res.body.booking.depositStatus).toBe('review');
    expect(res.body.booking.cancellationActor).toBe('guest');
  });

  test('POST /api/bookings/:id/cancel-as-host refunds a protected booking and records the host actor', async () => {
    let bookingLookupCount = 0;

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes(BOOKING_LOOKUP_QUERY_SNIPPET) && text.includes('WHERE p."hostId" = $1 AND b.id = $2')) {
        bookingLookupCount += 1;

        return {
          rows: [
            {
              id: 'booking-host-cancel',
              propertyId: 'prop-4',
              userId: 'tenant-1',
              status: bookingLookupCount === 1 ? 'confirmed' : 'cancelled',
              startDate: getDateInArgentina(14),
              endDate: getDateInArgentina(17),
              totalPrice: 510000,
              guests: 3,
              contractAccepted: true,
              contractJson: null,
              requestMode: 'protected',
              depositStatus: bookingLookupCount === 1 ? 'held' : 'refunded',
              cancellationActor: bookingLookupCount === 1 ? null : 'host',
              propertyTitle: 'Casa del lago',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Bariloche',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings') && text.includes("cancellation_actor = 'host'")) {
        expect(params).toEqual(['booking-host-cancel', 'refunded']);
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations') && text.includes('deposit_status = $1')) {
        expect(params).toEqual(['refunded', 'booking-host-cancel']);
        return { rows: [] };
      }

      if (text.includes(LOG_ACTIVITY_QUERY_SNIPPET)) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings/booking-host-cancel/cancel-as-host')
      .set('x-test-user-id', 'host-1');

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('cancelled');
    expect(res.body.booking.depositStatus).toBe('refunded');
    expect(res.body.booking.cancellationActor).toBe('host');
  });

  test('POST /api/bookings/:id/report-arrival-problem moves the protected deposit into review', async () => {
    let bookingLookupCount = 0;

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes(BOOKING_LOOKUP_QUERY_SNIPPET) && text.includes('WHERE b."userId" = $1 AND b.id = $2')) {
        bookingLookupCount += 1;

        return {
          rows: [
            {
              id: 'booking-arrival-problem',
              propertyId: 'prop-5',
              userId: 'user-1',
              status: 'confirmed',
              startDate: getDateInArgentina(6),
              endDate: getDateInArgentina(9),
              totalPrice: 360000,
              guests: 2,
              contractAccepted: true,
              contractJson: null,
              requestMode: 'protected',
              depositStatus: bookingLookupCount === 1 ? 'held' : 'review',
              cancellationActor: null,
              propertyTitle: 'Depto céntrico',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Mendoza',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings') && text.includes("SET deposit_status = 'review'")) {
        expect(params).toEqual(['booking-arrival-problem', 'user-1']);
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations') && text.includes('deposit_status = $1')) {
        expect(params).toEqual(['review', 'booking-arrival-problem']);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings/booking-arrival-problem/report-arrival-problem')
      .set('x-test-user-id', 'user-1');

    expect(res.status).toBe(200);
    expect(res.body.booking.depositStatus).toBe('review');
  });

  test('POST /api/bookings/:id/report-no-show keeps the protected deposit pending confirmation', async () => {
    let bookingLookupCount = 0;

    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes(BOOKING_LOOKUP_QUERY_SNIPPET) && text.includes('WHERE p."hostId" = $1 AND b.id = $2')) {
        bookingLookupCount += 1;

        return {
          rows: [
            {
              id: 'booking-no-show',
              propertyId: 'prop-6',
              userId: 'tenant-2',
              status: 'confirmed',
              startDate: getDateInArgentina(5),
              endDate: getDateInArgentina(8),
              totalPrice: 455000,
              guests: 2,
              contractAccepted: true,
              contractJson: null,
              requestMode: 'protected',
              depositStatus: bookingLookupCount === 1 ? 'held' : 'pending_confirmation',
              cancellationActor: null,
              propertyTitle: 'Casa en la sierra',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Tandil',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings') && text.includes("SET deposit_status = 'pending_confirmation'")) {
        expect(params).toEqual(['booking-no-show']);
        return { rows: [] };
      }

      if (text.includes('UPDATE conversations') && text.includes('deposit_status = $1')) {
        expect(params).toEqual(['pending_confirmation', 'booking-no-show']);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/bookings/booking-no-show/report-no-show')
      .set('x-test-user-id', 'host-1');

    expect(res.status).toBe(200);
    expect(res.body.booking.depositStatus).toBe('pending_confirmation');
  });
});