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

const guestReviewCategories = [
  { key: 'communication', label: 'Comunicación', score: 5 },
  { key: 'listing_clarity', label: 'Claridad del aviso', score: 4 },
  { key: 'agreement_fulfillment', label: 'Cumplimiento de lo acordado', score: 5 },
  { key: 'overall_experience', label: 'Experiencia general', score: 5 },
];

const hostReviewCategories = [
  { key: 'respectful_treatment', label: 'Trato respetuoso', score: 5 },
  { key: 'agreement_fulfillment', label: 'Cumplimiento de acuerdos', score: 4 },
  { key: 'property_care', label: 'Cuidado del lugar', score: 5 },
  { key: 'platform_history', label: 'Historial en la plataforma', score: 4 },
];

describe('Reviews and reports endpoints', () => {
  beforeEach(() => {
    queryMock.mockReset();
    evaluateInternalRiskMock.mockReset();
    evaluateInternalRiskMock.mockResolvedValue({
      snapshot: { manualReviewRequired: false },
    });
  });

  test('POST /api/reviews stores a canonical guest review from a completed booking', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM bookings b') && text.includes('JOIN properties p ON p.id = b."propertyId"')) {
        expect(params).toEqual(['booking-1']);
        return {
          rows: [{
            id: 'booking-1',
            status: 'completed',
            propertyId: 'prop-1',
            userId: 'guest-1',
            hostId: 'host-1',
          }],
        };
      }

      if (text.includes('FROM reviews') && text.includes('LIMIT 1')) {
        expect(params).toEqual(['guest-1', 'guest_to_host', 'booking-1', null]);
        return { rows: [] };
      }

      if (text.includes('INSERT INTO reviews')) {
        expect(params).toMatchObject([
          expect.stringMatching(/^rev_/),
          'booking-1',
          null,
          'guest-1',
          'host-1',
          'prop-1',
          5,
          'Todo claro y bien coordinado.',
          'guest_to_host',
          JSON.stringify(guestReviewCategories),
          true,
          true,
          false,
          true,
          false,
        ]);

        return {
          rows: [{
            id: 'rev-booking-1',
            reviewer_id: 'guest-1',
            reviewed_user_id: 'host-1',
            property_id: 'prop-1',
            type: 'guest_to_host',
            rating: 5,
            comment: 'Todo claro y bien coordinado.',
            category_scores: JSON.stringify(guestReviewCategories),
            agreement_kept: true,
            would_interact_again: true,
            had_incident: false,
            photos_match_reality: true,
            created_at: '2026-05-01T12:00:00.000Z',
          }],
        };
      }

      if (text.includes('UPDATE users SET host_rating')) {
        expect(params).toEqual(['host-1', 'guest_to_host']);
        return { rows: [] };
      }

      if (text.includes('UPDATE properties')) {
        expect(params).toEqual(['prop-1']);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('x-test-user-id', 'guest-1')
      .send({
        booking_id: 'booking-1',
        reviewed_user_id: 'host-1',
        type: 'guest_review',
        comment: 'Todo claro y bien coordinado.',
        categories: guestReviewCategories,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'rev-booking-1',
      reviewerId: 'guest-1',
      userId: 'guest-1',
      reviewed_user_id: 'host-1',
      property_id: 'prop-1',
      type: 'guest_review',
      rating: 5,
      comment: 'Todo claro y bien coordinado.',
      agreement_kept: true,
      would_interact_again: true,
      had_incident: false,
      photos_match_reality: true,
      createdAt: '2026-05-01T12:00:00.000Z',
    });
    expect(res.body.categories).toEqual(guestReviewCategories);
    expect(res.body.categoryScores).toEqual(guestReviewCategories);
    expect(queryMock).toHaveBeenCalledTimes(5);
  });

  test('POST /api/reviews accepts a canonical host review when there was a registered contact', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM conversations c') && text.includes('WHERE c.id = $1')) {
        expect(params).toEqual(['conv-1']);
        return {
          rows: [{
            id: 'conv-1',
            propertyId: 'prop-1',
            userId: 'guest-1',
            hostId: 'host-1',
          }],
        };
      }

      if (text.includes('FROM reviews') && text.includes('LIMIT 1')) {
        expect(params).toEqual(['host-1', 'host_to_guest', null, 'conv-1']);
        return { rows: [] };
      }

      if (text.includes('INSERT INTO reviews')) {
        expect(params).toMatchObject([
          expect.stringMatching(/^rev_/),
          null,
          'conv-1',
          'host-1',
          'guest-1',
          'prop-1',
          5,
          'Fue respetuoso y cuidó el intercambio.',
          'host_to_guest',
          JSON.stringify(hostReviewCategories),
          true,
          true,
          false,
          true,
          false,
        ]);

        return {
          rows: [{
            id: 'rev-conv-1',
            reviewer_id: 'host-1',
            reviewed_user_id: 'guest-1',
            property_id: 'prop-1',
            type: 'host_to_guest',
            rating: 5,
            comment: 'Fue respetuoso y cuidó el intercambio.',
            category_scores: JSON.stringify(hostReviewCategories),
            agreement_kept: true,
            would_interact_again: true,
            had_incident: false,
            photos_match_reality: true,
            created_at: '2026-05-02T12:00:00.000Z',
          }],
        };
      }

      if (text.includes('UPDATE users SET rating')) {
        expect(params).toEqual(['guest-1', 'host_to_guest']);
        return { rows: [] };
      }

      if (text.includes('UPDATE properties')) {
        expect(params).toEqual(['prop-1']);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('x-test-user-id', 'host-1')
      .send({
        conversation_id: 'conv-1',
        reviewed_user_id: 'guest-1',
        type: 'host_review',
        comment: 'Fue respetuoso y cuidó el intercambio.',
        categories: hostReviewCategories,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'rev-conv-1',
      reviewerId: 'host-1',
      userId: 'host-1',
      reviewed_user_id: 'guest-1',
      property_id: 'prop-1',
      type: 'host_review',
      rating: 5,
      comment: 'Fue respetuoso y cuidó el intercambio.',
      agreement_kept: true,
      would_interact_again: true,
      had_incident: false,
      createdAt: '2026-05-02T12:00:00.000Z',
    });
    expect(res.body.categories).toEqual(hostReviewCategories);
    expect(res.body.categoryScores).toEqual(hostReviewCategories);
    expect(queryMock).toHaveBeenCalledTimes(5);
  });

  test('POST /api/reviews rejects a canonical review when the booking was not completed', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM bookings b') && text.includes('JOIN properties p ON p.id = b."propertyId"')) {
        expect(params).toEqual(['booking-2']);
        return {
          rows: [{
            id: 'booking-2',
            status: 'pending',
            propertyId: 'prop-2',
            userId: 'guest-1',
            hostId: 'host-2',
          }],
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('x-test-user-id', 'guest-1')
      .send({
        booking_id: 'booking-2',
        reviewed_user_id: 'host-2',
        type: 'guest_review',
        comment: 'Quise dejar una reseña antes de tiempo.',
        categories: guestReviewCategories,
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'El cierre de la estadía se comparte cuando la reserva ya figura como finalizada.',
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  test('POST /api/reports accepts a property report and derives the host user automatically', async () => {
    queryMock.mockImplementation(async (text: string, params?: unknown[]) => {
      if (text.includes('FROM properties') && text.includes('"hostId" as "hostId"')) {
        expect(params).toEqual(['prop-1']);
        return {
          rows: [{
            id: 'prop-1',
            hostId: 'host-1',
          }],
        };
      }

      if (text.includes('SELECT COALESCE(internal_trust_score, 50)::numeric as "internalTrustScore"')) {
        expect(params).toEqual(['guest-1']);
        return {
          rows: [{
            internalTrustScore: 50,
            totalReviews: 0,
            memberSince: '2024-01-01T00:00:00.000Z',
            documentaryVerified: false,
          }],
        };
      }

      if (text.includes('INSERT INTO reports')) {
        expect(params).toMatchObject([
          expect.stringMatching(/^rep_/),
          'prop-1',
          'host-1',
          'guest-1',
          'not_as_listed',
          'Las fotos no coinciden con el estado actual del lugar.',
          1,
          'standard',
        ]);
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const res = await request(app)
      .post('/api/reports')
      .set('x-test-user-id', 'guest-1')
      .send({
        property_id: 'prop-1',
        reason: 'No coincidencia con lo publicado',
        description: 'Las fotos no coinciden con el estado actual del lugar.',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      report: {
        reporterId: 'guest-1',
        reportedUserId: 'host-1',
        propertyId: 'prop-1',
        reason: 'not_as_listed',
        description: 'Las fotos no coinciden con el estado actual del lugar.',
        status: 'pending',
      },
      message: 'Recibimos tu reporte. Lo vamos a revisar.',
    });
    expect(evaluateInternalRiskMock).toHaveBeenCalledWith('host-1');
    expect(queryMock).toHaveBeenCalledTimes(3);
  });
});