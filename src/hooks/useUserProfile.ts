import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import type { PremiumVerificationOffer } from '../lib/premiumVerification';
import type {
  UserIdentityVerification,
  UserVerificationSummary,
} from '../lib/userVerification';

export type ValidationChecks = {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  platformActivity: boolean;
  historyVerified: boolean;
  reviewsVerified: boolean;
  documentarySubmitted: boolean;
  documentaryVerified: boolean;
};

export type ValidationCategory = {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  summary: string;
  checks: Array<{
    id: string;
    label: string;
    description: string;
    done: boolean;
    optional?: boolean;
  }>;
};

export type ValidationData = {
  level?: string;
  progress?: number;
  levelNumber?: number;
  levelLabel?: string;
  shortLabel?: string;
  nextLevel?: string | null;
  verificationScore?: number;
  headline?: string;
  summary?: string;
  nextStep?: string;
  optionalUpgrade?: string | null;
  highValueBookingEligible?: boolean;
  identityVerification?: UserIdentityVerification;
  verificationSummary?: UserVerificationSummary;
  verificationItems?: UserVerificationSummary['items'];
  checks?: ValidationChecks;
  missingRequirements?: string[];
  categories?: ValidationCategory[];
  premiumDocumentaryOffer?: PremiumVerificationOffer | null;
  benefits?: {
    current: string[];
    next: string[];
  };
};

export type ActivityData = {
  total_bookings?: number;
  total_reviews_written?: number;
  total_reviews_received?: number;
  last_booking_date?: string;
};

export type ProfileReview = {
  id?: string;
  type?: 'host_review' | 'guest_review' | 'host_to_guest' | 'guest_to_host';
  propertyTitle?: string;
  userName?: string;
  rating?: number;
  comment?: string;
  categories?: Array<{ key: string; label: string; score: number }>;
  categoryScores?: Array<{ key: string; label: string; score: number }>;
  agreementKept?: boolean;
  wouldInteractAgain?: boolean;
  hadIncident?: boolean;
  photosMatchReality?: boolean;
  createdAt?: string;
  created_at?: string;
};

export type ReviewsData = {
  written: ProfileReview[];
  received: ProfileReview[];
};

type Options = {
  autoLoad?: boolean;
};

const EMPTY_REVIEWS: ReviewsData = { written: [], received: [] };

export function useUserProfile(options: Options = {}) {
  const { autoLoad = true } = options;
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [reviews, setReviews] = useState<ReviewsData>(EMPTY_REVIEWS);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [validationResult, activityResult, reviewsResult] = await Promise.allSettled([
      apiJson<ValidationData>('/api/verification/status', { includeCredentials: true }),
      apiJson<ActivityData>('/api/users/activity', { includeCredentials: true }),
      apiJson<ReviewsData>('/api/users/reviews', { includeCredentials: true }),
    ]);

    let nextError: string | null = null;

    if (validationResult.status === 'fulfilled') {
      setValidationData(validationResult.value);
    } else {
      nextError = validationResult.reason instanceof Error ? validationResult.reason.message : 'No pudimos cargar tu perfil.';
    }

    if (activityResult.status === 'fulfilled') {
      setActivity(activityResult.value);
    } else if (!nextError) {
      nextError = activityResult.reason instanceof Error ? activityResult.reason.message : 'No pudimos cargar tu actividad.';
    }

    if (reviewsResult.status === 'fulfilled') {
      setReviews({
        written: Array.isArray(reviewsResult.value?.written) ? reviewsResult.value.written : [],
        received: Array.isArray(reviewsResult.value?.received) ? reviewsResult.value.received : [],
      });
    } else {
      setReviews(EMPTY_REVIEWS);
      if (!nextError) {
        nextError = reviewsResult.reason instanceof Error ? reviewsResult.reason.message : 'No pudimos cargar tus reseñas.';
      }
    }

    setError(nextError);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return;
    }

    void reload();
  }, [autoLoad, reload]);

  return {
    validationData,
    activity,
    reviews,
    loading,
    error,
    reload,
  };
}