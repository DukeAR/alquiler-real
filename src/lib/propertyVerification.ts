import type { PremiumVerificationOffer } from './premiumVerification';
import {
  PROPERTY_VERIFICATION_KEYS,
  buildPropertyVerificationItem,
  buildPropertyVerificationSummary,
  type LegacyPropertyVerificationKey,
  type PropertyVerificationItem,
  type PropertyVerificationKey,
  type PropertyVerificationSummary,
} from './verificationModel';

export type {
  PropertyVerificationItem,
  PropertyVerificationKey,
  PropertyVerificationSummary,
} from './verificationModel';

export const VERIFICATION_SCORE_MAX = PROPERTY_VERIFICATION_KEYS.length;

export const REAL_VERIFICATION_FILTER_MIN_SCORE = 3;

export const HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE = 4;

export const TOP_VERIFIED_RESULTS_COUNT = 3;

export type PropertyVerificationStatus = 'complete' | 'pending';

type PropertyVerificationItemInput = Partial<PropertyVerificationItem> & {
  title?: string;
};

type PropertyVerificationSummaryInput = Partial<PropertyVerificationSummary> & {
  items?: PropertyVerificationItemInput[];
};

type PropertyVerificationLike = {
  verificationSummary?: PropertyVerificationSummaryInput | null;
  verificationScore?: number;
  verificationItems?: PropertyVerificationItemInput[];
  identityValidated?: boolean;
  locationVerified?: boolean;
  materialVerified?: boolean;
  videoValidated?: boolean;
  propertyRelationshipVerified?: boolean;
  isVerifiedProperty?: boolean;
  hasDigitalVerification?: boolean;
  hasPresencialVerification?: boolean;
  onsiteVerifiedAt?: string | Date | null;
  completedBookingsCount?: number | string | null;
  realReviewsCount?: number | string | null;
  reviewsCount?: number | string | null;
  hostPremiumDocumentaryVerified?: boolean;
  premiumVisibilityBoost?: number;
  premiumOnsiteOffer?: PremiumVerificationOffer | null;
};

type PropertySortLike = PropertyVerificationLike & {
  title?: string;
  location?: string;
  propertyType?: string;
  maxGuests?: number;
  rating?: number;
  reviewsCount?: number;
  price?: number;
};

export type PropertyCatalogSort = 'verification' | 'rating' | 'price';

export type PropertyCatalogSortContext = {
  searchQuery?: string;
  filters?: {
    guests?: string | number;
    type?: string;
    minPrice?: string | number;
    maxPrice?: string | number;
  };
};

const LEGACY_PROPERTY_KEY_ALIASES: Record<LegacyPropertyVerificationKey, PropertyVerificationKey> = {
  visual: 'material',
  relationship: 'history',
};

const PROPERTY_VERIFICATION_KEY_SET = new Set<string>(PROPERTY_VERIFICATION_KEYS);

const normalizeVerificationStatus = (status?: PropertyVerificationStatus) => status === 'complete' ? 'complete' : 'pending';

const isPropertyVerificationKey = (value: string): value is PropertyVerificationKey => PROPERTY_VERIFICATION_KEY_SET.has(value);

const normalizePropertyVerificationKey = (key?: string) => {
  if (!key) {
    return null;
  }

  if (key in LEGACY_PROPERTY_KEY_ALIASES) {
    return LEGACY_PROPERTY_KEY_ALIASES[key as LegacyPropertyVerificationKey];
  }

  return isPropertyVerificationKey(key) ? key : null;
};

const clampVerificationScore = (score: number) => {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(VERIFICATION_SCORE_MAX, Math.round(score)));
};

