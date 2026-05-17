import type { MarketplaceMonetizationPlan } from './marketplaceMonetization';

export const PREMIUM_DOCUMENTARY_OFFER_TYPE = 'documentary-user' as const;

export const PREMIUM_ONSITE_OFFER_TYPE = 'onsite-property' as const;

export const PREMIUM_VERIFICATION_CURRENCY = 'ARS' as const;

export const PREMIUM_HOST_DOCUMENTARY_VISIBILITY_BOOST = 0.35;

export const PREMIUM_ONSITE_VISIBILITY_BOOST = 0.65;

export type PremiumVerificationOfferType = typeof PREMIUM_DOCUMENTARY_OFFER_TYPE | typeof PREMIUM_ONSITE_OFFER_TYPE;

export type PremiumVerificationTargetType = 'user' | 'property';

export type PremiumVerificationPaymentStatus = 'pending' | 'confirmed' | 'waived';

export type PremiumVerificationProcessStatus =
  | 'pending'
  | 'pending_schedule'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'requires_review'
  | 'not_completed';

export interface PremiumVerificationOffer {
  offerType: PremiumVerificationOfferType;
  targetType: PremiumVerificationTargetType;
  title: string;
  summary: string;
  contextHint: string;
  visibilityHint: string;
  ctaLabel: string;
  checkoutLabel: string;
  processLabel: string;
  priceArs: number;
  currency: typeof PREMIUM_VERIFICATION_CURRENCY;
  isComplimentary: boolean;
  complimentaryReason: string | null;
  purchased: boolean;
  completed: boolean;
  redirectTo: string;
  monetization?: MarketplaceMonetizationPlan | null;
  orderId?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
}

export const formatPremiumPriceLabel = (priceArs: number, isComplimentary = false) => {
  if (isComplimentary) {
    return 'Gratis por lanzamiento';
  }

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: PREMIUM_VERIFICATION_CURRENCY,
    maximumFractionDigits: 0,
  }).format(priceArs);
};

export const getPremiumVisibilityBoost = (input: {
  premiumVisibilityBoost?: number | null;
  hostPremiumDocumentaryVerified?: boolean | null;
  hasPresencialVerification?: boolean | null;
}) => {
  if (typeof input.premiumVisibilityBoost === 'number' && Number.isFinite(input.premiumVisibilityBoost)) {
    return input.premiumVisibilityBoost;
  }

  return (input.hostPremiumDocumentaryVerified ? PREMIUM_HOST_DOCUMENTARY_VISIBILITY_BOOST : 0)
    + (input.hasPresencialVerification ? PREMIUM_ONSITE_VISIBILITY_BOOST : 0);
};