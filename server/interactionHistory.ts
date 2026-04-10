export type InteractionHistoryTone = 'positive' | 'neutral';

export type InteractionHistorySignal = {
  key: string;
  label: string;
  tone: InteractionHistoryTone;
  detail?: string;
};

export type GuestInteractionHistory = {
  completedStays: number;
  feedbackCount: number;
  agreementsKeptCount: number;
  wouldInteractAgainCount: number;
  incidentsCount: number;
  publicSignals: InteractionHistorySignal[];
};

export type HostInteractionHistory = {
  completedReservationsCount: number;
  feedbackCount: number;
  agreementsKeptCount: number;
  listingConsistentCount: number;
  wouldInteractAgainCount: number;
  incidentsCount: number;
  avgResponseTimeMinutes: number;
  publicSignals: InteractionHistorySignal[];
};

type FeedbackLike = {
  agreementKept?: unknown;
  agreement_kept?: unknown;
  wouldInteractAgain?: unknown;
  would_interact_again?: unknown;
  hadIncident?: unknown;
  had_incident?: unknown;
  photosMatchReality?: unknown;
  photos_match_reality?: unknown;
  pressureToBookFast?: unknown;
  pressure_to_book_fast?: unknown;
  rating?: unknown;
};

const isTrueFlag = (value: unknown) => value === true || value === 1 || value === '1' || value === 't' || value === 'true';

const isFalseFlag = (value: unknown) => value === false || value === 0 || value === '0' || value === 'f' || value === 'false';

const readOptionalBoolean = (...values: unknown[]) => {
  for (const value of values) {
    if (isTrueFlag(value)) {
      return true;
    }

    if (isFalseFlag(value)) {
      return false;
    }
  }

  return undefined;
};

const toSafeInteger = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.round(numericValue)) : 0;
};

const getRating = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const getListingConsistency = (feedback: FeedbackLike) => {
  const explicitValue = readOptionalBoolean(feedback.photosMatchReality, feedback.photos_match_reality);

  if (explicitValue !== undefined) {
    return explicitValue;
  }

  const rating = getRating(feedback.rating);
  if (rating !== null) {
    return rating >= 4;
  }

  return true;
};

export const resolveAgreementKept = (feedback: FeedbackLike) => {
  const explicitValue = readOptionalBoolean(feedback.agreementKept, feedback.agreement_kept);

  if (explicitValue !== undefined) {
    return explicitValue;
  }

  const hadIncident = resolveHadIncident(feedback);
  if (hadIncident) {
    return false;
  }

  const rating = getRating(feedback.rating);
  if (rating !== null) {
    return rating >= 4;
  }

  return true;
};

export const resolveWouldInteractAgain = (feedback: FeedbackLike) => {
  const explicitValue = readOptionalBoolean(feedback.wouldInteractAgain, feedback.would_interact_again);

  if (explicitValue !== undefined) {
    return explicitValue;
  }

  const hadIncident = resolveHadIncident(feedback);
  if (hadIncident) {
    return false;
  }

  const rating = getRating(feedback.rating);
  if (rating !== null) {
    return rating >= 4;
  }

  return true;
};

export const resolveHadIncident = (feedback: FeedbackLike) => {
  const explicitValue = readOptionalBoolean(feedback.hadIncident, feedback.had_incident);

  if (explicitValue !== undefined) {
    return explicitValue;
  }

  const pressureToBookFast = readOptionalBoolean(feedback.pressureToBookFast, feedback.pressure_to_book_fast);
  if (pressureToBookFast === true) {
    return true;
  }

  const listingConsistency = readOptionalBoolean(feedback.photosMatchReality, feedback.photos_match_reality);
  if (listingConsistency === false) {
    return true;
  }

  const rating = getRating(feedback.rating);
  if (rating !== null) {
    return rating <= 3;
  }

  return false;
};

const formatCountLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

const getHostResponseTimeLabel = (avgResponseTimeMinutes: number) => {
  if (avgResponseTimeMinutes <= 0) {
    return null;
  }

  if (avgResponseTimeMinutes < 60) {
    return `Responde en alrededor de ${avgResponseTimeMinutes} min`;
  }

  if (avgResponseTimeMinutes < 24 * 60) {
    return 'Suele responder dentro del día';
  }

  return 'Las respuestas pueden tardar un poco más';
};

const shouldShowPositiveSignal = (positiveCount: number, feedbackCount: number) => (
  feedbackCount > 0 && positiveCount / feedbackCount >= 0.6
);

