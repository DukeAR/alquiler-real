import {
  buildPropertyVerificationSummary,
  type PropertyVerificationItem,
} from '../src/lib/verificationModel';

export type PropertyVerificationStatus = 'complete' | 'pending';

export const REAL_VERIFICATION_FILTER_MIN_SCORE = 3;

type PropertyVerificationSource = {
  identityValidated?: boolean;
  locationVerified?: boolean;
  materialVerified?: boolean;
  videoValidated?: boolean;
  hasPresencialVerification?: boolean;
  onsiteVerifiedAt?: string | Date | null;
  completedBookingsCount?: number | string | null;
  realReviewsCount?: number | string | null;
  reviewsCount?: number | string | null;
};

export const buildPropertyVerification = (property: PropertyVerificationSource) => {
  const verificationSummary = buildPropertyVerificationSummary(property);

  return {
    verificationSummary,
    verificationScore: verificationSummary.score,
    verificationItems: verificationSummary.items as PropertyVerificationItem[],
  };
};