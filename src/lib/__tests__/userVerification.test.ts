import { describe, expect, test } from 'vitest';
import { buildUserVerificationStatus } from '../userVerification';

describe('buildUserVerificationStatus', () => {
  test('keeps the account in initial state when contact confirmations are missing', () => {
    const status = buildUserVerificationStatus({
      emailVerified: false,
      phoneVerified: false,
      phone: null,
      totalBookings: 0,
      completedBookings: 0,
      totalReviewsWritten: 0,
      totalReviewsReceived: 0,
      totalConversations: 0,
      totalMessages: 0,
      documentarySubmitted: false,
      documentaryVerified: false,
    });

    expect(status.level).toBe('INICIAL');
    expect(status.highValueBookingEligible).toBe(false);
    expect(status.missingRequirements).toEqual(['Confirmá tu email', 'Agregá tu teléfono']);
    expect(status.verificationSummary).toEqual({
      score: 0,
      maxScore: 5,
      items: [
        {
          key: 'email',
          label: 'Email verificado',
          status: 'pending',
          description: 'Todavía falta confirmar el email principal de la cuenta.',
        },
        {
          key: 'phone',
          label: 'Teléfono verificado',
          status: 'pending',
          description: 'Todavía falta confirmar el teléfono principal de la cuenta.',
        },
        {
          key: 'profile',
          label: 'Perfil completo',
          status: 'pending',
          description: 'Todavía faltan foto de perfil, presentación, zona y teléfono para completar el perfil.',
        },
        {
          key: 'history',
          label: 'Historial real en la plataforma',
          status: 'pending',
          description: 'Todavía no hay estadías completadas, reseñas de anfitriones ni actividad real visible dentro de la plataforma.',
        },
        {
          key: 'documentary',
          label: 'Identidad documental',
          status: 'pending',
          description: 'Todavía no hay una verificación de identidad completa.',
        },
      ],
    });
  });

  test('reaches level 3 with platform signals only, without requiring documents', () => {
    const status = buildUserVerificationStatus({
      emailVerified: true,
      phoneVerified: true,
      phone: '+5491122334455',
      bio: 'Viajo seguido y respondo rápido.',
      zone: 'Santa Teresita',
      profilePhoto: 'https://example.com/avatar.jpg',
      totalBookings: 3,
      completedBookings: 1,
      totalReviewsWritten: 2,
      totalReviewsReceived: 1,
      totalConversations: 4,
      totalMessages: 12,
      documentarySubmitted: false,
      documentaryVerified: false,
    });

    expect(status.level).toBe('NIVEL_3');
    expect(status.highValueBookingEligible).toBe(true);
    expect(status.optionalUpgrade).toContain('comprobación documental opcional');
    expect(status.verificationSummary.score).toBe(4);
    expect(status.identityVerification.status).toBe('unverified');
  });

  test('uses documentary verification only as the optional top layer', () => {
    const status = buildUserVerificationStatus({
      emailVerified: true,
      phoneVerified: true,
      phone: '+5491122334455',
      bio: 'Perfil completo para anfitrión.',
      zone: 'Mar del Tuyú',
      profilePhoto: 'https://example.com/avatar.jpg',
      totalBookings: 5,
      completedBookings: 3,
      totalReviewsWritten: 2,
      totalReviewsReceived: 3,
      totalConversations: 6,
      totalMessages: 20,
      documentarySubmitted: true,
      documentaryVerified: true,
      identityVerificationStatus: 'verified',
      identityVerificationProvider: 'documentary',
      identityVerifiedAt: '2026-04-08T00:00:00.000Z',
    });

    expect(status.level).toBe('NIVEL_4');
    expect(status.checks.documentaryVerified).toBe(true);
    expect(status.optionalUpgrade).toBeNull();
    expect(status.identityVerification).toEqual({
      status: 'verified',
      provider: 'documentary',
      verifiedAt: '2026-04-08T00:00:00.000Z',
    });
    expect(status.verificationSummary.score).toBe(5);
  });
});