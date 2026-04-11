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

  test('GET /api/internal/property-verification/review-queue rejects requests without the internal secret', async () => {
    const res = await request(app).get('/api/internal/property-verification/review-queue');

    expect(res.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  test('GET /api/internal/property-verification/review-queue groups pending documents and returns internal signed access', async () => {
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

    const res = await request(app)
      .get('/api/internal/property-verification/review-queue')
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

  test('POST /api/internal/properties/:id/verification/review approves property documents', async () => {
    queryMock.mockResolvedValueOnce({ rows: [propertyRow] });
    queryMock.mockResolvedValueOnce({ rows: [buildDocumentRow()] });
    queryMock.mockResolvedValueOnce({
      rows: [buildDocumentRow({ verificationStatus: 'approved' })],
    });

    const res = await request(app)
      .post('/api/internal/properties/prop-1/verification/review')
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
    expect(String(queryMock.mock.calls[2]?.[0] || '')).toContain('UPDATE verification_files');
    expect(queryMock.mock.calls[2]?.[1]?.[0]).toBe('approved');
  });

  test('POST /api/internal/properties/:id/verification/review can complete the manual review state', async () => {
    queryMock.mockResolvedValueOnce({ rows: [propertyRow] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/internal/properties/prop-1/verification/review')
      .set('x-internal-ops-secret', env.internalOpsSecret)
      .send({ action: 'complete-manual-review', reviewedAt: '2026-04-10T15:00:00.000Z' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      propertyId: 'prop-1',
      action: 'complete-manual-review',
      manualReviewCompleted: true,
      manualReviewUpdatedAt: '2026-04-10T15:00:00.000Z',
    });
    expect(String(queryMock.mock.calls[1]?.[0] || '')).toContain('UPDATE properties');
    expect(queryMock.mock.calls[1]?.[1]).toEqual(['prop-1', 1, '2026-04-10T15:00:00.000Z']);
  });
});