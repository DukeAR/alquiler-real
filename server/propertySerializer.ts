import { buildHostTrust } from './hostTrust';
import { buildHostInteractionHistory } from './interactionHistory';
import { buildPropertyVerification } from './propertyVerification';

const PROPERTY_COORDINATE_FALLBACK = {
  lat: -36.3536,
  lng: -56.7196,
};

type PropertyQueryRow = Record<string, unknown> & {
  price?: unknown;
  rating?: unknown;
  reviewsCount?: unknown;
  lat?: unknown;
  lng?: unknown;
  images?: unknown;
  imageUrl?: unknown;
  image_url?: unknown;
  hostName?: unknown;
  hostSince?: unknown;
  hostMemberSince?: unknown;
  hostProfileName?: unknown;
  hostCompletedReservationsCount?: unknown;
  hostGuestReviewsCount?: unknown;
  hostGuestFeedbackCount?: unknown;
  hostGuestAgreementsKeptCount?: unknown;
  hostListingConsistentCount?: unknown;
  hostGuestWouldInteractAgainCount?: unknown;
  hostGuestIncidentsCount?: unknown;
  hostAverageResponseTimeMinutes?: unknown;
  identityValidated?: unknown;
  hostIdentityValidated?: unknown;
  hostIdentityVerified?: unknown;
  locationVerified?: unknown;
  materialVerified?: unknown;
  videoValidated?: unknown;
  hasPresencialVerification?: unknown;
  onsiteVerifiedAt?: unknown;
  hasDigitalVerification?: unknown;
  isVerifiedProperty?: unknown;
  is_verified_property?: unknown;
  beds?: unknown;
  propertyRelationshipVerified?: unknown;
  hostPremiumDocumentaryVerified?: unknown;
  verificationPhotoCount?: unknown;
  verificationVideoCount?: unknown;
  verificationDocumentCount?: unknown;
  verificationDocumentsReviewedCount?: unknown;
  documentationSubmitted?: unknown;
  documentationVerified?: unknown;
  manualReviewReady?: unknown;
  manualReviewCompleted?: unknown;
  premiumVisibilityBoost?: unknown;
};

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const toSafeNumber = (value: unknown, fallback = 0) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toSafeInteger = (value: unknown, fallback = 0) => Math.round(toSafeNumber(value, fallback));

const toBoolean = (value: unknown) => value === true || value === 1 || value === '1';

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(trimmedValue);
      return toStringArray(parsedValue);
    } catch {
      return [trimmedValue];
    }
  }

  return [];
};

const toDateString = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return undefined;
};

const getResolvedIdentityValidated = (row: PropertyQueryRow) => {
  const hasJoinedHostIdentity = hasOwn(row, 'hostIdentityValidated') || hasOwn(row, 'hostIdentityVerified');

  if (hasJoinedHostIdentity) {
    return toBoolean(row.hostIdentityValidated) || toBoolean(row.hostIdentityVerified);
  }

  return toBoolean(row.identityValidated);
};

const getResolvedHostSince = (row: PropertyQueryRow) => toDateString(row.hostSince) || toDateString(row.hostMemberSince);

