import type { PremiumVerificationOffer } from './premiumVerification';
import { getPropertyListingQualityScore } from './propertyListingQuality';
import {
  PROPERTY_VERIFICATION_KEYS,
  buildPropertyAdvancedVerificationItems,
  buildPropertyVerificationItem,
  buildPropertyVerificationProgress,
  buildPropertyVerificationSummary,
  type LegacyPropertyVerificationKey,
  type PropertyAdvancedVerificationItem,
  type PropertyVerificationItem,
  type PropertyVerificationKey,
  type PropertyVerificationProgress,
  type PropertyVerificationSummary,
} from './verificationModel';

export type {
  PropertyAdvancedVerificationItem,
  PropertyVerificationItem,
  PropertyVerificationKey,
  PropertyVerificationProgress,
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
  verificationProgress?: PropertyVerificationProgress | null;
  advancedVerificationItems?: PropertyAdvancedVerificationItem[];
  identityValidated?: boolean;
  title?: string | null;
  location?: string | null;
  description?: string | null;
  price?: number | string | null;
  maxGuests?: number | string | null;
  propertyType?: string | null;
  imageUrl?: string | null;
  images?: Array<string | null | undefined> | string | null;
  verificationPhotoCount?: number | string | null;
  verificationVideoCount?: number | string | null;
  verificationDocumentCount?: number | string | null;
  verificationDocumentsReviewedCount?: number | string | null;
  locationVerified?: boolean;
  materialVerified?: boolean;
  videoValidated?: boolean;
  propertyRelationshipVerified?: boolean;
  hasPresencialVerification?: boolean;
  onsiteVerifiedAt?: string | Date | null;
  documentationSubmitted?: boolean;
  documentationVerified?: boolean;
  manualReviewReady?: boolean;
  manualReviewCompleted?: boolean;
  availabilityValidated?: boolean;
  lat?: number | string | null;
  lng?: number | string | null;
  coordinates?: {
    lat?: number | string | null;
    lng?: number | string | null;
  } | null;
  isVerifiedProperty?: boolean;
  hasDigitalVerification?: boolean;
  hostPremiumDocumentaryVerified?: boolean;
  premiumVisibilityBoost?: number;
  premiumOnsiteOffer?: PremiumVerificationOffer | null;
};

