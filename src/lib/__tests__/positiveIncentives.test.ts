import { describe, expect, test } from 'vitest';

import type { GuestRequestProfile, HostInteractionHistory } from '../../types';
import {
  buildInteractionContinuity,
  getGuestPositiveBookingProfile,
  getGuestPositiveCoordinationSignals,
  getHostResponseSignal,
  getHostVisibilityBoost,
} from '../positiveIncentives';

const sampleHostHistory: HostInteractionHistory = {
  completedReservationsCount: 6,
  feedbackCount: 4,
  agreementsKeptCount: 4,
  listingConsistentCount: 4,
  wouldInteractAgainCount: 4,
  incidentsCount: 0,
  avgResponseTimeMinutes: 18,
  publicSignals: [],
};

const sampleGuestProfile: GuestRequestProfile = {
  identityVerified: true,
  platformHistory: {
    completedStays: 4,
    conflictsCount: 0,
    cancellationsCount: 0,
  },
  interactionHistory: {
    completedStays: 4,
    feedbackCount: 3,
    agreementsKeptCount: 3,
    wouldInteractAgainCount: 3,
    incidentsCount: 0,
    publicSignals: [],
  },
  hostReviews: [],
  profileCompletion: {
    profileComplete: true,
    photoUploaded: true,
    basicDetailsComplete: true,
  },
  verificationSummary: {
    score: 5,
    maxScore: 5,
    items: [],
  },
  verificationScore: 5,
  verificationItems: [],
  identityVerification: {
    status: 'verified',
    provider: null,
    verifiedAt: null,
  },
  operationSignals: [],
  memberSince: '2024-01-10',
  dataAvailability: {
    identity: true,
    platformHistory: true,
    hostReviews: true,
    profileCompletion: true,
    operationSignals: true,
    memberSince: true,
    anyStructuredData: true,
  },
  dataSource: 'api',
};

describe('positiveIncentives', () => {
  test('returns a fast-response host signal and a positive visibility boost', () => {
    expect(getHostResponseSignal(sampleHostHistory)).toEqual({
      label: 'Responde rápido',
      detail: 'Promedio: ~18 min',
    });
    expect(getHostVisibilityBoost(sampleHostHistory)).toBeGreaterThan(0);
  });

  test('derives guest positive coordination signals from stable history', () => {
    expect(getGuestPositiveCoordinationSignals(sampleGuestProfile)).toEqual([
      '4 estadías completadas',
      'Cumple lo acordado',
      'Comunicación clara',
    ]);
  });

  test('marks strong guest histories as eligible for streamlined protected booking', () => {
    expect(getGuestPositiveBookingProfile({
      completedStays: 4,
      cancellationsCount: 0,
      conflictsCount: 0,
      feedbackCount: 3,
      agreementsKeptCount: 3,
      wouldInteractAgainCount: 3,
      incidentsCount: 0,
    })).toEqual({
      positiveSignalsCount: 4,
      streamlinedBookingEligible: true,
      protectedBookingEligible: true,
    });
  });

  test('only exposes continuity when the shared history stayed incident-free', () => {
    expect(buildInteractionContinuity(2, 0)).toEqual({
      label: 'Ya interactuaron antes sin inconvenientes',
      detail: 'Ya tuvieron 2 coordinaciones cerradas sin incidentes.',
      sharedCompletedBookings: 2,
    });
    expect(buildInteractionContinuity(2, 1)).toBeNull();
  });
});