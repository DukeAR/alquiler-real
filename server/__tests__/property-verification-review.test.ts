import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const env = vi.hoisted(() => {
  process.env.INTERNAL_OPS_SECRET = 'test-internal-secret';

  return {
    internalOpsSecret: 'test-internal-secret',
  };
});

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
import { parseSignedFileToken } from '../storageService';

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

const propertyRow = {
  id: 'prop-1',
  title: 'Casa frente al mar',
  hostId: 'host-1',
  hostName: 'Ana',
};

const buildDocumentRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  storageKey: 'private/documents/2026/04/doc-1-dni.pdf',
  thumbnailStorageKey: null,
  fileUrl: '/api/files/doc-1',
  thumbnailUrl: null,
  fileType: 'document',
  visibility: 'private',
  verificationScope: 'property-document',
  verificationStatus: 'pending_review',
  userId: 'host-1',
  propertyId: 'prop-1',
  originalName: 'dni.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  createdAt: '2026-04-11T12:00:00.000Z',
  propertyTitle: 'Casa frente al mar',
  propertyHostId: 'host-1',
  propertyHostName: 'Ana',
  ...overrides,
});

describe('Internal property verification review endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  test('GET /api/internal/property-verification/review-queue rejects unauthenticated requests before internal secret validation', async () => {
    const res = await request(app).get('/api/internal/property-verification/review-queue');

    expect(res.status).toBe(401);
    expect(queryMock).not.toHaveBeenCalled();
  });

  test('GET /api/internal/property-verification/review-queue groups pending documents and returns internal signed access', async () => {
    queryMock.mockResolvedValueOnce({ rows: [buildInternalOpsAuthRow()] });
    queryMock.mockResolvedValueOnce({
      rows: [
        buildDocumentRow(),
        buildDocumentRow({
          id: 'doc-2',
          storageKey: 'private/documents/2026/04/doc-2-utility.pdf',
          fileUrl: '/api/files/doc-2',
          originalName: 'servicio.pdf',
          createdAt: '2026-04-11T12:05:00.000Z',
        }),
      ],
    });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/internal/property-verification/review-queue')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', env.internalOpsSecret);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      propertyId: 'prop-1',
      propertyTitle: 'Casa frente al mar',
      hostId: 'host-1',
      hostName: 'Ana',
      pendingDocumentsCount: 2,
    });
    expect(res.body.items[0].documents).toHaveLength(2);

    const firstUrl = res.body.items[0].documents[0]?.url as string;
    const token = firstUrl.split('/api/files/access/')[1] || '';
    const parsedToken = parseSignedFileToken(token);

    expect(parsedToken).toMatchObject({
      fileId: 'doc-1',
      accessMode: 'internal',
    });
  });

  test('GET /api/internal/property-verification/review-queue includes onsite reverification items without pending documents', async () => {
    queryMock.mockResolvedValueOnce({ rows: [buildInternalOpsAuthRow()] });
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({
      rows: [{
        id: 'prop-1',
        propertyTitle: 'Casa frente al mar',
        propertyHostId: 'host-1',
        propertyHostName: 'Ana',
        hasPresencialVerification: 1,
        onsiteVerifiedAt: '2026-04-10T15:00:00.000Z',
        onsiteVerificationMaintenance: {
          status: 'verified',
          lastValidatedAt: '2026-04-10T15:00:00.000Z',
          expiresAt: '2026-05-01T15:00:00.000Z',
          history: [],
        },
        onsiteOrderId: null,
        onsiteOrderVerificationStatus: null,
        onsiteOrderMetadata: null,
      }],
    });

    const res = await request(app)
      .get('/api/internal/property-verification/review-queue')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', env.internalOpsSecret);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      propertyId: 'prop-1',
      propertyTitle: 'Casa frente al mar',
      onsiteMaintenanceStatus: 'requires_reverification',
      onsiteNeedsRefresh: true,
      onsiteLastValidatedAt: '2026-04-10T15:00:00.000Z',
    });
  });

  test('POST /api/internal/properties/:id/verification/review approves property documents', async () => {
    queryMock.mockResolvedValueOnce({ rows: [buildInternalOpsAuthRow()] });
    queryMock.mockResolvedValueOnce({ rows: [propertyRow] });
    queryMock.mockResolvedValueOnce({ rows: [buildDocumentRow()] });
    queryMock.mockResolvedValueOnce({
      rows: [buildDocumentRow({ verificationStatus: 'approved' })],
    });

    const res = await request(app)
      .post('/api/internal/properties/prop-1/verification/review')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', env.internalOpsSecret)
      .send({ action: 'approve-documents', notes: 'Documentación válida.' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      propertyId: 'prop-1',
      propertyTitle: 'Casa frente al mar',
      action: 'approve-documents',
    });
    expect(res.body.reviewedDocuments).toHaveLength(1);
    expect(res.body.reviewedDocuments[0]).toMatchObject({
      id: 'doc-1',
      verificationStatus: 'approved',
    });
    expect(String(queryMock.mock.calls[3]?.[0] || '')).toContain('UPDATE verification_files');
    expect(queryMock.mock.calls[3]?.[1]?.[0]).toBe('approved');
  });

  test('POST /api/internal/properties/:id/verification/review can complete the manual review state', async () => {
    queryMock.mockResolvedValueOnce({ rows: [buildInternalOpsAuthRow()] });
    queryMock.mockResolvedValueOnce({ rows: [propertyRow] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/internal/properties/prop-1/verification/review')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', env.internalOpsSecret)
      .send({ action: 'complete-manual-review', reviewedAt: '2026-04-10T15:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      propertyId: 'prop-1',
      action: 'complete-manual-review',
      manualReviewCompleted: true,
      manualReviewUpdatedAt: '2026-04-10T15:00:00.000Z',
    });
    expect(String(queryMock.mock.calls[2]?.[0] || '')).toContain('UPDATE properties');
    expect(queryMock.mock.calls[2]?.[1]?.slice(0, 3)).toEqual(['prop-1', 1, '2026-04-10T15:00:00.000Z']);
    expect(JSON.parse(String(queryMock.mock.calls[2]?.[1]?.[3] || '{}'))).toMatchObject({
      status: 'verified',
      lastValidatedAt: '2026-04-10T15:00:00.000Z',
    });
  });

  test('POST /api/internal/properties/:id/verification/review can mark reverification pending with an operational reason', async () => {
    queryMock.mockResolvedValueOnce({ rows: [buildInternalOpsAuthRow()] });
    queryMock.mockResolvedValueOnce({
      rows: [{
        ...propertyRow,
        hasPresencialVerification: 1,
        onsiteVerifiedAt: '2026-04-10T15:00:00.000Z',
        onsiteVerificationMaintenance: {
          status: 'verified',
          lastValidatedAt: '2026-04-10T15:00:00.000Z',
          expiresAt: '2026-10-10T15:00:00.000Z',
          history: [],
        },
      }],
    });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/internal/properties/prop-1/verification/review')
      .set('x-test-user-id', INTERNAL_OPS_USER_ID)
      .set('x-internal-ops-secret', env.internalOpsSecret)
      .send({
        action: 'mark-reverification-pending',
        triggerReason: 'address_change',
        notes: 'La numeración cambió y conviene actualizar la visita.',
      });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      propertyId: 'prop-1',
      action: 'mark-reverification-pending',
    });
    expect(String(queryMock.mock.calls[2]?.[0] || '')).toContain('UPDATE properties');
    expect(JSON.parse(String(queryMock.mock.calls[2]?.[1]?.[1] || '{}'))).toMatchObject({
      status: 'reverification_pending',
      lastValidatedAt: '2026-04-10T15:00:00.000Z',
      triggerReason: 'address_change',
      notes: 'La numeración cambió y conviene actualizar la visita.',
    });
  });
});