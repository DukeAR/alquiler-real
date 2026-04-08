import { describe, expect, test } from 'vitest';

import {
  getGuestRequestProfileBannerCopy,
  getGuestRequestProfileEmptyStateMessage,
  getGuestRequestProfileScenario,
  getGuestSnapshotDetail,
  getGuestSnapshotTitle,
  resolveGuestRequestProfile,
} from '../guestRequestProfile';

describe('guestRequestProfile copy states', () => {
  test('uses sync-pending copy when no structured guest profile exists yet', () => {
    const profile = resolveGuestRequestProfile({ id: 'guest-1', userName: 'Marina', guestProfile: null });

    expect(getGuestRequestProfileScenario(profile)).toBe('sync-pending');
    expect(getGuestSnapshotTitle(profile)).toBe('Ficha en preparación');
    expect(getGuestSnapshotDetail(profile)).toBe('Todavía estamos cargando sus primeros datos');
    expect(getGuestRequestProfileBannerCopy(profile)).toEqual({
      title: 'Estamos armando esta ficha',
      description: 'Todavía se están cargando los primeros datos de esta cuenta.',
    });
    expect(getGuestRequestProfileEmptyStateMessage(profile, 'hostReviews')).toBe('Las reseñas de anfitriones van a aparecer acá cuando queden cargadas en la ficha.');
  });

  test('uses new-guest copy when there is an account but no visible history yet', () => {
    const profile = resolveGuestRequestProfile({
      id: 'guest-2',
      userName: 'Rocío',
      guestProfile: {
        identityVerified: true,
        memberSince: '2026-01-12',
        platformHistory: {
          completedStays: 0,
          conflictsCount: 0,
          cancellationsCount: 0,
        },
        hostReviews: [],
        profileCompletion: {
          profileComplete: false,
          photoUploaded: true,
          basicDetailsComplete: true,
        },
        operationSignals: [],
      },
    });

    expect(getGuestRequestProfileScenario(profile)).toBe('new-guest');
    expect(getGuestSnapshotTitle(profile)).toBe('Cuenta sin historial todavía');
    expect(getGuestSnapshotDetail(profile)).toBe('Todavía no hay estadías ni reseñas para revisar');
    expect(getGuestRequestProfileBannerCopy(profile)).toEqual({
      title: 'Cuenta sin historial todavía',
      description: 'Todavía no hay estadías ni reseñas de anfitriones para revisar.',
    });
    expect(getGuestRequestProfileEmptyStateMessage(profile, 'platformHistory')).toBe('Todavía no hay estadías previas o cancelaciones para revisar.');
  });

  test('uses partial-profile copy when only part of the ficha is available', () => {
    const profile = resolveGuestRequestProfile({
      id: 'guest-3',
      userName: 'Tomás',
      guestProfile: {
        identityVerified: true,
        memberSince: '2024-04-10',
      },
    });

    expect(getGuestRequestProfileScenario(profile)).toBe('partial-profile');
    expect(getGuestSnapshotTitle(profile)).toBe('Identidad confirmada');
    expect(getGuestSnapshotDetail(profile)).toBe('Ya hay datos visibles, pero faltan otros bloques.');
    expect(getGuestRequestProfileBannerCopy(profile)).toEqual({
      title: 'Faltan bloques por completar',
      description: 'Ya hay datos visibles, pero esta ficha todavía no está completa.',
    });
    expect(getGuestRequestProfileEmptyStateMessage(profile, 'platformHistory')).toBe('Todavía falta cargar el historial de estadías y cancelaciones.');
  });

  test('keeps the canonical verification summary when the backend already provides it', () => {
    const profile = resolveGuestRequestProfile({
      id: 'guest-3',
      userName: 'Tomás',
      guestProfile: {
        identityVerified: true,
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
      },
    });

    expect(profile.verificationSummary.score).toBe(4);
    expect(profile.verificationScore).toBe(4);
    expect(profile.verificationItems).toHaveLength(5);
    expect(profile.verificationSummary.items.find((item) => item.key === 'email')?.status).toBe('complete');
    expect(profile.verificationSummary.items.find((item) => item.key === 'history')?.status).toBe('complete');
  });

  test('normalizes the decision signals in a fixed order and keeps pending tracking explicit', () => {
    const profile = resolveGuestRequestProfile({
      id: 'guest-4',
      userName: 'Marina',
      guestProfile: {
        profileCompletion: {
          profileComplete: true,
          photoUploaded: true,
          basicDetailsComplete: true,
        },
        operationSignals: [
          { id: 'saved-property', label: 'Guardó la propiedad', active: true, source: 'api' },
          { id: 'consulted-before', label: 'Consultó antes de reservar', active: true, source: 'api' },
        ],
      },
    });

    expect(profile.operationSignals).toEqual([
      { id: 'consulted-before', label: 'Consultó antes de reservar', active: true, source: 'api' },
      { id: 'saved-property', label: 'Guardó la propiedad', active: true, source: 'api' },
      { id: 'returned-to-view', label: 'Volvió a verla', active: false, source: 'pending' },
      { id: 'completed-profile', label: 'Completó sus datos', active: true, source: 'derived' },
    ]);
  });
});