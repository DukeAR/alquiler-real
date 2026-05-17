import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const dbQueryMock = vi.fn();

vi.mock('express-session', () => ({
  default: ((_options?: unknown) => (req: { session?: { userId?: string } }, _res: unknown, next: () => void) => {
    req.session = { userId: 'user_test_1' };
    next();
  }) as unknown,
}));

vi.mock('connect-pg-simple', () => ({
  default: () => class MockStore {},
}));

vi.mock('../config/db', () => ({
  db: {
    query: (...args: unknown[]) => dbQueryMock(...args),
    getClient: vi.fn(),
  },
}));

import app from '../index';

describe('Support cases endpoints', () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test('POST /api/support/cases creates a contextual support case linked to a booking', async () => {
    dbQueryMock.mockImplementation((query: unknown) => {
      const text = String(query);

      if (text.includes('FROM bookings b')) {
        return Promise.resolve({
          rows: [
            {
              id: 'booking_1',
              guestId: 'user_test_1',
              hostId: 'host_1',
              propertyId: 'prop_1',
              propertyTitle: 'Casa frente al mar',
              status: 'confirmed',
              requestMode: 'protected',
              depositStatus: 'held',
              bookingCreatedAt: '2026-05-08T10:00:00.000Z',
              startDate: '2026-05-20',
              endDate: '2026-05-24',
              guestCheckinConfirmedAt: null,
              hostAccessConfirmedAt: null,
              manualReviewOpenedAt: null,
            },
          ],
        });
      }

      if (text.includes('FROM properties p')) {
        return Promise.resolve({
          rows: [
            {
              id: 'prop_1',
              title: 'Casa frente al mar',
              hostId: 'host_1',
              createdAt: '2026-04-01T11:00:00.000Z',
            },
          ],
        });
      }

      if (text.includes('INSERT INTO support_cases')) {
        return Promise.resolve({
          rows: [
            {
              id: 'support_1',
              entryPoint: 'checkin',
              category: 'no_access',
              description: 'No habia nadie en el ingreso.',
              status: 'received',
              statusNote: null,
              propertyId: 'prop_1',
              bookingId: 'booking_1',
              conversationId: null,
              reviewType: null,
              contextSnapshot: {
                entryPoint: 'checkin',
                operationId: 'booking_1',
                operationType: 'booking',
                operationStatus: 'confirmed',
                requestMode: 'protected',
                depositStatus: 'held',
                propertyTitle: 'Casa frente al mar',
                viewerRole: 'guest',
              },
              createdAt: '2026-05-10T14:20:00.000Z',
              updatedAt: '2026-05-10T14:20:00.000Z',
              lastStatusAt: '2026-05-10T14:20:00.000Z',
            },
          ],
        });
      }

      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/support/cases')
      .send({
        entryPoint: 'checkin',
        category: 'no_access',
        bookingId: 'booking_1',
        description: 'No habia nadie en el ingreso.',
      });

    expect(res.status).toBe(201);
    expect(res.body.case).toMatchObject({
      entryPoint: 'checkin',
      category: 'no_access',
      status: 'received',
      bookingId: 'booking_1',
      propertyId: 'prop_1',
    });
    expect(res.body.case.contextSnapshot).toMatchObject({
      propertyTitle: 'Casa frente al mar',
      viewerRole: 'guest',
      operationId: 'booking_1',
    });
  });

  test('GET /api/support/cases returns contextual cases for a conversation entry point', async () => {
    dbQueryMock.mockImplementation((query: unknown, params?: unknown[]) => {
      const text = String(query);

      if (text.includes('FROM conversations c')) {
        return Promise.resolve({
          rows: [
            {
              id: 'conv_1',
              propertyId: 'prop_2',
              bookingId: 'booking_2',
              tenantId: 'user_test_1',
              hostId: 'host_2',
              requestMode: 'protected',
              requestStatus: 'pending',
              requestCreatedAt: '2026-05-09T09:00:00.000Z',
              createdAt: '2026-05-09T09:00:00.000Z',
              updatedAt: '2026-05-10T08:00:00.000Z',
              propertyTitle: 'PH con patio',
              lastMessageCreatedAt: '2026-05-10T08:15:00.000Z',
            },
          ],
        });
      }

      if (text.includes('FROM properties p')) {
        return Promise.resolve({
          rows: [
            {
              id: 'prop_2',
              title: 'PH con patio',
              hostId: 'host_2',
              createdAt: '2026-03-01T10:00:00.000Z',
            },
          ],
        });
      }

      if (text.includes('FROM support_cases')) {
        expect(params).toEqual(['user_test_1', 'booking_2', 'conv_1', 'prop_2', 'conversation']);

        return Promise.resolve({
          rows: [
            {
              id: 'support_2',
              entryPoint: 'conversation',
              category: 'deposit_issue',
              description: null,
              status: 'in_review',
              statusNote: 'Estamos revisando el tramo registrado dentro de la app.',
              propertyId: 'prop_2',
              bookingId: 'booking_2',
              conversationId: 'conv_1',
              reviewType: null,
              contextSnapshot: {
                propertyTitle: 'PH con patio',
                requestStatus: 'pending',
              },
              createdAt: '2026-05-10T09:00:00.000Z',
              updatedAt: '2026-05-10T09:15:00.000Z',
              lastStatusAt: '2026-05-10T09:15:00.000Z',
            },
          ],
        });
      }

      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .get('/api/support/cases')
      .query({ entryPoint: 'conversation', conversationId: 'conv_1' });

    expect(res.status).toBe(200);
    expect(res.body.context).toMatchObject({
      propertyId: 'prop_2',
      bookingId: 'booking_2',
      conversationId: 'conv_1',
    });
    expect(res.body.items[0]).toMatchObject({
      id: 'support_2',
      status: 'in_review',
      category: 'deposit_issue',
      conversationId: 'conv_1',
    });
  });
});