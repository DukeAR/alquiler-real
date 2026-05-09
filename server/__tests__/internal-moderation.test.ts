import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const queryMock = vi.fn();
const evaluateInternalRiskMock = vi.fn();

vi.mock('../config/db', () => ({
  db: {
    query: (text: string, params?: unknown[]) => queryMock(text, params),
    getClient: vi.fn(),
  },
}));

vi.mock('../internalRisk', () => ({
  evaluateInternalRisk: (userId: string) => evaluateInternalRiskMock(userId),
  getInternalRiskDecision: vi.fn(),
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

describe('Internal moderation endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
    evaluateInternalRiskMock.mockReset();
    evaluateInternalRiskMock.mockResolvedValue({
      snapshot: { manualReviewRequired: false },
    });
  });

  test('GET /api/internal/moderation/review-queue returns user, property, reason, history and strikes', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM reports r') && text.includes('recentModerationEvents')) {
        expect(params).toEqual(['pending']);
        return {
          rows: [{
            id: 'rep-1',
            reason: 'not_as_listed',
            description: 'Las fotos ya no coinciden.',
            severity: 'standard',
            status: 'pending',
            createdAt: '2026-05-01T10:00:00.000Z',
            reporterWeight: 1.2,
            propertyId: 'prop-1',
            propertyTitle: 'Casa frente al bosque',
            reportedUserId: 'host-1',
            reportedUserName: 'Mariana',
            strikesCount: 1,
            internalRiskLevel: 'medium',
            internalRiskFlags: JSON.stringify(['duplicate_listing_warning', 'risk_medium']),
            internalManualReviewRequired: false,
            internalVisibilityPenalty: 18,
            recentReportsCount: 3,
            confirmedReportsCount: 1,
            recentModerationEvents: JSON.stringify([
              {
                eventType: 'report_confirmed_low',
                reason: 'not_as_listed',
                createdAt: '2026-04-25T09:00:00.000Z',
              },
            ]),
            appliedStrikeDelta: 0,
            reviewNotes: null,
            reviewedBy: null,
          }],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .get('/api/internal/moderation/review-queue')
      .set('x-internal-ops-secret', internalOpsSecret);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        {
          id: 'rep-1',
          createdAt: '2026-05-01T10:00:00.000Z',
          status: 'pending',
          severity: 'standard',
          reason: 'not_as_listed',
          reasonLabel: 'No coincidencia con lo publicado',
          description: 'Las fotos ya no coinciden.',
          reporterWeight: 1.2,
          user: {
            id: 'host-1',
            name: 'Mariana',
          },
          property: {
            id: 'prop-1',
            title: 'Casa frente al bosque',
          },
          history: {
            recentReportsCount: 3,
            confirmedReportsCount: 1,
            recentModerationEvents: [
              {
                eventType: 'report_confirmed_low',
                reason: 'not_as_listed',
                createdAt: '2026-04-25T09:00:00.000Z',
              },
            ],
          },
          risk: {
            level: 'medium',
            flags: ['duplicate_listing_warning', 'risk_medium'],
            manualReviewRequired: false,
            visibilityPenalty: 18,
          },
          strikes: 1,
          appliedStrikeDelta: 0,
          reviewNotes: null,
          reviewedBy: null,
        },
      ],
    });
  });

  test('POST /api/internal/reports/:id/review applies a medium action with strike and pause', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM reports r') && text.includes('currentStrikesCount')) {
        expect(params).toEqual(['rep-1']);
        return {
          rows: [{
            id: 'rep-1',
            reason: 'not_as_listed',
            severity: 'standard',
            status: 'pending',
            propertyId: 'prop-1',
            propertyTitle: 'Casa frente al bosque',
            reportedUserId: 'host-1',
            reportedUserName: 'Mariana',
            currentStrikesCount: 1,
            currentAccountLimitedUntil: null,
            currentAccountBlockedUntil: null,
          }],
        };
      }

      if (text.includes('UPDATE reports') && text.includes('strike_delta = $5')) {
        expect(params?.[0]).toBe('action_taken');
        expect(params?.[2]).toBe('Reincidencia confirmada');
        expect(params?.[3]).toBe('ops-1');
        expect(params?.[4]).toBe(1);
        expect(params?.[5]).toBe('rep-1');
        return { rows: [] };
      }

      if (text.includes('UPDATE users') && text.includes('internal_strikes_count = $2')) {
        expect(params?.[0]).toBe('host-1');
        expect(params?.[1]).toBe(2);
        expect(params?.[2]).toBe('limited');
        expect(typeof params?.[3]).toBe('string');
        expect(params?.[4]).toBeNull();
        return { rows: [] };
      }

      if (text.includes('UPDATE properties') && text.includes("internal_moderation_status = 'paused'")) {
        expect(params?.[0]).toBe('prop-1');
        expect(params?.[1]).toBe('Revision interna: No coincidencia con lo publicado');
        expect(typeof params?.[2]).toBe('string');
        return { rows: [] };
      }

      if (text.includes('INSERT INTO moderation_events')) {
        expect(params?.[1]).toBe('rep-1');
        expect(params?.[2]).toBe('host-1');
        expect(params?.[3]).toBe('prop-1');
        expect(params?.[4]).toBe('report_confirmed_medium');
        expect(params?.[6]).toBe('not_as_listed');
        expect(params?.[7]).toBe('Reincidencia confirmada');
        expect(params?.[8]).toBe(1);
        expect(params?.[9]).toBe('ops-1');
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/internal/reports/rep-1/review')
      .set('x-internal-ops-secret', internalOpsSecret)
      .send({
        action: 'confirm_medium',
        notes: 'Reincidencia confirmada',
        reviewedBy: 'ops-1',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.report).toMatchObject({
      id: 'rep-1',
      status: 'action_taken',
      strikeDelta: 1,
    });
    expect(res.body.user).toEqual({
      id: 'host-1',
      name: 'Mariana',
      strikes: 2,
      moderationStatus: 'limited',
    });
    expect(res.body.property).toEqual({
      id: 'prop-1',
      title: 'Casa frente al bosque',
      moderationStatus: 'paused',
    });
    expect(evaluateInternalRiskMock).toHaveBeenCalledWith('host-1');
  });
});
