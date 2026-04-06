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
});