export const VERIFICATION_SCORE_MAX = 5;

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
};

type PropertySortLike = PropertyVerificationLike & {
  rating?: number;
  reviewsCount?: number;
  price?: number;
};

export type PropertyCatalogSort = 'verification' | 'rating' | 'price';

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
    return 'Mejor verificado';
  }

  if (score >= REAL_VERIFICATION_FILTER_MIN_SCORE) {
    return 'Alto nivel de verificación';
  }

  return null;
};

export const getPropertyVerificationGuidanceMessage = (property: PropertyVerificationLike) => {
  const score = getPropertyVerificationScore(property);

  if (score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE) {
    return 'Este aviso muestra más cosas comprobadas que la mayoría.';
  }

  if (score >= REAL_VERIFICATION_FILTER_MIN_SCORE) {
    return 'Este aviso ya tiene varias comprobaciones hechas.';
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
  const compactLabel = `${score} de ${max} comprobaciones`;

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
    helperText: 'Cuanto más completo esté este nivel, más claro es lo que podés evaluar antes de reservar.',
  };
};

export const sortPropertiesByCatalogOrder = <T extends PropertySortLike>(items: T[], sortBy: PropertyCatalogSort) => {
  const sortedItems = [...items];

  sortedItems.sort((left, right) => {
    const verificationDifference = getPropertyVerificationScore(right) - getPropertyVerificationScore(left);
    const ratingDifference = Number(right.rating || 0) - Number(left.rating || 0);
    const reviewsDifference = Number(right.reviewsCount || 0) - Number(left.reviewsCount || 0);
    const priceDifference = Number(left.price || 0) - Number(right.price || 0);

    if (sortBy === 'price') {
      if (priceDifference !== 0) {
        return priceDifference;
      }

      if (verificationDifference !== 0) {
        return verificationDifference;
      }

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      return reviewsDifference;
    }

    if (sortBy === 'rating') {
      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      if (verificationDifference !== 0) {
        return verificationDifference;
      }

      return reviewsDifference;
    }

    if (verificationDifference !== 0) {
      return verificationDifference;
    }

    if (ratingDifference !== 0) {
      return ratingDifference;
    }

    return reviewsDifference;
  });

  return sortedItems;
};
