export const VERIFICATION_SCORE_MAX = 5;

import { getPremiumVisibilityBoost, type PremiumVerificationOffer } from './premiumVerification';

export const REAL_VERIFICATION_FILTER_MIN_SCORE = 3;

export const HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE = 4;

export const TOP_VERIFIED_RESULTS_COUNT = 3;

export type PropertyVerificationStatus = 'complete' | 'pending';

export type PropertyVerificationKey = 'identity' | 'location' | 'visual' | 'relationship' | 'onsite';

export interface PropertyVerificationItem {
  key: PropertyVerificationKey | string;
  label: string;
  description: string;
  status: PropertyVerificationStatus;
}

type PropertyVerificationItemInput = Partial<PropertyVerificationItem> & {
  title?: string;
};

type PropertyVerificationLike = {
  verificationScore?: number;
  verificationItems?: PropertyVerificationItemInput[];
  identityValidated?: boolean;
  locationVerified?: boolean;
  videoValidated?: boolean;
  propertyRelationshipVerified?: boolean;
  isVerifiedProperty?: boolean;
  hasDigitalVerification?: boolean;
  hasPresencialVerification?: boolean;
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

const normalizeVerificationStatus = (status?: PropertyVerificationStatus) => status === 'complete' ? 'complete' : 'pending';

const derivePropertyVerificationItems = (property: PropertyVerificationLike): PropertyVerificationItem[] => [
  {
    key: 'identity',
    label: 'Identidad confirmada',
    description: property.identityValidated ? 'Sabés con quién estás hablando.' : 'Falta confirmar quién publica.',
    status: property.identityValidated ? 'complete' : 'pending',
  },
  {
    key: 'location',
    label: 'Ubicación verificada',
    description: property.locationVerified ? 'El lugar existe y está ubicado.' : 'Todavía falta comprobar la ubicación.',
    status: property.locationVerified ? 'complete' : 'pending',
  },
  {
    key: 'visual',
    label: 'Material real del lugar',
    description: property.videoValidated ? 'Podés ver mejor el estado real.' : 'Todavía falta material real del lugar.',
    status: property.videoValidated ? 'complete' : 'pending',
  },
  {
    key: 'relationship',
    label: 'Relación con la propiedad',
    description: property.propertyRelationshipVerified ? 'Está confirmado el vínculo con el lugar.' : 'Falta confirmar vínculo con el lugar.',
    status: property.propertyRelationshipVerified ? 'complete' : 'pending',
  },
  {
    key: 'onsite',
    label: 'Verificación presencial',
    description: property.hasPresencialVerification ? 'Ya hubo una revisión en el lugar.' : 'Todavía no hay revisión en el lugar.',
    status: property.hasPresencialVerification ? 'complete' : 'pending',
  },
];

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

export const getPropertyVerificationItems = (property: PropertyVerificationLike): PropertyVerificationItem[] => {
  if (Array.isArray(property.verificationItems) && property.verificationItems.length > 0) {
    return property.verificationItems.slice(0, VERIFICATION_SCORE_MAX).map((item, index) => ({
      key: item.key || `item-${index + 1}`,
      label: item.label || item.title || 'Verificación',
      description: item.description || '',
      status: normalizeVerificationStatus(item.status),
    }));
  }

  return derivePropertyVerificationItems(property);
};

export const getPropertyVerificationScore = (property: PropertyVerificationLike) => {
  if (Array.isArray(property.verificationItems) && property.verificationItems.length > 0) {
    return clampVerificationScore(getPropertyVerificationItems(property).filter((item) => item.status === 'complete').length);
  }

  if (typeof property.verificationScore === 'number') {
    return clampVerificationScore(property.verificationScore);
  }

  return clampVerificationScore(derivePropertyVerificationItems(property).filter((item) => item.status === 'complete').length);
};

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
  const verificationItems = getPropertyVerificationItems(property);

  return {
    ...property,
    verificationItems,
    verificationScore: getPropertyVerificationScore({ ...property, verificationItems }),
  };
};

export const getPropertyVerificationBadge = (property: PropertyVerificationLike) => {
  const verificationItems = getPropertyVerificationItems(property);
  const max = verificationItems.length || VERIFICATION_SCORE_MAX;
  const score = Math.min(getPropertyVerificationScore({ ...property, verificationItems }), max);
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
  const items = getPropertyVerificationItems(property);
  const badge = getPropertyVerificationBadge({ ...property, verificationItems: items });

  return {
    ...badge,
    items,
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
    const visibilityBoostDifference = getPremiumVisibilityBoost(right) - getPremiumVisibilityBoost(left);
    const ratingDifference = Number(right.rating || 0) - Number(left.rating || 0);
    const reviewsDifference = Number(right.reviewsCount || 0) - Number(left.reviewsCount || 0);
    const relevanceDifference = getPropertyRelevanceScore(right, context) - getPropertyRelevanceScore(left, context);
    const priceDifference = Number(left.price || 0) - Number(right.price || 0);

    if (sortBy === 'price') {
      if (verificationDifference !== 0) {
        return verificationDifference;
      }

      if (visibilityBoostDifference !== 0) {
        return visibilityBoostDifference;
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

      if (visibilityBoostDifference !== 0) {
        return visibilityBoostDifference;
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

    if (visibilityBoostDifference !== 0) {
      return visibilityBoostDifference;
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
