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
import { getVerificationCountLabel } from './verificationPresentation';

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
  'identidad del anfitrion validada': 'identity',
  'identidad del anfitrion validada en la plataforma': 'identity',
  'ubicacion confirmada': 'location',
  'ubicacion del aviso cargada': 'location',
  'punto exacto del aviso': 'geolocation',
  'respaldo visual del aviso': 'photos',
  'disponibilidad reciente': 'availability',
};

const PROPERTY_VERIFICATION_DISPLAY_LABELS: Record<PropertyVerificationKey, string> = {
  identity: 'Identidad del anfitrión validada en la plataforma',
  location: 'Ubicación del aviso cargada',
  geolocation: 'Punto exacto del aviso',
  photos: 'Respaldo visual del aviso',
  availability: 'Disponibilidad reciente',
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

export const getPropertyVerificationDisplayLabel = (key?: string) => {
  const normalizedKey = normalizePropertyVerificationKey(key);

  return normalizedKey ? PROPERTY_VERIFICATION_DISPLAY_LABELS[normalizedKey] : 'Verificación pendiente';
};

export const PRESENCIAL_VERIFICATION_LABEL = 'Verificado presencialmente';

export const PRESENCIAL_VERIFICATION_LEVEL_LABEL = 'Verificación presencial';

export const HOST_IDENTITY_VALIDATED_LABEL = 'Identidad del anfitrión validada';

const PROPERTY_CARD_IDENTITY_VALIDATED_LABEL = 'Identidad validada';

export const HOST_PUBLISHED_INFO_LABEL = 'Información publicada por el anfitrión';

export const PROPERTY_VERIFICATION_QUALITY_NOTE = 'No evaluamos estado ni calidad del inmueble.';

type PublicPropertyVerificationLevel = 'none' | 'presencial';

const getPropertyVerificationStateCopy = (level: PublicPropertyVerificationLevel) => {
  if (level === 'presencial') {
    return {
      title: PRESENCIAL_VERIFICATION_LEVEL_LABEL,
      compactLabel: PRESENCIAL_VERIFICATION_LABEL,
      description: 'Confirmamos identidad, acceso, vínculo y ubicación durante una visita presencial.',
      countLabel: null,
      summaryLabel: PRESENCIAL_VERIFICATION_LEVEL_LABEL,
      levelLabel: PRESENCIAL_VERIFICATION_LEVEL_LABEL,
      isFullyVerified: true,
      hasPresencialVerificationSeal: true,
      isCoordinationReady: true,
    };
  }

  return {
    title: HOST_PUBLISHED_INFO_LABEL,
    compactLabel: HOST_PUBLISHED_INFO_LABEL,
    description: 'La información visible de este aviso fue publicada por el anfitrión.',
    countLabel: HOST_PUBLISHED_INFO_LABEL,
    summaryLabel: HOST_PUBLISHED_INFO_LABEL,
    levelLabel: HOST_PUBLISHED_INFO_LABEL,
    isFullyVerified: false,
    hasPresencialVerificationSeal: false,
    isCoordinationReady: false,
  };
};

const getPropertyVerificationDisplayItems = (items: PropertyVerificationItem[]) => {
  const itemByKey = new Map<PropertyVerificationKey, PropertyVerificationItem>();

  items.forEach((item) => {
    const normalizedKey = normalizePropertyVerificationKey(typeof item.key === 'string' ? item.key : undefined);

    if (!normalizedKey || itemByKey.has(normalizedKey)) {
      return;
    }

    itemByKey.set(normalizedKey, item);
  });

  return PROPERTY_VERIFICATION_KEYS.map((key) => {
    const sourceItem = itemByKey.get(key) || buildPropertyVerificationItem({ key, complete: false });

    return {
      ...sourceItem,
      key,
      label: PROPERTY_VERIFICATION_DISPLAY_LABELS[key],
    };
  });
};

type PublicPropertyVerificationDetailKey = 'hostIdentityValidated' | 'realPropertyAccess' | 'relationshipProof' | 'locationConfirmed';

type PublicPropertyVerificationDetailItem = {
  key: PublicPropertyVerificationDetailKey;
  label: string;
  detailLabel: string;
  shortLabel: string;
  status: 'complete' | 'pending';
  description: string;
};

const buildPublicPropertyVerificationDetailItems = (
  property: PropertyVerificationLike,
): PublicPropertyVerificationDetailItem[] => {
  const hasPresencialVerification = Boolean(property.hasPresencialVerification || property.onsiteVerifiedAt);

  if (hasPresencialVerification) {
    return [
      {
        key: 'hostIdentityValidated',
        label: 'Identidad del anfitrión verificada',
        detailLabel: 'Identidad del anfitrión verificada',
        shortLabel: 'Identidad',
        status: 'complete',
        description: 'Durante la visita confirmamos la identidad del anfitrión asociada al aviso.',
      },
      {
        key: 'realPropertyAccess',
        label: 'Acceso real a la propiedad confirmado',
        detailLabel: 'Acceso real a la propiedad confirmado',
        shortLabel: 'Acceso real',
        status: 'complete',
        description: 'La visita confirmó que existe acceso real a la propiedad publicada.',
      },
      {
        key: 'relationshipProof',
        label: 'Vínculo comprobable con el lugar',
        detailLabel: 'Vínculo comprobable con el lugar',
        shortLabel: 'Vínculo',
        status: 'complete',
        description: 'La visita dejó respaldo comprobable del vínculo entre el anfitrión y el lugar.',
      },
      {
        key: 'locationConfirmed',
        label: 'Ubicación validada durante visita',
        detailLabel: 'Ubicación validada durante visita',
        shortLabel: 'Ubicación',
        status: 'complete',
        description: 'La ubicación quedó validada durante la visita presencial al lugar.',
      },
    ];
  }

  return [];
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

const hasExplicitIdentityVerification = (items?: PropertyVerificationItemInput[] | null) => {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some((item) => (
    getExplicitPropertyVerificationKey(item) === 'identity'
    && normalizeVerificationStatus(item.status) === 'complete'
  ));
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
  hasPropertyPresencialVerificationSeal(property)
);

export const hasHighlightedVerificationLevel = (property: PropertyVerificationLike) => (
  getPropertyVerificationPresentationState(property).score >= HIGH_VERIFICATION_HIGHLIGHT_MIN_SCORE
);

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
  const leftVerification = getPropertyVerificationPresentationState(left);
  const rightVerification = getPropertyVerificationPresentationState(right);
  const onsiteDifference = Number(rightVerification.isFullyVerified) - Number(leftVerification.isFullyVerified);

  if (onsiteDifference !== 0) {
    return onsiteDifference;
  }

  const scoreDifference = rightVerification.score - leftVerification.score;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const rankingScoreDifference = rightVerification.rankingScore - leftVerification.rankingScore;

  if (rankingScoreDifference !== 0) {
    return rankingScoreDifference;
  }

  const locationDifference = Number(rightVerification.verificationChecks.locationVerified) - Number(leftVerification.verificationChecks.locationVerified);

  if (locationDifference !== 0) {
    return locationDifference;
  }

  const identityDifference = Number(rightVerification.verificationChecks.hostConfirmed) - Number(leftVerification.verificationChecks.hostConfirmed);

  if (identityDifference !== 0) {
    return identityDifference;
  }

  const availabilityDifference = Number(rightVerification.verificationChecks.availabilityValidated) - Number(leftVerification.verificationChecks.availabilityValidated);

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
  const verificationState = getPropertyVerificationPresentationState(property);

  if (verificationState.isFullyVerified) {
    return PRESENCIAL_VERIFICATION_LABEL;
  }

  return null;
};

export const getPropertyVerificationGuidanceMessage = (property: PropertyVerificationLike) => {
  const verificationState = getPropertyVerificationPresentationState(property);

  if (verificationState.isFullyVerified) {
    return 'Este aviso tiene verificación presencial.';
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
  const verificationState = getPropertyVerificationPresentationState(property);

  return {
    score: verificationState.score,
    max: verificationState.max,
    label: verificationState.label,
    summaryLabel: verificationState.summaryLabel,
    compactLabel: verificationState.compactLabel,
    countLabel: verificationState.badgeCountLabel,
    levelLabel: verificationState.levelLabel,
    description: verificationState.description,
    isFullyVerified: verificationState.isFullyVerified,
    isCoordinationReady: verificationState.isCoordinationReady,
  };
};

export const getPropertyVerificationDetails = (property: PropertyVerificationLike) => {
  const verificationState = getPropertyVerificationPresentationState(property);
  const displayItems = verificationState.checks.map((item) => ({
    key: item.key,
    label: item.label,
    detailLabel: item.label,
    shortLabel: item.label,
    status: 'complete' as const,
    description: item.description,
  }));
  const displayStateCopy = getPropertyVerificationStateCopy(verificationState.publicLevel);

  return {
    publicLevel: verificationState.publicLevel,
    score: verificationState.score,
    max: VERIFICATION_SCORE_MAX - 1,
    label: displayStateCopy.levelLabel,
    summaryLabel: displayStateCopy.summaryLabel,
    compactLabel: displayStateCopy.compactLabel,
    countLabel: displayStateCopy.countLabel,
    levelLabel: displayStateCopy.levelLabel,
    description: displayStateCopy.description,
    isFullyVerified: displayStateCopy.isFullyVerified,
    isCoordinationReady: displayStateCopy.isCoordinationReady,
    items: displayItems,
    detailItems: displayItems,
    compactItems: displayItems,
    compactSummary: displayItems.slice(0, 4).map((item) => item.shortLabel).join(' · '),
    previewMode: displayStateCopy.isFullyVerified ? 'premium' : 'standard',
    premiumTitle: PRESENCIAL_VERIFICATION_LEVEL_LABEL,
    premiumDescription: 'La visita confirma identidad, acceso real, vínculo comprobable y ubicación del lugar.',
    premiumSupportingText: PROPERTY_VERIFICATION_QUALITY_NOTE,
    helperText: PROPERTY_VERIFICATION_QUALITY_NOTE,
  };
};

type PropertyCardVerificationCheckKey = 'hostConfirmed' | 'locationVerified' | 'geolocationPrecise' | 'realMedia' | 'availabilityValidated';

export type PropertyCardVerificationCheck = {
  key: string;
  label: string;
  description: string;
  complete: boolean;
};

export type PropertyCardVerificationState = {
  model: 'premium' | 'standard';
  presencialVerified: boolean;
  publicLevel: 'none' | 'identity' | 'presencial';
  verificationChecks: Record<PropertyCardVerificationCheckKey, boolean>;
  count: number;
  checks: PropertyCardVerificationCheck[];
  badgeText: string | null;
  summaryTitle: string;
  summaryDescription: string | null;
  countLabel: string | null;
};

type PropertyVerificationPresentationState = PropertyCardVerificationState & {
  verificationSummary: PropertyVerificationSummary;
  rankingScore: number;
  score: number;
  max: number;
  label: string;
  summaryLabel: string;
  compactLabel: string;
  levelLabel: string;
  badgeCountLabel: string | null;
  description: string;
  isFullyVerified: boolean;
  isCoordinationReady: boolean;
};

const buildPropertyCardVerificationChecks = (checks: PropertyCardVerificationCheck[]) => checks.reduce<Record<PropertyCardVerificationCheckKey, boolean>>((accumulator, check) => {
  if (check.key === 'identity') {
    accumulator.hostConfirmed = check.complete;
    return accumulator;
  }

  if (check.key === 'location') {
    accumulator.locationVerified = check.complete;
    return accumulator;
  }

  if (check.key === 'geolocation') {
    accumulator.geolocationPrecise = check.complete;
    return accumulator;
  }

  if (check.key === 'photos') {
    accumulator.realMedia = check.complete;
    return accumulator;
  }

  accumulator.availabilityValidated = check.complete;
  return accumulator;
}, {
  hostConfirmed: false,
  locationVerified: false,
  geolocationPrecise: false,
  realMedia: false,
  availabilityValidated: false,
});

const getPropertyVerificationPresentationState = (property: PropertyVerificationLike): PropertyVerificationPresentationState => {
  const verificationSummary = getPropertyVerificationSummary(property);
  const fallbackScore = getPropertyVerificationScore(property);
  const hasStructuredVerificationData = (
    (Array.isArray(property.verificationSummary?.items) && property.verificationSummary.items.length > 0)
    || (Array.isArray(property.verificationItems) && property.verificationItems.length > 0)
    || hasDerivedVerificationSignals(property)
  );
  const checksFromSummary = getPropertyVerificationDisplayItems(verificationSummary.items)
    .map<PropertyCardVerificationCheck | null>((item) => {
      const normalizedKey = normalizePropertyVerificationKey(typeof item.key === 'string' ? item.key : undefined);

      if (!normalizedKey) {
        return null;
      }

      return {
        key: normalizedKey,
        label: PROPERTY_VERIFICATION_DISPLAY_LABELS[normalizedKey],
        complete: item.status === 'complete',
      };
    })
    .filter((item): item is PropertyCardVerificationCheck => item !== null);
  const checks = !hasStructuredVerificationData && fallbackScore > 0
    ? checksFromSummary.map((check, index) => ({
      ...check,
      complete: index < fallbackScore,
    }))
    : checksFromSummary;
  const rankingScore = checks.filter((check) => check.complete).length;
  const publicItems = buildPublicPropertyVerificationDetailItems(property);
  const publicLevel: PublicPropertyVerificationLevel = publicItems.length === 0
    ? 'none'
    : 'presencial';
  const publicChecks = publicItems.map<PropertyCardVerificationCheck>((item) => ({
    key: item.key,
    label: item.label,
    description: item.description,
    complete: true,
  }));
  const count = publicChecks.length;
  const isFullyVerified = publicLevel === 'presencial';
  const stateCopy = getPropertyVerificationStateCopy(publicLevel);

  return {
    verificationSummary,
    publicLevel,
    rankingScore,
    score: count,
    max: VERIFICATION_SCORE_MAX - 1,
    model: isFullyVerified ? 'premium' : 'standard',
    presencialVerified: isFullyVerified,
    verificationChecks: buildPropertyCardVerificationChecks(checks),
    count,
    checks: publicChecks,
    badgeText: isFullyVerified ? PRESENCIAL_VERIFICATION_LABEL : null,
    summaryTitle: stateCopy.levelLabel,
    summaryDescription: publicLevel === 'none' ? null : stateCopy.description,
    countLabel: isFullyVerified ? null : stateCopy.countLabel,
    label: stateCopy.levelLabel,
    summaryLabel: stateCopy.summaryLabel,
    compactLabel: stateCopy.compactLabel,
    levelLabel: stateCopy.levelLabel,
    badgeCountLabel: stateCopy.countLabel,
    description: stateCopy.description,
    isFullyVerified: stateCopy.isFullyVerified,
    isCoordinationReady: stateCopy.isCoordinationReady,
  };
};

export const hasPropertyPresencialVerificationSeal = (property: PropertyVerificationLike) => (
  getPropertyVerificationPresentationState(property).isFullyVerified
);

export const getPropertyCardVerificationState = (property: PropertyVerificationLike): PropertyCardVerificationState => {
  const verificationState = getPropertyVerificationPresentationState(property);
  const hasPresencialVerification = verificationState.presencialVerified;
  const hasIdentityValidation = !hasPresencialVerification && (
    property.identityValidated === true
    || hasExplicitIdentityVerification(property.verificationSummary?.items)
    || hasExplicitIdentityVerification(property.verificationItems)
  );

  if (hasPresencialVerification) {
    return {
      model: 'premium',
      presencialVerified: true,
      publicLevel: 'presencial',
      verificationChecks: verificationState.verificationChecks,
      count: 4,
      checks: verificationState.checks,
      badgeText: PRESENCIAL_VERIFICATION_LABEL,
      summaryTitle: PRESENCIAL_VERIFICATION_LABEL,
      summaryDescription: 'Identidad, ubicación y acceso confirmados',
      countLabel: null,
    };
  }

  if (hasIdentityValidation) {
    return {
      model: 'standard',
      presencialVerified: false,
      publicLevel: 'identity',
      verificationChecks: verificationState.verificationChecks,
      count: 1,
      checks: [
        {
          key: 'identity',
          label: HOST_IDENTITY_VALIDATED_LABEL,
          description: 'Validamos la identidad del anfitrión antes de mostrar esta señal.',
          complete: true,
        },
      ],
      badgeText: null,
      summaryTitle: PROPERTY_CARD_IDENTITY_VALIDATED_LABEL,
      summaryDescription: null,
      countLabel: PROPERTY_CARD_IDENTITY_VALIDATED_LABEL,
    };
  }

  return {
    model: 'standard',
    presencialVerified: false,
    publicLevel: 'none',
    verificationChecks: verificationState.verificationChecks,
    count: 0,
    checks: [],
    badgeText: null,
    summaryTitle: HOST_PUBLISHED_INFO_LABEL,
    summaryDescription: 'La información visible de este aviso fue publicada por el anfitrión.',
    countLabel: HOST_PUBLISHED_INFO_LABEL,
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