const normalizeCatalogText = (value?: string) => (value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const parsePositiveNumber = (value?: string | number) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const derivePropertyTypeLabel = (property: Pick<PropertySortLike, 'propertyType' | 'title'>) => {
  const explicitType = normalizeCatalogText(property.propertyType);

  if (explicitType.includes('house') || explicitType.includes('casa')) return 'casa';
  if (explicitType.includes('apartment') || explicitType.includes('depto') || explicitType.includes('depart')) return 'departamento';
  if (explicitType.includes('cabin') || explicitType.includes('caba')) return 'cabana';

  const title = normalizeCatalogText(property.title);

  if (title.includes('casa')) return 'casa';
  if (title.includes('duplex') || title.includes('chalet') || /(^|\s)ph($|\s)/.test(title)) return 'casa';
  if (title.includes('monoambiente')) return 'departamento';
  if (title.includes('depto') || title.includes('depart')) return 'departamento';
  if (title.includes('caba')) return 'cabana';

  return 'alojamiento';
};

const getSearchRelevanceScore = (property: PropertySortLike, searchQuery?: string) => {
  const normalizedQuery = normalizeCatalogText(searchQuery);

  if (!normalizedQuery) {
    return 0;
  }

  const normalizedLocation = normalizeCatalogText(property.location);
  const normalizedTitle = normalizeCatalogText(property.title);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  let score = 0;

  if (normalizedLocation === normalizedQuery) {
    score += 120;
  } else if (normalizedLocation.startsWith(normalizedQuery)) {
    score += 90;
  } else if (normalizedLocation.includes(normalizedQuery)) {
    score += 60;
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    score += 35;
  }

  if (queryTokens.length > 1) {
    const locationMatches = queryTokens.filter((token) => normalizedLocation.includes(token)).length;
    const titleMatches = queryTokens.filter((token) => normalizedTitle.includes(token)).length;

    score += (locationMatches * 10) + (titleMatches * 6);
  }

  return score;
};

const getGuestsRelevanceScore = (property: PropertySortLike, guests?: string | number) => {
  const requestedGuests = parsePositiveNumber(guests);
  const maxGuests = parsePositiveNumber(property.maxGuests);

  if (!requestedGuests || requestedGuests <= 1 || !maxGuests || maxGuests < requestedGuests) {
    return 0;
  }

  return Math.max(0, 40 - ((maxGuests - requestedGuests) * 6));
};

const getTypeRelevanceScore = (property: PropertySortLike, type?: string) => {
  const normalizedType = normalizeCatalogText(type);

  if (!normalizedType) {
    return 0;
  }

  const explicitType = normalizeCatalogText(property.propertyType);
  const derivedType = derivePropertyTypeLabel(property);
  const normalizedTitle = normalizeCatalogText(property.title);

  if (explicitType.includes(normalizedType) || derivedType.includes(normalizedType)) {
    return 45;
  }

  if (normalizedTitle.includes(normalizedType)) {
    return 20;
  }

  return 0;
};

const getPropertyRelevanceScore = (property: PropertySortLike, context?: PropertyCatalogSortContext) => {
  if (!context) {
    return 0;
  }

  return getSearchRelevanceScore(property, context.searchQuery)
    + getGuestsRelevanceScore(property, context.filters?.guests)
    + getTypeRelevanceScore(property, context.filters?.type);
};

const normalizePropertyVerificationItem = (item: PropertyVerificationItemInput, index: number): PropertyVerificationItem => {
  const normalizedStatus = normalizeVerificationStatus(item.status);
  const normalizedKey = normalizePropertyVerificationKey(typeof item.key === 'string' ? item.key : undefined);

  if (normalizedKey) {
    return buildPropertyVerificationItem({
      key: normalizedKey,
      complete: normalizedStatus === 'complete',
    });
  }

  return {
    key: item.key || `item-${index + 1}`,
    label: item.label || item.title || 'Verificación',
    description: item.description || '',
    status: normalizedStatus,
  };
};

const buildSummaryFromExplicitItems = (items: PropertyVerificationItemInput[]): PropertyVerificationSummary => {
  const normalizedItems = items.slice(0, VERIFICATION_SCORE_MAX).map(normalizePropertyVerificationItem);

  return {
    score: clampVerificationScore(normalizedItems.filter((item) => item.status === 'complete').length),
    maxScore: normalizedItems.length || VERIFICATION_SCORE_MAX,
    items: normalizedItems,
  };
};

const hasDerivedVerificationSignals = (property: PropertyVerificationLike) => (
  typeof property.identityValidated === 'boolean'
  || typeof property.locationVerified === 'boolean'
  || typeof property.materialVerified === 'boolean'
  || typeof property.videoValidated === 'boolean'
  || typeof property.hasPresencialVerification === 'boolean'
  || typeof property.completedBookingsCount === 'number'
  || typeof property.realReviewsCount === 'number'
  || typeof property.reviewsCount === 'number'
  || typeof property.completedBookingsCount === 'string'
  || typeof property.realReviewsCount === 'string'
  || typeof property.reviewsCount === 'string'
);

export const getPropertyVerificationSummary = (property: PropertyVerificationLike): PropertyVerificationSummary => {
  if (Array.isArray(property.verificationSummary?.items) && property.verificationSummary.items.length > 0) {
    return buildSummaryFromExplicitItems(property.verificationSummary.items);
  }

  if (Array.isArray(property.verificationItems) && property.verificationItems.length > 0) {
    return buildSummaryFromExplicitItems(property.verificationItems);
  }

  return buildPropertyVerificationSummary({
    identityValidated: property.identityValidated,
    locationVerified: property.locationVerified,
    materialVerified: property.materialVerified,
    videoValidated: property.videoValidated,
    hasPresencialVerification: property.hasPresencialVerification,
    onsiteVerifiedAt: property.onsiteVerifiedAt,
    completedBookingsCount: property.completedBookingsCount,
    realReviewsCount: property.realReviewsCount,
    reviewsCount: property.reviewsCount,
  });
};

export const getPropertyVerificationItems = (property: PropertyVerificationLike): PropertyVerificationItem[] => (
  getPropertyVerificationSummary(property).items
);

export const getPropertyVerificationScore = (property: PropertyVerificationLike) => (
  Array.isArray(property.verificationSummary?.items) && property.verificationSummary.items.length > 0
    ? getPropertyVerificationSummary(property).score
    : Array.isArray(property.verificationItems) && property.verificationItems.length > 0
      ? getPropertyVerificationSummary(property).score
      : typeof property.verificationScore === 'number' && !hasDerivedVerificationSignals(property)
        ? clampVerificationScore(property.verificationScore)
        : getPropertyVerificationSummary(property).score
);

export const meetsRealVerificationFilter = (property: PropertyVerificationLike) => (
  getPropertyVerificationScore(property) >= REAL_VERIFICATION_FILTER_MIN_SCORE
);

export const hasHighlightedVerificationLevel = (property: PropertyVerificationLike) => (
  getPropertyVerificationScore(property) >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE
);

export const getPropertyVerificationGuidanceLabel = (
  property: PropertyVerificationLike,
  options?: { isTopResult?: boolean },
) => {
  const score = getPropertyVerificationScore(property);

  if (score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE && options?.isTopResult) {
    return 'Más comprobado';
  }

  return null;
};

export const getPropertyVerificationGuidanceMessage = (property: PropertyVerificationLike) => {
  const score = getPropertyVerificationScore(property);

  if (score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE) {
    return 'Este aviso muestra más información validada que la mayoría.';
  }

  if (score >= REAL_VERIFICATION_FILTER_MIN_SCORE) {
    return 'Este aviso ya tiene varias comprobaciones visibles.';
  }

  return null;
};

export const withPropertyVerificationScore = <T extends PropertyVerificationLike>(property: T) => {
  const verificationSummary = getPropertyVerificationSummary(property);

  return {
    ...property,
    verificationSummary,
    verificationItems: verificationSummary.items,
    verificationScore: verificationSummary.score,
  };
};

export const getPropertyVerificationBadge = (property: PropertyVerificationLike) => {
  const verificationSummary = getPropertyVerificationSummary(property);
  const max = verificationSummary.maxScore || VERIFICATION_SCORE_MAX;
  const score = Array.isArray(property.verificationSummary?.items) && property.verificationSummary.items.length > 0
    ? Math.min(verificationSummary.score, max)
    : Array.isArray(property.verificationItems) && property.verificationItems.length > 0
      ? Math.min(verificationSummary.score, max)
      : typeof property.verificationScore === 'number' && !hasDerivedVerificationSignals(property)
        ? Math.min(clampVerificationScore(property.verificationScore), max)
        : Math.min(verificationSummary.score, max);
  const visual = `${'✔'.repeat(score)}${'○'.repeat(max - score)}`;
  const compactLabel = `${score} de ${max} comprobaciones completas`;

  return {
    score,
    max,
    label: compactLabel,
    summaryLabel: compactLabel,
    visual,
    spacedVisual: visual.split('').join(' '),
  };
};

export const getPropertyVerificationDetails = (property: PropertyVerificationLike) => {
  const verificationSummary = getPropertyVerificationSummary(property);
  const badge = getPropertyVerificationBadge({ ...property, verificationSummary });

  return {
    ...badge,
    items: verificationSummary.items,
    helperText: 'Mostramos qué está comprobado para que puedas decidir mejor.',
  };
};

export const sortPropertiesByCatalogOrder = <T extends PropertySortLike>(
  items: T[],
  sortBy: PropertyCatalogSort,
  context?: PropertyCatalogSortContext,
) => {
  const sortedItems = [...items];

  sortedItems.sort((left, right) => {
    const verificationDifference = getPropertyVerificationScore(right) - getPropertyVerificationScore(left);
    const ratingDifference = Number(right.rating || 0) - Number(left.rating || 0);
    const reviewsDifference = Number(right.reviewsCount || 0) - Number(left.reviewsCount || 0);
    const relevanceDifference = getPropertyRelevanceScore(right, context) - getPropertyRelevanceScore(left, context);
    const priceDifference = Number(left.price || 0) - Number(right.price || 0);

    if (sortBy === 'price') {
      if (verificationDifference !== 0) {
        return verificationDifference;
      }

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      if (reviewsDifference !== 0) {
        return reviewsDifference;
      }

      if (relevanceDifference !== 0) {
        return relevanceDifference;
      }

      if (priceDifference !== 0) {
        return priceDifference;
      }

      return String(left.title || '').localeCompare(String(right.title || ''), 'es');
    }

    if (sortBy === 'rating') {
      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      if (reviewsDifference !== 0) {
        return reviewsDifference;
      }

      if (verificationDifference !== 0) {
        return verificationDifference;
      }

      if (relevanceDifference !== 0) {
        return relevanceDifference;
      }

      if (priceDifference !== 0) {
        return priceDifference;
      }

      return String(left.title || '').localeCompare(String(right.title || ''), 'es');
    }

    if (verificationDifference !== 0) {
      return verificationDifference;
    }

    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    if (reviewsDifference !== 0) {
      return reviewsDifference;
    }

    if (relevanceDifference !== 0) {
      return relevanceDifference;
    }

    if (priceDifference !== 0) {
      return priceDifference;
    }

    return String(left.title || '').localeCompare(String(right.title || ''), 'es');
  });

  return sortedItems;
};