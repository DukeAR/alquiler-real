import type {
  GuestRequestProfile,
  HostInteractionHistory,
  InteractionContinuity,
} from '../types';

type GuestPositiveBookingProfileInput = {
  completedStays: number;
  cancellationsCount: number;
  conflictsCount: number;
  feedbackCount: number;
  agreementsKeptCount: number;
  wouldInteractAgainCount: number;
  incidentsCount: number;
};

const formatCountLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

const hasPositiveRatio = (positiveCount: number, totalCount: number, threshold = 0.6) => (
  totalCount > 0 && positiveCount / totalCount >= threshold
);

const uniqueLabels = (labels: string[]) => Array.from(new Set(labels.filter((label) => label.trim().length > 0)));

const formatResponseAverage = (minutes: number) => {
  if (minutes < 60) {
    return `Promedio: ~${minutes} min`;
  }

  const roundedHours = Math.round((minutes / 60) * 10) / 10;
  return `Promedio: ~${roundedHours} h`;
};

export const getHostResponseSignal = (history?: HostInteractionHistory | null) => {
  const avgResponseTimeMinutes = Math.max(0, Math.round(history?.avgResponseTimeMinutes ?? 0));

  if (avgResponseTimeMinutes <= 0 || avgResponseTimeMinutes > 180) {
    return null;
  }

  return {
    label: 'Responde rápido',
    detail: formatResponseAverage(avgResponseTimeMinutes),
  };
};

export const getHostVisibilityBoost = (history?: HostInteractionHistory | null) => {
  if (!history) {
    return 0;
  }

  let boost = 0;

  if (history.completedReservationsCount >= 3) {
    boost += 2;
  } else if (history.completedReservationsCount >= 1) {
    boost += 1;
  }

  if (hasPositiveRatio(history.agreementsKeptCount, history.feedbackCount, 0.8)) {
    boost += 2;
  } else if (hasPositiveRatio(history.agreementsKeptCount, history.feedbackCount)) {
    boost += 1;
  }

  if (hasPositiveRatio(history.wouldInteractAgainCount, history.feedbackCount, 0.8)) {
    boost += 2;
  } else if (hasPositiveRatio(history.wouldInteractAgainCount, history.feedbackCount)) {
    boost += 1;
  }

  if (history.avgResponseTimeMinutes > 0 && history.avgResponseTimeMinutes <= 60) {
    boost += 2;
  } else if (history.avgResponseTimeMinutes > 0 && history.avgResponseTimeMinutes <= 180) {
    boost += 1;
  }

  if (history.feedbackCount > 0 && history.incidentsCount === 0) {
    boost += 1;
  }

  return boost;
};

export const getGuestPositiveCoordinationSignals = (profile?: GuestRequestProfile | null) => {
  if (!profile) {
    return [] as string[];
  }

  const signals: string[] = [];
  const completedStays = Math.max(0, Math.round(profile.platformHistory.completedStays ?? 0));
  const feedbackCount = Math.max(0, Math.round(profile.interactionHistory.feedbackCount ?? 0));
  const agreementsKeptCount = Math.max(0, Math.round(profile.interactionHistory.agreementsKeptCount ?? 0));
  const wouldInteractAgainCount = Math.max(0, Math.round(profile.interactionHistory.wouldInteractAgainCount ?? 0));
  const incidentsCount = Math.max(0, Math.round(profile.interactionHistory.incidentsCount ?? 0));

  if (completedStays > 0) {
    signals.push(formatCountLabel(completedStays, 'estadía completada', 'estadías completadas'));
  }

  if (incidentsCount === 0 && hasPositiveRatio(agreementsKeptCount, feedbackCount)) {
    signals.push('Cumple lo acordado');
  }

  if (incidentsCount === 0 && hasPositiveRatio(wouldInteractAgainCount, feedbackCount)) {
    signals.push('Comunicación clara');
  }

  return uniqueLabels(signals).slice(0, 3);
};

export const getGuestPositiveBookingProfile = (input: GuestPositiveBookingProfileInput) => {
  const completedHistory = input.completedStays >= 2;
  const stableOperation = input.incidentsCount === 0 && input.conflictsCount === 0 && input.cancellationsCount <= 1;
  const agreementsPositive = input.feedbackCount === 0
    ? input.completedStays >= 3
    : hasPositiveRatio(input.agreementsKeptCount, input.feedbackCount);
  const communicationPositive = input.feedbackCount === 0
    ? input.completedStays >= 2
    : hasPositiveRatio(input.wouldInteractAgainCount, input.feedbackCount);
  const positiveSignalsCount = [completedHistory, stableOperation, agreementsPositive, communicationPositive].filter(Boolean).length;

  return {
    positiveSignalsCount,
    streamlinedBookingEligible: completedHistory && stableOperation && positiveSignalsCount >= 3,
    protectedBookingEligible: completedHistory && stableOperation && agreementsPositive && communicationPositive,
  };
};

export const buildInteractionContinuity = (
  sharedCompletedBookings: number,
  sharedIncidentBookings: number,
): InteractionContinuity | null => {
  const safeCompletedBookings = Math.max(0, Math.round(sharedCompletedBookings));
  const safeIncidentBookings = Math.max(0, Math.round(sharedIncidentBookings));

  if (safeCompletedBookings < 1 || safeIncidentBookings > 0) {
    return null;
  }

  return {
    label: 'Ya interactuaron antes sin inconvenientes',
    detail: safeCompletedBookings === 1
      ? 'Ya tuvieron una coordinación cerrada sin incidentes y pueden retomar desde una base conocida.'
      : `Ya tuvieron ${safeCompletedBookings} coordinaciones cerradas sin incidentes.`,
    sharedCompletedBookings: safeCompletedBookings,
  };
};