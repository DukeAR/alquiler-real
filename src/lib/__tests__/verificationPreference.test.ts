import { beforeEach, describe, expect, test } from 'vitest';

import {
  VERIFICATION_PREFERENCE_OPEN_THRESHOLD,
  clearVerificationPreferenceState,
  getVerificationPreferenceState,
  trackVerificationPreferenceOpen,
  trackVerificationPreferenceSave,
} from '../verificationPreference';

const buildHighVerificationProperty = (id: string) => ({
  id,
  title: 'Casa con patio',
  description: 'Una casa lista para escapadas de fin de semana.',
  location: 'Villa Gesell',
  propertyType: 'Casa',
  price: 98000,
  maxGuests: 4,
  imageUrl: 'https://example.com/property.jpg',
  images: ['https://example.com/property.jpg'],
  verificationPhotoCount: 4,
  identityValidated: true,
  locationVerified: true,
  videoValidated: true,
  lat: -37.257,
  lng: -56.973,
});

describe('verificationPreference', () => {
  beforeEach(() => {
    clearVerificationPreferenceState();
  });

  test('activates after opening three distinct highly verified properties', () => {
    const firstState = trackVerificationPreferenceOpen(buildHighVerificationProperty('p1'));
    const secondState = trackVerificationPreferenceOpen(buildHighVerificationProperty('p2'));
    const thirdState = trackVerificationPreferenceOpen(buildHighVerificationProperty('p3'));

    expect(firstState.caresAboutVerification).toBe(false);
    expect(secondState.caresAboutVerification).toBe(false);
    expect(thirdState.caresAboutVerification).toBe(true);
    expect(thirdState.openedHighVerificationPropertyIds).toEqual(['p1', 'p2', 'p3']);
    expect(thirdState.openedHighVerificationPropertyIds).toHaveLength(VERIFICATION_PREFERENCE_OPEN_THRESHOLD);
  });

  test('does not count the same highly verified property twice', () => {
    trackVerificationPreferenceOpen(buildHighVerificationProperty('p1'));
    const nextState = trackVerificationPreferenceOpen(buildHighVerificationProperty('p1'));

    expect(nextState.openedHighVerificationPropertyIds).toEqual(['p1']);
    expect(nextState.caresAboutVerification).toBe(false);
  });

  test('activates immediately after saving a highly verified property', () => {
    const nextState = trackVerificationPreferenceSave(buildHighVerificationProperty('p9'));

    expect(nextState.caresAboutVerification).toBe(true);
    expect(nextState.savedHighVerificationPropertyIds).toEqual(['p9']);
  });

  test('ignores interactions with low verification properties', () => {
    trackVerificationPreferenceOpen({
      id: 'p2',
      identityValidated: true,
      locationVerified: true,
      videoValidated: false,
      verificationPhotoCount: 0,
    });
    trackVerificationPreferenceSave({
      id: 'p3',
      verificationScore: 2,
    });

    expect(getVerificationPreferenceState()).toEqual({
      caresAboutVerification: false,
      openedHighVerificationPropertyIds: [],
      savedHighVerificationPropertyIds: [],
    });
  });
});