export const buildGuestInteractionHistory = (params: {
  completedStays?: unknown;
  feedbacks?: FeedbackLike[];
  feedbackCount?: unknown;
  agreementsKeptCount?: unknown;
  wouldInteractAgainCount?: unknown;
  incidentsCount?: unknown;
}): GuestInteractionHistory => {
  const completedStays = toSafeInteger(params.completedStays);
  const derivedFeedbacks = Array.isArray(params.feedbacks) ? params.feedbacks : [];
  const hasExplicitCounts = params.feedbackCount !== undefined
    || params.agreementsKeptCount !== undefined
    || params.wouldInteractAgainCount !== undefined
    || params.incidentsCount !== undefined;
  const feedbackCount = hasExplicitCounts ? toSafeInteger(params.feedbackCount) : derivedFeedbacks.length;
  const agreementsKeptCount = hasExplicitCounts
    ? Math.min(feedbackCount, toSafeInteger(params.agreementsKeptCount))
    : derivedFeedbacks.filter((feedback) => resolveAgreementKept(feedback)).length;
  const wouldInteractAgainCount = hasExplicitCounts
    ? Math.min(feedbackCount, toSafeInteger(params.wouldInteractAgainCount))
    : derivedFeedbacks.filter((feedback) => resolveWouldInteractAgain(feedback)).length;
  const incidentsCount = hasExplicitCounts
    ? Math.min(feedbackCount, toSafeInteger(params.incidentsCount))
    : derivedFeedbacks.filter((feedback) => resolveHadIncident(feedback)).length;

  const publicSignals: InteractionHistorySignal[] = [];

  if (shouldShowPositiveSignal(agreementsKeptCount, feedbackCount)) {
    publicSignals.push({
      key: 'agreements',
      label: 'Se cumplió lo acordado',
      tone: 'positive',
      detail: `${agreementsKeptCount} cierres compartidos hablaron de acuerdos respetados.`,
    });
  }

  if (shouldShowPositiveSignal(wouldInteractAgainCount, feedbackCount)) {
    publicSignals.push({
      key: 'return',
      label: 'Volverían a interactuar',
      tone: 'positive',
      detail: `${wouldInteractAgainCount} anfitriones dejaron esta señal al cerrar la estadía.`,
    });
  }

  if (feedbackCount > 0 && (incidentsCount > 0 || !shouldShowPositiveSignal(agreementsKeptCount, feedbackCount) || !shouldShowPositiveSignal(wouldInteractAgainCount, feedbackCount))) {
    publicSignals.push({
      key: 'caution',
      label: 'Hubo una situación a considerar',
      tone: 'neutral',
      detail: 'La app lo resume sin publicar detalles del cierre.',
    });
  }

  return {
    completedStays,
    feedbackCount,
    agreementsKeptCount,
    wouldInteractAgainCount,
    incidentsCount,
    publicSignals,
  };
};

export const buildHostInteractionHistory = (params: {
  completedReservationsCount?: unknown;
  avgResponseTimeMinutes?: unknown;
  feedbacks?: FeedbackLike[];
  feedbackCount?: unknown;
  agreementsKeptCount?: unknown;
  listingConsistentCount?: unknown;
  wouldInteractAgainCount?: unknown;
  incidentsCount?: unknown;
}): HostInteractionHistory => {
  const completedReservationsCount = toSafeInteger(params.completedReservationsCount);
  const avgResponseTimeMinutes = toSafeInteger(params.avgResponseTimeMinutes);
  const derivedFeedbacks = Array.isArray(params.feedbacks) ? params.feedbacks : [];
  const hasExplicitCounts = params.feedbackCount !== undefined
    || params.agreementsKeptCount !== undefined
    || params.listingConsistentCount !== undefined
    || params.wouldInteractAgainCount !== undefined
    || params.incidentsCount !== undefined;
  const feedbackCount = hasExplicitCounts ? toSafeInteger(params.feedbackCount) : derivedFeedbacks.length;
  const agreementsKeptCount = hasExplicitCounts
    ? Math.min(feedbackCount, toSafeInteger(params.agreementsKeptCount))
    : derivedFeedbacks.filter((feedback) => resolveAgreementKept(feedback)).length;
  const listingConsistentCount = hasExplicitCounts
    ? Math.min(feedbackCount, toSafeInteger(params.listingConsistentCount))
    : derivedFeedbacks.filter((feedback) => getListingConsistency(feedback)).length;
  const wouldInteractAgainCount = hasExplicitCounts
    ? Math.min(feedbackCount, toSafeInteger(params.wouldInteractAgainCount))
    : derivedFeedbacks.filter((feedback) => resolveWouldInteractAgain(feedback)).length;
  const incidentsCount = hasExplicitCounts
    ? Math.min(feedbackCount, toSafeInteger(params.incidentsCount))
    : derivedFeedbacks.filter((feedback) => resolveHadIncident(feedback)).length;

  const publicSignals: InteractionHistorySignal[] = [];

  if (completedReservationsCount > 0) {
    publicSignals.push({
      key: 'completed-reservations',
      label: formatCountLabel(completedReservationsCount, 'reserva completada', 'reservas completadas'),
      tone: 'positive',
      detail: 'Es el historial cerrado dentro de la plataforma.',
    });
  }

  if (shouldShowPositiveSignal(listingConsistentCount, feedbackCount)) {
    publicSignals.push({
      key: 'listing-consistency',
      label: 'El aviso suele coincidir con lo publicado',
      tone: 'positive',
      detail: `${listingConsistentCount} cierres compartidos remarcaron consistencia con el aviso.`,
    });
  }

  const responseTimeLabel = getHostResponseTimeLabel(avgResponseTimeMinutes);
  if (responseTimeLabel) {
    publicSignals.push({
      key: 'response-time',
      label: responseTimeLabel,
      tone: avgResponseTimeMinutes < 24 * 60 ? 'positive' : 'neutral',
    });
  }

  if (feedbackCount > 0 && (incidentsCount > 0 || !shouldShowPositiveSignal(listingConsistentCount, feedbackCount) || !shouldShowPositiveSignal(agreementsKeptCount, feedbackCount) || !shouldShowPositiveSignal(wouldInteractAgainCount, feedbackCount))) {
    publicSignals.push({
      key: 'caution',
      label: 'Hubo una situación a considerar',
      tone: 'neutral',
      detail: 'La app mantiene el cierre en una señal breve y sin detalles públicos.',
    });
  }

  return {
    completedReservationsCount,
    feedbackCount,
    agreementsKeptCount,
    listingConsistentCount,
    wouldInteractAgainCount,
    incidentsCount,
    avgResponseTimeMinutes,
    publicSignals,
  };
};