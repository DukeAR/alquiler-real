import {
  HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE,
  getPropertyVerificationScore,
} from './propertyVerification';

const VERIFICATION_PREFERENCE_STORAGE_KEY = 'verificationPreference_v1';

export const VERIFICATION_PREFERENCE_OPEN_THRESHOLD = 3;

type VerificationPreferenceProperty = Parameters<typeof getPropertyVerificationScore>[0] & {
  id?: string | null;
};

export type VerificationPreferenceState = {
  caresAboutVerification: boolean;
  openedHighVerificationPropertyIds: string[];
  savedHighVerificationPropertyIds: string[];
};

const createDefaultVerificationPreferenceState = (): VerificationPreferenceState => ({
  caresAboutVerification: false,
  openedHighVerificationPropertyIds: [],
  savedHighVerificationPropertyIds: [],
});

const dedupeIds = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

const isBrowser = () => typeof window !== 'undefined';

const sanitizeVerificationPreferenceState = (value: unknown): VerificationPreferenceState => {
  if (!value || typeof value !== 'object') {
    return createDefaultVerificationPreferenceState();
  }

  const candidate = value as Partial<VerificationPreferenceState>;
  const openedHighVerificationPropertyIds = dedupeIds(candidate.openedHighVerificationPropertyIds);
  const savedHighVerificationPropertyIds = dedupeIds(candidate.savedHighVerificationPropertyIds);

  return {
    caresAboutVerification:
      Boolean(candidate.caresAboutVerification)
      || openedHighVerificationPropertyIds.length >= VERIFICATION_PREFERENCE_OPEN_THRESHOLD
      || savedHighVerificationPropertyIds.length > 0,
    openedHighVerificationPropertyIds,
    savedHighVerificationPropertyIds,
  };
};

const readStoredVerificationPreferenceState = (): VerificationPreferenceState => {
  if (!isBrowser()) {
    return createDefaultVerificationPreferenceState();
  }

  try {
    const raw = window.sessionStorage.getItem(VERIFICATION_PREFERENCE_STORAGE_KEY);

    if (!raw) {
      return createDefaultVerificationPreferenceState();
    }

    return sanitizeVerificationPreferenceState(JSON.parse(raw));
  } catch {
    return createDefaultVerificationPreferenceState();
  }
};

const persistVerificationPreferenceState = (state: VerificationPreferenceState) => {
  const nextState = sanitizeVerificationPreferenceState(state);

  if (!isBrowser()) {
    return nextState;
  }

  try {
    window.sessionStorage.setItem(VERIFICATION_PREFERENCE_STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    return nextState;
  }

  return nextState;
};

const statesAreEqual = (left: VerificationPreferenceState, right: VerificationPreferenceState) => (
  left.caresAboutVerification === right.caresAboutVerification
  && left.openedHighVerificationPropertyIds.length === right.openedHighVerificationPropertyIds.length
  && left.savedHighVerificationPropertyIds.length === right.savedHighVerificationPropertyIds.length
  && left.openedHighVerificationPropertyIds.every((propertyId, index) => propertyId === right.openedHighVerificationPropertyIds[index])
  && left.savedHighVerificationPropertyIds.every((propertyId, index) => propertyId === right.savedHighVerificationPropertyIds[index])
);

const getTrackedPropertyId = (property: VerificationPreferenceProperty | null | undefined) => {
  if (typeof property?.id !== 'string') {
    return null;
  }

  const propertyId = property.id.trim();

  return propertyId.length > 0 ? propertyId : null;
};

const isHighVerificationProperty = (property: VerificationPreferenceProperty | null | undefined) => {
  if (!property) {
    return false;
  }

  return getPropertyVerificationScore(property) >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE;
};

export const getVerificationPreferenceState = () => readStoredVerificationPreferenceState();

export const clearVerificationPreferenceState = () => {
  if (isBrowser()) {
    try {
      window.sessionStorage.removeItem(VERIFICATION_PREFERENCE_STORAGE_KEY);
    } catch {
      return createDefaultVerificationPreferenceState();
    }
  }

  return createDefaultVerificationPreferenceState();
};

export const trackVerificationPreferenceOpen = (
  property: VerificationPreferenceProperty | null | undefined,
) => {
  if (!isHighVerificationProperty(property)) {
    return getVerificationPreferenceState();
  }

  const propertyId = getTrackedPropertyId(property);

  if (!propertyId) {
    return getVerificationPreferenceState();
  }

  const currentState = getVerificationPreferenceState();

  if (currentState.openedHighVerificationPropertyIds.includes(propertyId)) {
    return currentState;
  }

  const nextState = sanitizeVerificationPreferenceState({
    ...currentState,
    openedHighVerificationPropertyIds: [...currentState.openedHighVerificationPropertyIds, propertyId],
  });

  if (statesAreEqual(currentState, nextState)) {
    return currentState;
  }

  return persistVerificationPreferenceState(nextState);
};

export const trackVerificationPreferenceSave = (
  property: VerificationPreferenceProperty | null | undefined,
) => {
  if (!isHighVerificationProperty(property)) {
    return getVerificationPreferenceState();
  }

  const propertyId = getTrackedPropertyId(property);

  if (!propertyId) {
    return getVerificationPreferenceState();
  }

  const currentState = getVerificationPreferenceState();
  const savedHighVerificationPropertyIds = currentState.savedHighVerificationPropertyIds.includes(propertyId)
    ? currentState.savedHighVerificationPropertyIds
    : [...currentState.savedHighVerificationPropertyIds, propertyId];
  const nextState = sanitizeVerificationPreferenceState({
    ...currentState,
    caresAboutVerification: true,
    savedHighVerificationPropertyIds,
  });

  if (statesAreEqual(currentState, nextState)) {
    return currentState;
  }

  return persistVerificationPreferenceState(nextState);
};