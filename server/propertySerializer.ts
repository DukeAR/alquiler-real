import { buildHostTrust } from './hostTrust';
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
  imageUrl?: unknown;
  image_url?: unknown;
  hostName?: unknown;
  hostSince?: unknown;
  hostMemberSince?: unknown;
  hostProfileName?: unknown;
  hostCompletedReservationsCount?: unknown;
  hostGuestReviewsCount?: unknown;
  identityValidated?: unknown;
  hostIdentityValidated?: unknown;
  hostIdentityVerified?: unknown;
  locationVerified?: unknown;
  videoValidated?: unknown;
  hasPresencialVerification?: unknown;
  hasDigitalVerification?: unknown;
  isVerifiedProperty?: unknown;
  is_verified_property?: unknown;
  propertyRelationshipVerified?: unknown;
  hostPremiumDocumentaryVerified?: unknown;
  premiumVisibilityBoost?: unknown;
};

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

const toSafeNumber = (value: unknown, fallback = 0) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toSafeInteger = (value: unknown, fallback = 0) => Math.round(toSafeNumber(value, fallback));

const toBoolean = (value: unknown) => value === true || value === 1 || value === '1';

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
  const normalizedProperty = {
    ...row,
    price: toSafeNumber(row.price),
    rating: toSafeNumber(row.rating),
    reviewsCount: toSafeInteger(row.reviewsCount),
    identityValidated: getResolvedIdentityValidated(row),
    locationVerified: toBoolean(row.locationVerified),
    videoValidated: toBoolean(row.videoValidated),
    propertyRelationshipVerified: toBoolean(row.propertyRelationshipVerified),
    hasPresencialVerification: toBoolean(row.hasPresencialVerification),
    hasDigitalVerification: toBoolean(row.hasDigitalVerification),
    hostPremiumDocumentaryVerified: toBoolean(row.hostPremiumDocumentaryVerified),
    isVerifiedProperty: toBoolean(row.isVerifiedProperty) || toBoolean(row.is_verified_property),
    hostSince: getResolvedHostSince(row),
    hostCompletedReservationsCount: toSafeInteger(row.hostCompletedReservationsCount),
    hostGuestReviewsCount: toSafeInteger(row.hostGuestReviewsCount),
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
    coordinates: {
      lat: toSafeNumber(row.lat, PROPERTY_COORDINATE_FALLBACK.lat),
      lng: toSafeNumber(row.lng, PROPERTY_COORDINATE_FALLBACK.lng),
    },
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
  };
};