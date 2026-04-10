import type { InteractionHistorySignal } from '../types';

type ReviewLike = {
  type?: 'host_to_guest' | 'guest_to_host' | string;
  agreementKept?: boolean;
  wouldInteractAgain?: boolean;
  hadIncident?: boolean;
  photosMatchReality?: boolean;
};

export const getReviewInteractionSignals = (review: ReviewLike): InteractionHistorySignal[] => {
  const signals: InteractionHistorySignal[] = [];

  if (review.agreementKept) {
    signals.push({
      key: 'agreements',
      label: 'Se cumplió lo acordado',
      tone: 'positive',
    });
  }

  if (review.type === 'guest_to_host' && review.photosMatchReality) {
    signals.push({
      key: 'listing-consistency',
      label: 'El aviso coincidió con lo publicado',
      tone: 'positive',
    });
  }

  if (review.wouldInteractAgain) {
    signals.push({
      key: 'return',
      label: 'Volverían a interactuar',
      tone: 'positive',
    });
  }

  if (review.hadIncident) {
    signals.push({
      key: 'caution',
      label: 'Hubo una situación a considerar',
      tone: 'neutral',
    });
  }

  return signals;
};