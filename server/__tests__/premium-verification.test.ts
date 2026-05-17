import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../config/db', () => ({
  db: {
    query: (text: string, params?: unknown[]) => queryMock(text, params),
    getClient: vi.fn(),
  },
}));

vi.mock('../internalRisk', () => ({
  evaluateInternalRisk: vi.fn(),
  getInternalRiskDecision: vi.fn().mockResolvedValue({
    blocked: false,
    evaluation: {
      userContext: {
        emailVerified: true,
        phoneVerified: true,
        phone: '+5491112345678',
        bio: 'Perfil completo',
        zone: 'Pinamar',
        profilePhoto: null,
        totalReviews: 0,
        documentaryVerified: false,
      },
      snapshot: {
        riskScore: 0,
        trustScore: 100,
      },
    },
  }),
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

describe('Premium verification endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('POST /api/verification/premium-checkout creates a complimentary documentary order for early users', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('SELECT (COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE)) as "documentaryVerified"')) {
        return { rows: [{ documentaryVerified: false }] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('is_promotional = TRUE')) {
        return { rows: [] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('ORDER BY created_at DESC') && text.includes('offer_type = $2')) {
        return { rows: [] };
      }

      if (text.includes('INSERT INTO premium_verification_orders')) {
        return { rows: [] };
      }

      if (text.includes('INSERT INTO user_activity_logs')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/verification/premium-checkout')
      .set('x-test-user-id', 'user-1')
      .send({ offerType: 'documentary-user' });

    expect(res.status).toBe(200);
    expect(res.body.orderId).toMatch(/^pvo_/);
    expect(res.body.offer).toMatchObject({
      offerType: 'documentary-user',
      targetType: 'user',
      isComplimentary: true,
      purchased: true,
      completed: false,
    });
    expect(String(res.body.redirectTo)).toContain('/verification?');
    expect(String(res.body.redirectTo)).toContain('mode=documentary');
  });

  test('POST /api/verification/onsite/complete leaves the visit scheduled without approving the property yet', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM properties') && text.includes('WHERE id = $1 AND "hostId" = $2')) {
        return { rows: [{ id: 'prop-1', title: 'Casa frente al mar' }] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('ORDER BY created_at DESC') && text.includes('offer_type = $2')) {
        return {
          rows: [{
            id: 'pvo-onsite-1',
            offerType: 'onsite-property',
            targetType: 'property',
            targetId: 'prop-1',
            isPromotional: true,
            basePriceArs: 0,
            finalPriceArs: 0,
            paymentStatus: 'waived',
            verificationStatus: 'pending_schedule',
            metadata: {
              requestSource: 'dashboard',
              coordinationMode: 'manual',
              appointmentDate: null,
              coordinationNotes: null,
              history: [],
            },
            createdAt: '2026-05-01T12:00:00.000Z',
            updatedAt: '2026-05-01T12:00:00.000Z',
          }],
        };
      }

      if (text.includes('UPDATE premium_verification_orders')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/verification/onsite/complete')
      .set('x-test-user-id', 'host-1')
      .send({
        propertyId: 'prop-1',
        orderId: 'pvo-onsite-1',
        appointmentDate: '2026-05-12T10:30:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      propertyId: 'prop-1',
      appointmentDate: '2026-05-12T10:30:00.000Z',
      scheduledAt: '2026-05-12T10:30:00.000Z',
      verificationStatus: 'scheduled',
    });
    expect(queryMock.mock.calls.some(([text]) => String(text).includes('UPDATE properties'))).toBe(false);
    expect(queryMock.mock.calls.some(([text, callParams]) => (
      String(text).includes('UPDATE premium_verification_orders')
      && Array.isArray(callParams)
      && callParams[0] === 'scheduled'
      && typeof callParams[1] === 'string'
      && String(callParams[1]).includes('"appointmentDate":"2026-05-12T10:30:00.000Z"')
      && callParams[2] === 'pvo-onsite-1'
    ))).toBe(true);
  });

  test('POST /api/verification/onsite/start moves a scheduled visit into validation in process', async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes('FROM properties') && text.includes('WHERE id = $1 AND "hostId" = $2')) {
        return { rows: [{ id: 'prop-1', title: 'Casa frente al mar' }] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('ORDER BY created_at DESC') && text.includes('offer_type = $2')) {
        return {
          rows: [{
            id: 'pvo-onsite-1',
            offerType: 'onsite-property',
            targetType: 'property',
            propertyId: 'prop-1',
            paymentStatus: 'waived',
            verificationStatus: 'scheduled',
            metadata: {
              requestSource: 'dashboard',
              coordinationMode: 'manual',
              appointmentDate: '2026-05-12T10:30:00.000Z',
              coordinationNotes: null,
              verifierName: null,
              checklist: {
                propertyExists: false,
                locationMatches: false,
                realAccessAvailable: false,
                hostLinkedToProperty: false,
              },
              evidence: {
                photoCount: 0,
                geolocation: null,
                timestamp: null,
                notes: null,
              },
              history: [],
            },
          }],
        };
      }

      if (text.includes('UPDATE premium_verification_orders')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/verification/onsite/start')
      .set('x-test-user-id', 'host-1')
      .send({ propertyId: 'prop-1', orderId: 'pvo-onsite-1' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      propertyId: 'prop-1',
      verificationStatus: 'in_progress',
    });
    expect(queryMock.mock.calls.some(([text, callParams]) => (
      String(text).includes('UPDATE premium_verification_orders')
      && Array.isArray(callParams)
      && callParams[0] === 'in_progress'
      && typeof callParams[1] === 'string'
      && String(callParams[1]).includes('"status":"in_progress"')
      && callParams[2] === 'pvo-onsite-1'
    ))).toBe(true);
  });

  test('POST /api/verification/onsite/report sends the visit to internal review without approving the property', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM properties') && text.includes('WHERE id = $1 AND "hostId" = $2')) {
        return { rows: [{ id: 'prop-1', title: 'Casa frente al mar' }] };
      }

      if (text.includes('FROM premium_verification_orders') && text.includes('ORDER BY created_at DESC') && text.includes('offer_type = $2')) {
        return {
          rows: [{
            id: 'pvo-onsite-1',
            offerType: 'onsite-property',
            targetType: 'property',
            propertyId: 'prop-1',
            paymentStatus: 'waived',
            verificationStatus: 'in_progress',
            metadata: {
              requestSource: 'dashboard',
              coordinationMode: 'manual',
              appointmentDate: '2026-05-12T10:30:00.000Z',
              coordinationNotes: 'Portón lateral',
              verifierName: null,
              checklist: {
                propertyExists: false,
                locationMatches: false,
                realAccessAvailable: false,
                hostLinkedToProperty: false,
              },
              evidence: {
                photoCount: 0,
                geolocation: null,
                timestamp: null,
                notes: null,
              },
              history: [],
            },
          }],
        };
      }

      if (text.includes('FROM verification_files')) {
        expect(Array.isArray(params)).toBe(true);
        return {
          rows: [{
            id: 'vf-onsite-1',
            storageKey: 'onsite/photo-1',
            thumbnailStorageKey: null,
            fileUrl: 'https://example.com/onsite-photo-1.jpg',
            thumbnailUrl: null,
            fileType: 'image',
            visibility: 'private',
            verificationScope: 'onsite-evidence-photo',
            verificationStatus: 'pending_review',
            userId: 'host-1',
            propertyId: 'prop-1',
            originalName: 'frente.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            createdAt: '2026-05-12T11:00:00.000Z',
          }],
        };
      }

      if (text.includes('UPDATE premium_verification_orders')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/verification/onsite/report')
      .set('x-test-user-id', 'host-1')
      .send({
        propertyId: 'prop-1',
        orderId: 'pvo-onsite-1',
        verifierName: 'Lucía R.',
        notes: 'Se registró acceso y fachada sin desvíos visibles.',
        geolocation: '-37.1200, -56.8600',
        timestamp: '2026-05-12T11:15:00.000Z',
        result: 'requires_review',
        evidencePhotoIds: ['vf-onsite-1'],
        checklist: {
          propertyExists: true,
          locationMatches: true,
          realAccessAvailable: true,
          hostLinkedToProperty: true,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      propertyId: 'prop-1',
      verificationStatus: 'requires_review',
      verifierName: 'Lucía R.',
      evidencePhotoCount: 1,
      timestamp: '2026-05-12T11:15:00.000Z',
    });
    expect(queryMock.mock.calls.some(([text, callParams]) => (
      String(text).includes('UPDATE premium_verification_orders')
      && Array.isArray(callParams)
      && callParams[0] === 'requires_review'
      && typeof callParams[1] === 'string'
      && String(callParams[1]).includes('"verifierName":"Lucía R."')
      && String(callParams[1]).includes('"photoCount":1')
      && callParams[2] === 'pvo-onsite-1'
    ))).toBe(true);
    expect(queryMock.mock.calls.some(([text]) => String(text).includes('UPDATE properties'))).toBe(false);
  });
});