export const mapPropertyRecord = (row: PropertyQueryRow) => {
  const {
    internalVisibilityPenalty: _internalVisibilityPenalty,
    internal_visibility_penalty: _internalVisibilityPenaltySnake,
    ...safeRow
  } = row as PropertyQueryRow & {
    internalVisibilityPenalty?: unknown;
    internal_visibility_penalty?: unknown;
  };

  const normalizedProperty = {
    ...safeRow,
    price: toSafeNumber(row.price),
    rating: toSafeNumber(row.rating),
    reviewsCount: toSafeInteger(row.reviewsCount),
    beds: hasOwn(row, 'beds') ? toSafeInteger(row.beds) : undefined,
    identityValidated: getResolvedIdentityValidated(row),
    locationVerified: toBoolean(row.locationVerified),
    materialVerified: toBoolean(row.materialVerified),
    videoValidated: toBoolean(row.videoValidated),
    propertyRelationshipVerified: toBoolean(row.propertyRelationshipVerified),
    hasPresencialVerification: toBoolean(row.hasPresencialVerification),
    onsiteVerifiedAt: toDateString(row.onsiteVerifiedAt),
    hasDigitalVerification: toBoolean(row.hasDigitalVerification),
    hostPremiumDocumentaryVerified: toBoolean(row.hostPremiumDocumentaryVerified),
    verificationPhotoCount: toSafeInteger(row.verificationPhotoCount),
    verificationVideoCount: toSafeInteger(row.verificationVideoCount),
    verificationDocumentCount: toSafeInteger(row.verificationDocumentCount),
    verificationDocumentsReviewedCount: toSafeInteger(row.verificationDocumentsReviewedCount),
    documentationSubmitted: toBoolean(row.documentationSubmitted) || toSafeInteger(row.verificationDocumentCount) > 0,
    documentationVerified: toBoolean(row.documentationVerified) || toSafeInteger(row.verificationDocumentsReviewedCount) > 0,
    manualReviewReady: toBoolean(row.manualReviewReady),
    manualReviewCompleted: toBoolean(row.manualReviewCompleted) || toBoolean(row.hasPresencialVerification),
    isVerifiedProperty: toBoolean(row.isVerifiedProperty) || toBoolean(row.is_verified_property),
    hostSince: getResolvedHostSince(row),
    hostCompletedReservationsCount: toSafeInteger(row.hostCompletedReservationsCount),
    hostGuestReviewsCount: toSafeInteger(row.hostGuestReviewsCount),
    hostGuestFeedbackCount: toSafeInteger(row.hostGuestFeedbackCount),
    hostGuestAgreementsKeptCount: toSafeInteger(row.hostGuestAgreementsKeptCount),
    hostListingConsistentCount: toSafeInteger(row.hostListingConsistentCount),
    hostGuestWouldInteractAgainCount: toSafeInteger(row.hostGuestWouldInteractAgainCount),
    hostGuestIncidentsCount: toSafeInteger(row.hostGuestIncidentsCount),
    hostAverageResponseTimeMinutes: toSafeInteger(row.hostAverageResponseTimeMinutes),
    hostName: typeof row.hostName === 'string' && row.hostName.trim().length > 0
      ? row.hostName
      : typeof row.hostProfileName === 'string' && row.hostProfileName.trim().length > 0
        ? row.hostProfileName
        : 'Anfitrión',
    imageUrl: typeof row.imageUrl === 'string' && row.imageUrl.trim().length > 0
      ? row.imageUrl
      : typeof row.image_url === 'string' && row.image_url.trim().length > 0
        ? row.image_url
        : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    images: (() => {
      const normalizedImages = toStringArray(row.images);

      return normalizedImages.length > 0 ? normalizedImages : undefined;
    })(),
    coordinates: {
      lat: toSafeNumber(row.lat, PROPERTY_COORDINATE_FALLBACK.lat),
      lng: toSafeNumber(row.lng, PROPERTY_COORDINATE_FALLBACK.lng),
    },
    lat: toSafeNumber(row.lat, PROPERTY_COORDINATE_FALLBACK.lat),
    lng: toSafeNumber(row.lng, PROPERTY_COORDINATE_FALLBACK.lng),
    premiumVisibilityBoost: toSafeNumber(row.premiumVisibilityBoost, 0),
  };

  return {
    ...normalizedProperty,
    ...buildPropertyVerification(normalizedProperty),
    ...buildHostTrust({
      identityValidated: normalizedProperty.identityValidated,
      hostCompletedReservationsCount: normalizedProperty.hostCompletedReservationsCount,
      hostGuestReviewsCount: normalizedProperty.hostGuestReviewsCount,
      hostSince: normalizedProperty.hostSince,
    }),
    hostInteractionHistory: buildHostInteractionHistory({
      completedReservationsCount: normalizedProperty.hostCompletedReservationsCount,
      feedbackCount: normalizedProperty.hostGuestFeedbackCount,
      agreementsKeptCount: normalizedProperty.hostGuestAgreementsKeptCount,
      listingConsistentCount: normalizedProperty.hostListingConsistentCount,
      wouldInteractAgainCount: normalizedProperty.hostGuestWouldInteractAgainCount,
      incidentsCount: normalizedProperty.hostGuestIncidentsCount,
      avgResponseTimeMinutes: normalizedProperty.hostAverageResponseTimeMinutes,
    }),
  };
};