type PropertySortLike = Omit<PropertyVerificationLike, 'title' | 'location' | 'description' | 'price' | 'maxGuests' | 'propertyType' | 'imageUrl' | 'images' | 'verificationPhotoCount' | 'verificationVideoCount' | 'verificationDocumentCount' | 'verificationDocumentsReviewedCount' | 'lat' | 'lng'> & {
  title?: string;
  location?: string;
  description?: string;
  rating?: number;
  reviewsCount?: number;
  price?: number;
  maxGuests?: number;
  propertyType?: string;
  imageUrl?: string | null;
  images?: Array<string | null | undefined> | null;
  verificationPhotoCount?: number;
  verificationVideoCount?: number;
  verificationDocumentCount?: number;
  verificationDocumentsReviewedCount?: number;
  lat?: number;
  lng?: number;
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

const LEGACY_PROPERTY_KEY_ALIASES: Partial<Record<LegacyPropertyVerificationKey, PropertyVerificationKey>> = {
  visual: 'photos',
  material: 'photos',
  video: 'photos',
};

const PROPERTY_VERIFICATION_LABEL_KEY_MAP: Record<string, PropertyVerificationKey> = {
  'anfitrion confirmado': 'identity',
  'ubicacion verificada': 'location',
  'geolocalizacion precisa': 'geolocation',
  'fotos / video reales': 'photos',
  'disponibilidad validada': 'availability',
};

const PROPERTY_VERIFICATION_SHORT_LABELS: Record<PropertyVerificationKey, string> = {
  identity: 'Anfitrión',
  location: 'Ubicación',
  geolocation: 'Geolocalización',
  photos: 'Fotos / video',
  availability: 'Disponibilidad',
};

const PROPERTY_VERIFICATION_COMPACT_PRIORITY: Record<PropertyVerificationKey, number> = {
  identity: 0,
  location: 1,
  availability: 2,
  photos: 3,
  geolocation: 4,
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

const normalizeCatalogText = (value?: string | null) => (value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const parsePositiveNumber = (value?: string | number | null) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const parseFiniteNumber = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
};

const normalizeVerificationImages = (value: PropertyVerificationLike['images']) => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  return typeof value === 'string' || value === null || value === undefined ? value : null;
};

const derivePropertyTypeLabel = (property: Pick<PropertySortLike, 'propertyType' | 'title'>) => {
  const explicitType = normalizeCatalogText(property.propertyType);

  if (explicitType.includes('house') || explicitType.includes('casa')) return 'casa';
  if (explicitType.includes('apartment') || explicitType.includes('depto') || explicitType.includes('depart')) return 'departamento';
  if (explicitType.includes('room') || explicitType.includes('habitacion') || explicitType.includes('habitación')) return 'habitacion';
  if (explicitType.includes('cabin') || explicitType.includes('caba')) return 'cabana';

  const title = normalizeCatalogText(property.title);

  if (title.includes('casa')) return 'casa';
  if (title.includes('duplex') || title.includes('chalet') || /(^|\s)ph($|\s)/.test(title)) return 'casa';
  if (title.includes('monoambiente')) return 'departamento';
  if (title.includes('depto') || title.includes('depart')) return 'departamento';
  if (title.includes('habitacion') || title.includes('habitación') || title.includes('cuarto')) return 'habitacion';
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

const hasLegacyVerificationItems = (items: PropertyVerificationItemInput[]) => items.some((item) => {
  const rawKey = typeof item.key === 'string' ? item.key : '';
  const normalizedLabel = typeof item.label === 'string'
    ? item.label.trim().toLowerCase()
    : typeof item.title === 'string'
      ? item.title.trim().toLowerCase()
      : '';

  return rawKey === 'data'
    || rawKey === 'price'
    || rawKey === 'basics'
    || rawKey === 'relationship'
    || rawKey === 'history'
    || rawKey === 'onsite'
    || normalizedLabel === 'datos'
    || normalizedLabel === 'precio';
});

const getExplicitPropertyVerificationKey = (item: PropertyVerificationItemInput) => {
  const normalizedKey = normalizePropertyVerificationKey(typeof item.key === 'string' ? item.key : undefined);

  if (normalizedKey) {
    return normalizedKey;
  }

  const normalizedLabel = normalizeCatalogText(
    typeof item.label === 'string'
      ? item.label
      : typeof item.title === 'string'
        ? item.title
        : '',
  );

  return PROPERTY_VERIFICATION_LABEL_KEY_MAP[normalizedLabel] ?? null;
};

const buildSummaryFromExplicitItems = (items: PropertyVerificationItemInput[]): PropertyVerificationSummary => {
  const completedItems = items.reduce<Record<PropertyVerificationKey, boolean>>((accumulator, item) => {
    const normalizedKey = getExplicitPropertyVerificationKey(item);

    if (!normalizedKey) {
      return accumulator;
    }

    if (normalizeVerificationStatus(item.status) === 'complete') {
      accumulator[normalizedKey] = true;
    }

    return accumulator;
  }, {
    identity: false,
    location: false,
    geolocation: false,
    photos: false,
    availability: false,
  });

  const normalizedItems = PROPERTY_VERIFICATION_KEYS.map((key) => buildPropertyVerificationItem({
    key,
    complete: completedItems[key],
  }));

  return {
    score: clampVerificationScore(normalizedItems.filter((item) => item.status === 'complete').length),
    maxScore: VERIFICATION_SCORE_MAX,
    items: normalizedItems,
  };
};

const hasDerivedVerificationSignals = (property: PropertyVerificationLike) => (
  typeof property.identityValidated === 'boolean'
  || typeof property.locationVerified === 'boolean'
  || typeof property.materialVerified === 'boolean'
  || typeof property.videoValidated === 'boolean'
  || typeof property.verificationPhotoCount === 'number'
  || typeof property.verificationVideoCount === 'number'
  || typeof property.verificationDocumentCount === 'number'
  || typeof property.hasPresencialVerification === 'boolean'
  || typeof property.documentationSubmitted === 'boolean'
  || typeof property.documentationVerified === 'boolean'
  || typeof property.manualReviewReady === 'boolean'
  || typeof property.manualReviewCompleted === 'boolean'
  || typeof property.availabilityValidated === 'boolean'
  || parseFiniteNumber(property.lat) !== null
  || parseFiniteNumber(property.lng) !== null
  || parseFiniteNumber(property.coordinates?.lat ?? null) !== null
  || parseFiniteNumber(property.coordinates?.lng ?? null) !== null
);

export const getPropertyVerificationSummary = (property: PropertyVerificationLike): PropertyVerificationSummary => {
  const normalizedImages = normalizeVerificationImages(property.images);
  const resolvedLat = parseFiniteNumber(property.lat) ?? parseFiniteNumber(property.coordinates?.lat ?? null);
  const resolvedLng = parseFiniteNumber(property.lng) ?? parseFiniteNumber(property.coordinates?.lng ?? null);

  if (Array.isArray(property.verificationSummary?.items) && property.verificationSummary.items.length > 0) {
    if (hasLegacyVerificationItems(property.verificationSummary.items) && hasDerivedVerificationSignals(property)) {
      return buildPropertyVerificationSummary({
        title: property.title,
        location: property.location,
        description: property.description,
        price: property.price,
        maxGuests: property.maxGuests,
        propertyType: property.propertyType,
        imageUrl: property.imageUrl,
        images: normalizedImages,
        verificationPhotoCount: property.verificationPhotoCount,
        verificationVideoCount: property.verificationVideoCount,
        verificationDocumentCount: property.verificationDocumentCount,
        verificationDocumentsReviewedCount: property.verificationDocumentsReviewedCount,
        identityValidated: property.identityValidated,
        locationVerified: property.locationVerified,
        materialVerified: property.materialVerified,
        videoValidated: property.videoValidated,
        hasPresencialVerification: property.hasPresencialVerification,
        onsiteVerifiedAt: property.onsiteVerifiedAt,
        documentationSubmitted: property.documentationSubmitted,
        documentationVerified: property.documentationVerified || property.hostPremiumDocumentaryVerified,
        manualReviewReady: property.manualReviewReady || Boolean(property.premiumOnsiteOffer),
        manualReviewCompleted: property.manualReviewCompleted || property.hasPresencialVerification,
        availabilityValidated: property.availabilityValidated,
        lat: resolvedLat,
        lng: resolvedLng,
      });
    }

    return buildSummaryFromExplicitItems(property.verificationSummary.items);
  }

  if (Array.isArray(property.verificationItems) && property.verificationItems.length > 0) {
    if (hasLegacyVerificationItems(property.verificationItems) && hasDerivedVerificationSignals(property)) {
      return buildPropertyVerificationSummary({
        title: property.title,
        location: property.location,
        description: property.description,
        price: property.price,
        maxGuests: property.maxGuests,
        propertyType: property.propertyType,
        imageUrl: property.imageUrl,
        images: normalizedImages,
        verificationPhotoCount: property.verificationPhotoCount,
        verificationVideoCount: property.verificationVideoCount,
        verificationDocumentCount: property.verificationDocumentCount,
        verificationDocumentsReviewedCount: property.verificationDocumentsReviewedCount,
        identityValidated: property.identityValidated,
        locationVerified: property.locationVerified,
        materialVerified: property.materialVerified,
        videoValidated: property.videoValidated,
        hasPresencialVerification: property.hasPresencialVerification,
        onsiteVerifiedAt: property.onsiteVerifiedAt,
        documentationSubmitted: property.documentationSubmitted,
        documentationVerified: property.documentationVerified || property.hostPremiumDocumentaryVerified,
        manualReviewReady: property.manualReviewReady || Boolean(property.premiumOnsiteOffer),
        manualReviewCompleted: property.manualReviewCompleted || property.hasPresencialVerification,
        availabilityValidated: property.availabilityValidated,
        lat: resolvedLat,
        lng: resolvedLng,
      });
    }

    return buildSummaryFromExplicitItems(property.verificationItems);
  }

  return buildPropertyVerificationSummary({
    title: property.title,
    location: property.location,
    description: property.description,
    price: property.price,
    maxGuests: property.maxGuests,
    propertyType: property.propertyType,
    imageUrl: property.imageUrl,
    images: normalizedImages,
    verificationPhotoCount: property.verificationPhotoCount,
    verificationVideoCount: property.verificationVideoCount,
    verificationDocumentCount: property.verificationDocumentCount,
    verificationDocumentsReviewedCount: property.verificationDocumentsReviewedCount,
    identityValidated: property.identityValidated,
    locationVerified: property.locationVerified,
    materialVerified: property.materialVerified,
    videoValidated: property.videoValidated,
    hasPresencialVerification: property.hasPresencialVerification,
    onsiteVerifiedAt: property.onsiteVerifiedAt,
    documentationSubmitted: property.documentationSubmitted,
    documentationVerified: property.documentationVerified || property.hostPremiumDocumentaryVerified,
    manualReviewReady: property.manualReviewReady || Boolean(property.premiumOnsiteOffer),
    manualReviewCompleted: property.manualReviewCompleted || property.hasPresencialVerification,
    availabilityValidated: property.availabilityValidated,
    lat: resolvedLat,
    lng: resolvedLng,
  });
};

export const getPropertyVerificationItems = (property: PropertyVerificationLike): PropertyVerificationItem[] => (
  getPropertyVerificationSummary(property).items
);

export const getPropertyAdvancedVerificationItems = (property: PropertyVerificationLike): PropertyAdvancedVerificationItem[] => {
  const normalizedImages = normalizeVerificationImages(property.images);

  if (Array.isArray(property.advancedVerificationItems) && property.advancedVerificationItems.length > 0) {
    return property.advancedVerificationItems;
  }

  return buildPropertyAdvancedVerificationItems({
    title: property.title,
    location: property.location,
    description: property.description,
    price: property.price,
    maxGuests: property.maxGuests,
    propertyType: property.propertyType,
    imageUrl: property.imageUrl,
    images: normalizedImages,
    verificationPhotoCount: property.verificationPhotoCount,
    verificationVideoCount: property.verificationVideoCount,
    verificationDocumentCount: property.verificationDocumentCount,
    verificationDocumentsReviewedCount: property.verificationDocumentsReviewedCount,
    identityValidated: property.identityValidated,
    locationVerified: property.locationVerified,
    materialVerified: property.materialVerified,
    videoValidated: property.videoValidated,
    hasPresencialVerification: property.hasPresencialVerification,
    onsiteVerifiedAt: property.onsiteVerifiedAt,
    documentationSubmitted: property.documentationSubmitted,
    documentationVerified: property.documentationVerified || property.hostPremiumDocumentaryVerified,
    manualReviewReady: property.manualReviewReady || Boolean(property.premiumOnsiteOffer),
    manualReviewCompleted: property.manualReviewCompleted || property.hasPresencialVerification,
    availabilityValidated: property.availabilityValidated,
    lat: parseFiniteNumber(property.lat) ?? parseFiniteNumber(property.coordinates?.lat ?? null),
    lng: parseFiniteNumber(property.lng) ?? parseFiniteNumber(property.coordinates?.lng ?? null),
  });
};

export const getPropertyVerificationProgress = (property: PropertyVerificationLike): PropertyVerificationProgress => {
  const normalizedImages = normalizeVerificationImages(property.images);

  if (property.verificationProgress?.level && property.verificationProgress.label && property.verificationProgress.summary && property.verificationProgress.nextStep) {
    return {
      ...property.verificationProgress,
      advancedChecks: Array.isArray(property.verificationProgress.advancedChecks) && property.verificationProgress.advancedChecks.length > 0
        ? property.verificationProgress.advancedChecks
        : getPropertyAdvancedVerificationItems(property),
    };
  }

  return buildPropertyVerificationProgress({
    title: property.title,
    location: property.location,
    description: property.description,
    price: property.price,
    maxGuests: property.maxGuests,
    propertyType: property.propertyType,
    imageUrl: property.imageUrl,
    images: normalizedImages,
    verificationPhotoCount: property.verificationPhotoCount,
    verificationVideoCount: property.verificationVideoCount,
    verificationDocumentCount: property.verificationDocumentCount,
    verificationDocumentsReviewedCount: property.verificationDocumentsReviewedCount,
    identityValidated: property.identityValidated,
    locationVerified: property.locationVerified,
    materialVerified: property.materialVerified,
    videoValidated: property.videoValidated,
    hasPresencialVerification: property.hasPresencialVerification,
    onsiteVerifiedAt: property.onsiteVerifiedAt,
    documentationSubmitted: property.documentationSubmitted,
    documentationVerified: property.documentationVerified || property.hostPremiumDocumentaryVerified,
    manualReviewReady: property.manualReviewReady || Boolean(property.premiumOnsiteOffer),
    manualReviewCompleted: property.manualReviewCompleted || property.hasPresencialVerification,
    availabilityValidated: property.availabilityValidated,
    lat: parseFiniteNumber(property.lat) ?? parseFiniteNumber(property.coordinates?.lat ?? null),
    lng: parseFiniteNumber(property.lng) ?? parseFiniteNumber(property.coordinates?.lng ?? null),
  });
};

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

const getPropertyVerificationState = (property: PropertyVerificationLike) => {
  const summary = getPropertyVerificationSummary(property);
  const statusByKey = summary.items.reduce<Record<PropertyVerificationKey, boolean>>((accumulator, item) => {
    const normalizedKey = normalizePropertyVerificationKey(typeof item.key === 'string' ? item.key : undefined);

    if (normalizedKey) {
      accumulator[normalizedKey] = item.status === 'complete';
    }

    return accumulator;
  }, {
    identity: false,
    location: false,
    geolocation: false,
    photos: false,
    availability: false,
  });

  return {
    score: getPropertyVerificationScore(property),
    statusByKey,
  };
};

const getPropertyValuePerGuest = (property: Pick<PropertySortLike, 'price' | 'maxGuests'>) => {
  const price = parsePositiveNumber(property.price);
  const maxGuests = parsePositiveNumber(property.maxGuests);

  if (!price || !maxGuests) {
    return null;
  }

  return price / maxGuests;
};

const compareNullableAscending = (left: number | null, right: number | null) => {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left - right;
};

const comparePropertiesByVerificationSignals = (left: PropertySortLike, right: PropertySortLike) => {
  const leftVerification = getPropertyVerificationState(left);
  const rightVerification = getPropertyVerificationState(right);
  const scoreDifference = rightVerification.score - leftVerification.score;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const locationDifference = Number(rightVerification.statusByKey.location) - Number(leftVerification.statusByKey.location);

  if (locationDifference !== 0) {
    return locationDifference;
  }

  const identityDifference = Number(rightVerification.statusByKey.identity) - Number(leftVerification.statusByKey.identity);

  if (identityDifference !== 0) {
    return identityDifference;
  }

  const availabilityDifference = Number(rightVerification.statusByKey.availability) - Number(leftVerification.statusByKey.availability);

  if (availabilityDifference !== 0) {
    return availabilityDifference;
  }

  return 0;
};

const comparePropertiesByVerificationCatalogOrder = (
  left: PropertySortLike,
  right: PropertySortLike,
  context?: PropertyCatalogSortContext,
) => {
  const verificationDifference = comparePropertiesByVerificationSignals(left, right);

  if (verificationDifference !== 0) {
    return verificationDifference;
  }

  const valuePerGuestDifference = compareNullableAscending(getPropertyValuePerGuest(left), getPropertyValuePerGuest(right));

  if (valuePerGuestDifference !== 0) {
    return valuePerGuestDifference;
  }

  const relevanceDifference = getPropertyRelevanceScore(right, context) - getPropertyRelevanceScore(left, context);

  if (relevanceDifference !== 0) {
    return relevanceDifference;
  }

  const qualityDifference = getPropertyListingQualityScore(right) - getPropertyListingQualityScore(left);

  if (qualityDifference !== 0) {
    return qualityDifference;
  }

  const ratingDifference = Number(right.rating || 0) - Number(left.rating || 0);

  if (ratingDifference !== 0) {
    return ratingDifference;
  }

  const reviewsDifference = Number(right.reviewsCount || 0) - Number(left.reviewsCount || 0);

  if (reviewsDifference !== 0) {
    return reviewsDifference;
  }

  const priceDifference = Number(left.price || 0) - Number(right.price || 0);

  if (priceDifference !== 0) {
    return priceDifference;
  }

  return String(left.title || '').localeCompare(String(right.title || ''), 'es');
};

export const getPropertyVerificationGuidanceLabel = (
  property: PropertyVerificationLike,
  options?: { isTopResult?: boolean },
) => {
  const score = getPropertyVerificationScore(property);

  if (score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE && options?.isTopResult) {
    return 'Más verificado';
  }

  return null;
};

export const getPropertyVerificationGuidanceMessage = (property: PropertyVerificationLike) => {
  const score = getPropertyVerificationScore(property);

  if (score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE) {
    return 'Este aviso muestra más comprobaciones reales que la mayoría.';
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
  const visual = `${'●'.repeat(score)}${'○'.repeat(max - score)}`;
  const compactLabel = `${score} de ${max} comprobaciones`;

  return {
    score,
    max,
    label: compactLabel,
    summaryLabel: compactLabel,
    compactLabel: `${score}/${max} verificado`,
    visual,
    spacedVisual: visual.split('').join(' '),
  };
};

export const getPropertyVerificationDetails = (property: PropertyVerificationLike) => {
  const verificationSummary = getPropertyVerificationSummary(property);
  const badge = getPropertyVerificationBadge({ ...property, verificationSummary });
  const compactItems = verificationSummary.items
    .filter((item) => item.status === 'complete')
    .sort((left, right) => {
      const leftKey = normalizePropertyVerificationKey(typeof left.key === 'string' ? left.key : undefined);
      const rightKey = normalizePropertyVerificationKey(typeof right.key === 'string' ? right.key : undefined);
      const leftPriority = leftKey ? PROPERTY_VERIFICATION_COMPACT_PRIORITY[leftKey] : Number.MAX_SAFE_INTEGER;
      const rightPriority = rightKey ? PROPERTY_VERIFICATION_COMPACT_PRIORITY[rightKey] : Number.MAX_SAFE_INTEGER;

      return leftPriority - rightPriority;
    })
    .map((item) => {
      const normalizedKey = normalizePropertyVerificationKey(typeof item.key === 'string' ? item.key : undefined);

      return {
        ...item,
        shortLabel: normalizedKey ? PROPERTY_VERIFICATION_SHORT_LABELS[normalizedKey] : item.label,
      };
    });

  return {
    ...badge,
    items: verificationSummary.items,
    compactItems,
    compactSummary: compactItems.slice(0, 3).map((item) => item.shortLabel).join(' · '),
    helperText: 'Ves las 5 comprobaciones reales, lo ya confirmado y lo que todavía falta validar.',
  };
};

export const sortPropertiesByCatalogOrder = <T extends PropertySortLike>(
  items: T[],
  sortBy: PropertyCatalogSort,
  context?: PropertyCatalogSortContext,
) => {
  const sortedItems = [...items];

  sortedItems.sort((left, right) => {
    const ratingDifference = Number(right.rating || 0) - Number(left.rating || 0);
    const reviewsDifference = Number(right.reviewsCount || 0) - Number(left.reviewsCount || 0);
    const priceDifference = Number(left.price || 0) - Number(right.price || 0);

    if (sortBy === 'price') {
      if (priceDifference !== 0) {
        return priceDifference;
      }

      return comparePropertiesByVerificationCatalogOrder(left, right, context);
    }

    if (sortBy === 'rating') {
      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      if (reviewsDifference !== 0) {
        return reviewsDifference;
      }

      return comparePropertiesByVerificationCatalogOrder(left, right, context);
    }

    return comparePropertiesByVerificationCatalogOrder(left, right, context);
  });

  return sortedItems;
};