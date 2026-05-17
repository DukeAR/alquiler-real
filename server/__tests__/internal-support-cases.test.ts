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
  default: ((_options?: unknown) => (
    req: { headers: Record<string, string | string[] | undefined>; session?: { userId?: string } },
    _res: unknown,
    next: () => void,
  ) => {
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

const internalOpsSecret = process.env.INTERNAL_OPS_SECRET || process.env.SESSION_SECRET || 'dev-secret-change-in-production';
const INTERNAL_OPS_USER_ID = 'ops_user_1';

const buildInternalOpsAuthRow = () => ({
  id: INTERNAL_OPS_USER_ID,
  email: 'ops@alquilerreal.com',
  role: 'tenant',
  isHost: false,
  isInternalOperator: true,
  activeMode: 'guest',
  name: 'Ops Ana',
  zone: null,
  phone: null,
  bio: null,
  interests: '[]',
  memberSince: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  profilePhoto: null,
  rating: 0,
  totalReviews: 0,
  hostRating: 0,
  totalProperties: 0,
  totalBookingsHosted: 0,
  badge: 'Operaciones',
});

describe('Internal support case endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('GET /api/internal/support/review-queue returns open support cases with contextual metadata', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM users WHERE id = $1')) {
        expect(params).toEqual([INTERNAL_OPS_USER_ID]);
        return { rows: [buildInternalOpsAuthRow()] };
      }

      if (text.includes('FROM support_cases sc') && text.includes(`sc.status <> 'resolved'`)) {
        expect(params).toEqual([]);

        return {
          rows: [
            {
              id: 'support_1',
              userId: 'guest_1',
              userName: 'Valeria',
              userRole: 'tenant',
              propertyId: 'prop_1',
              propertyTitle: 'Casa frente al mar',
              bookingId: 'booking_1',
              conversationId: 'conv_1',
              entryPoint: 'checkin',
              category: 'no_access',
              description: 'Llegue y no pude entrar.',
              status: 'received',
              reviewType: null,
              contextSnapshot: {
                propertyTitle: 'Casa frente al mar',
                operationId: 'booking_1',
                operationType: 'booking',
                viewerRole: 'guest',
                requestMode: 'protected',
                depositStatus: 'held',
                timestamps: {
                  checkInDate: '2026-05-20',
                },
              },
              statusNote: null,
              lastStatusBy: null,
              lastStatusAt: '2026-05-10T15:00:00.000Z',
              updatedAt: '2026-05-10T15:00:00.000Z',
              createdAt: '2026-05-10T15:00:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .get('/api/internal/support/review-queue')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', internalOpsSecret);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        {
          id: 'support_1',
          entryPoint: 'checkin',
          entryPointLabel: 'Check-in',
          category: 'no_access',
          categoryLabel: 'No pude ingresar',
          description: 'Llegue y no pude entrar.',
          status: 'received',
          statusLabel: 'Recibido',
          statusNote: null,
          lastStatusBy: null,
          propertyId: 'prop_1',
          bookingId: 'booking_1',
          conversationId: 'conv_1',
          reviewType: null,
          contextSnapshot: {
            propertyTitle: 'Casa frente al mar',
            operationId: 'booking_1',
            operationType: 'booking',
            viewerRole: 'guest',
            requestMode: 'protected',
            depositStatus: 'held',
            timestamps: {
              checkInDate: '2026-05-20',
            },
          },
          createdAt: '2026-05-10T15:00:00.000Z',
          updatedAt: '2026-05-10T15:00:00.000Z',
          lastStatusAt: '2026-05-10T15:00:00.000Z',
          user: {
            id: 'guest_1',
            name: 'Valeria',
            role: 'tenant',
          },
          property: {
            id: 'prop_1',
            title: 'Casa frente al mar',
          },
          operation: {
            bookingId: 'booking_1',
            conversationId: 'conv_1',
            reviewType: null,
            operationId: 'booking_1',
            operationType: 'booking',
            viewerRole: 'guest',
            requestMode: 'protected',
            requestStatus: null,
            depositStatus: 'held',
            operationStatus: null,
          },
          timestamps: {
            checkInDate: '2026-05-20',
          },
        },
      ],
    });
  });

  test('POST /api/internal/support/cases/:id/review updates support status and operator note', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM users WHERE id = $1')) {
        expect(params).toEqual([INTERNAL_OPS_USER_ID]);
        return { rows: [buildInternalOpsAuthRow()] };
      }

      if (text.includes('FROM support_cases sc') && text.includes('WHERE sc.id = $1')) {
        expect(params).toEqual(['support_1']);

        return {
          rows: [
            {
              id: 'support_1',
              userId: 'guest_1',
              userName: 'Valeria',
              userRole: 'tenant',
              propertyId: 'prop_1',
              propertyTitle: 'Casa frente al mar',
              bookingId: 'booking_1',
              conversationId: 'conv_1',
              entryPoint: 'checkin',
              category: 'no_access',
              description: 'Llegue y no pude entrar.',
              status: 'received',
              reviewType: null,
              contextSnapshot: {
                propertyTitle: 'Casa frente al mar',
                operationId: 'booking_1',
                operationType: 'booking',
                viewerRole: 'guest',
              },
              statusNote: null,
              lastStatusBy: null,
              lastStatusAt: '2026-05-10T15:00:00.000Z',
              updatedAt: '2026-05-10T15:00:00.000Z',
              createdAt: '2026-05-10T15:00:00.000Z',
            },
          ],
        };
      }

      if (text.includes('UPDATE support_cases') && text.includes('last_status_by = $4')) {
        expect(params).toEqual([
          'support_1',
          'waiting_response',
          'Necesitamos confirmar el horario exacto de llegada.',
          'ops_ana',
        ]);

        return {
          rows: [
            {
              id: 'support_1',
              status: 'waiting_response',
              statusNote: 'Necesitamos confirmar el horario exacto de llegada.',
              lastStatusBy: 'ops_ana',
              lastStatusAt: '2026-05-10T16:30:00.000Z',
              updatedAt: '2026-05-10T16:30:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/internal/support/cases/support_1/review')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', internalOpsSecret)
      .send({
        status: 'waiting_response',
        statusNote: 'Necesitamos confirmar el horario exacto de llegada.',
        reviewedBy: 'ops_ana',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.case).toMatchObject({
      id: 'support_1',
      status: 'waiting_response',
      statusLabel: 'Esperando respuesta',
      statusNote: 'Necesitamos confirmar el horario exacto de llegada.',
      lastStatusBy: 'ops_ana',
      categoryLabel: 'No pude ingresar',
      entryPointLabel: 'Check-in',
      user: {
        id: 'guest_1',
        name: 'Valeria',
      },
      property: {
        id: 'prop_1',
        title: 'Casa frente al mar',
      },
    });
  });
});