import {
  buildPropertyAdvancedVerificationItems,
  buildPropertyVerificationSummary,
  type PropertyAdvancedVerificationItem,
  type PropertyVerificationItem,
} from '../src/lib/verificationModel';
import { getPropertyVerificationProgress } from '../src/lib/propertyVerification';

export type PropertyVerificationStatus = 'complete' | 'pending';

export const REAL_VERIFICATION_FILTER_MIN_SCORE = 3;

type PropertyVerificationSource = {
  title?: string;
  location?: string;
  description?: string;
  price?: number | string | null;
  maxGuests?: number | string | null;
  propertyType?: string | null;
  imageUrl?: string | null;
  images?: string[] | string | null;
  verificationPhotoCount?: number | string | null;
  verificationVideoCount?: number | string | null;
  verificationDocumentCount?: number | string | null;
  verificationDocumentsReviewedCount?: number | string | null;
  identityValidated?: boolean;
  locationVerified?: boolean;
  materialVerified?: boolean;
  videoValidated?: boolean;
  hasPresencialVerification?: boolean;
  onsiteVerifiedAt?: string | Date | null;
  documentationSubmitted?: boolean;
  documentationVerified?: boolean;
  manualReviewReady?: boolean;
  manualReviewCompleted?: boolean;
  availabilityValidated?: boolean;
  lat?: number | string | null;
  lng?: number | string | null;
};

export const buildPropertyVerification = (property: PropertyVerificationSource) => {
  const verificationSummary = buildPropertyVerificationSummary(property);
  const advancedVerificationItems = buildPropertyAdvancedVerificationItems(property);

  return {
    verificationSummary,
    verificationScore: verificationSummary.score,
    verificationItems: verificationSummary.items as PropertyVerificationItem[],
    advancedVerificationItems: advancedVerificationItems as PropertyAdvancedVerificationItem[],
    verificationProgress: getPropertyVerificationProgress({
      ...property,
      verificationSummary,
      advancedVerificationItems,
    }),
  };
};