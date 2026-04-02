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

    queryMock.mockImplementation(async (text: string) => {
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
              propertyTitle: 'Casa con patio',
              imageUrl: 'https://example.com/property.jpg',
              location: 'Cariló',
            },
          ],
        };
      }

      if (text.includes('UPDATE bookings')) {
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
});