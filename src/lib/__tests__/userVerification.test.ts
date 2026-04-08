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
    });

    expect(status.level).toBe('NIVEL_4');
    expect(status.checks.documentaryVerified).toBe(true);
    expect(status.optionalUpgrade).toBeNull();
  });
});