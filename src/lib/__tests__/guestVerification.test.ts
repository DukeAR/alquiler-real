import { describe, expect, test } from 'vitest';

import {
  buildGuestVerificationModel,
  buildGuestVerificationSummary,
  getGuestVerificationMissingRequirements,
  getGuestVerificationScore,
} from '../guestVerification';

describe('guestVerification', () => {
  test('builds the canonical five guest checks with real platform activity', () => {
    const summary = buildGuestVerificationSummary({
      emailVerified: true,
      phoneVerified: false,
      phone: '+54 11 5555 0000',
      bio: 'Viajo seguido.',
      zone: 'Caballito',
      profilePhoto: 'https://example.com/avatar.jpg',
      totalConversations: 2,
      totalMessages: 5,
      documentaryVerified: false,
    });

    expect(summary).toEqual({
      score: 3,
      maxScore: 5,
      items: [
        {
          key: 'email',
          label: 'Email verificado',
          status: 'complete',
          description: 'El email principal de la cuenta ya está confirmado.',
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
          status: 'complete',
          description: 'La cuenta ya tiene foto, presentación, zona y teléfono cargados.',
        },
        {
          key: 'history',
          label: 'Historial real en la plataforma',
          status: 'complete',
          description: 'La cuenta ya muestra 2 conversaciones y 5 mensajes dentro de la plataforma.',
        },
        {
          key: 'documentary',
          label: 'Identidad documental',
          status: 'pending',
          description: 'Todavía no hay una verificación de identidad completa.',
        },
      ],
    });
    expect(getGuestVerificationScore({ verificationSummary: summary })).toBe(3);
    expect(getGuestVerificationMissingRequirements({ verificationSummary: summary })).toEqual([
      'Agregá tu teléfono',
    ]);
  });

  test('preserves explicit summary items when only the canonical payload is available', () => {
    const score = getGuestVerificationScore({
      verificationSummary: {
        score: 4,
        maxScore: 5,
        items: [
          {
            key: 'email',
            label: 'Email verificado',
            status: 'complete',
            description: 'El email principal de la cuenta ya está confirmado.',
          },
          {
            key: 'phone',
            label: 'Teléfono verificado',
            status: 'complete',
            description: 'El teléfono principal de la cuenta ya está confirmado.',
          },
          {
            key: 'profile',
            label: 'Perfil completo',
            status: 'pending',
            description: 'Todavía faltan datos para completar el perfil.',
          },
          {
            key: 'history',
            label: 'Historial real en la plataforma',
            status: 'complete',
            description: 'La cuenta ya muestra 1 estadía completada dentro de la plataforma.',
          },
          {
            key: 'documentary',
            label: 'Identidad documental',
            status: 'complete',
            description: 'La identidad ya fue verificada.',
          },
        ],
      },
      documentaryVerified: false,
    });

    expect(score).toBe(4);
  });

  test('builds a canonical guest verification model with score, items and identity metadata', () => {
    const verification = buildGuestVerificationModel({
      emailVerified: true,
      phoneVerified: true,
      phone: '+54 11 5555 0000',
      bio: 'Perfil listo.',
      zone: 'Caballito',
      profilePhoto: 'https://example.com/avatar.jpg',
      completedBookings: 2,
      hostReviewsCount: 1,
      documentaryVerified: true,
      identityVerificationStatus: 'verified',
      identityVerificationProvider: 'documentary',
      identityVerifiedAt: '2026-04-08T00:00:00.000Z',
    });

    expect(verification.verificationScore).toBe(5);
    expect(verification.verificationItems).toHaveLength(5);
    expect(verification.missingRequirements).toEqual([]);
    expect(verification.identityVerification).toEqual({
      status: 'verified',
      provider: 'documentary',
      verifiedAt: '2026-04-08T00:00:00.000Z',
    });
  });
});