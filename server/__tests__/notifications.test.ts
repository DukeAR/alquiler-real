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

describe('Notifications endpoints', () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test('GET /api/notifications returns mapped persisted notifications with unread count', async () => {
    dbQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'log_1',
          action: 'BOOKING_CREATED',
          metadata: {},
          createdAt: '2026-04-04T10:00:00.000Z',
          readAt: null,
        },
        {
          id: 'log_2',
          action: 'PASSWORD_CHANGED',
          metadata: {},
          createdAt: '2026-04-04T09:00:00.000Z',
          readAt: '2026-04-04T09:10:00.000Z',
        },
      ],
    });
    dbQueryMock.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body.unread_count).toBe(1);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toMatchObject({
      id: 'log_1',
      title: 'Reserva confirmada',
      unread: true,
    });
    expect(res.body.items[1]).toMatchObject({
      id: 'log_2',
      title: 'Contraseña actualizada',
      unread: false,
    });
  });

  test('POST /api/notifications/read-all confirms backend read state updates', async () => {
    dbQueryMock.mockResolvedValueOnce({ rowCount: 2 });
    dbQueryMock.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).post('/api/notifications/read-all');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(dbQueryMock).toHaveBeenCalledTimes(2);
    expect(String(dbQueryMock.mock.calls[1]?.[0])).toContain('GUEST_CHECKIN_PENDING');
  });

  test('GET /api/notifications maps operational request notifications with category and action', async () => {
    dbQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'log_3',
          action: 'HOST_NEW_REQUEST',
          metadata: {
            conversationId: 'conv_1',
            propertyTitle: 'Depto frente al mar',
          },
          createdAt: '2026-04-04T11:00:00.000Z',
          readAt: null,
        },
      ],
    });
    dbQueryMock.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({
      id: 'log_3',
      title: 'Nueva solicitud',
      category: 'action_required',
      audience: 'host',
      actionLabel: 'Revisar solicitud',
      actionHref: '/chat/conv_1',
      emailPolicy: 'important',
      unread: true,
    });
  });

  test('GET /api/notifications includes derived guest check-in reminders', async () => {
    dbQueryMock.mockResolvedValueOnce({ rows: [] });
    dbQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'booking_1',
          startDate: '2026-04-05',
          propertyId: 'prop_1',
          propertyTitle: 'PH con patio',
          conversationId: 'conv_2',
        },
      ],
    });

    const res = await request(app).get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body.unread_count).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      title: 'Check-in pendiente',
      category: 'action_required',
      audience: 'guest',
      actionLabel: 'Confirmar llegada',
      actionHref: '/my-bookings',
      emailPolicy: 'important',
      unread: true,
    });
    expect(dbQueryMock.mock.calls[1]?.[1]).toEqual(['user_test_1']);
  });

  test('GET /api/notifications keeps derived guest check-in reminders read when a marker exists', async () => {
    dbQueryMock.mockResolvedValueOnce({ rows: [] });
    dbQueryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'booking_1',
          startDate: '2026-04-05',
          propertyId: 'prop_1',
          propertyTitle: 'PH con patio',
          conversationId: 'conv_2',
          readAt: '2026-04-05T15:30:00.000Z',
        },
      ],
    });

    const res = await request(app).get('/api/notifications');

    expect(res.status).toBe(200);
    expect(res.body.unread_count).toBe(0);
    expect(res.body.items[0]).toMatchObject({
      title: 'Check-in pendiente',
      unread: false,
    });
  });
});