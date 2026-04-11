type PropertyListingQualityLike = {
  imageUrl?: string | null;
  images?: Array<string | null | undefined> | null;
  description?: string | null;
  location?: string | null;
};

const DETAIL_LOCATION_PATTERN = /[·,]|\b(entre|altura|barrio|zona|costanera|playa|centro|norte|sur|referencia)\b/i;

const normalizeText = (value?: string | null) => (value ?? '').trim();

const normalizePhotoUrls = (property: PropertyListingQualityLike) => {
  const uniqueUrls = new Set<string>();

  const pushUrl = (candidate?: string | null) => {
    const normalized = normalizeText(candidate);

    if (!normalized) {
      return;
    }

    uniqueUrls.add(normalized);
  };

  if (Array.isArray(property.images)) {
    property.images.forEach((image) => pushUrl(image));
  }

  pushUrl(property.imageUrl);

  return [...uniqueUrls];
};

const getPhotoScore = (property: PropertyListingQualityLike) => {
  const photoCount = normalizePhotoUrls(property).length;

  if (photoCount >= 6) return 50;
  if (photoCount >= 4) return 40;
  if (photoCount === 3) return 30;
  if (photoCount === 2) return 20;
  if (photoCount === 1) return 12;
  return 0;
};

const getDescriptionScore = (property: PropertyListingQualityLike) => {
  const descriptionLength = normalizeText(property.description).length;

  if (descriptionLength >= 220) return 30;
  if (descriptionLength >= 140) return 24;
  if (descriptionLength >= 80) return 18;
  if (descriptionLength >= 40) return 10;
  return 0;
};

const getLocationScore = (property: PropertyListingQualityLike) => {
  const location = normalizeText(property.location);

  if (!location) {
    return 0;
  }

  if (DETAIL_LOCATION_PATTERN.test(location)) {
    return 20;
  }

  return location.length >= 10 ? 10 : 6;
};

export const getPropertyListingQualityScore = (property: PropertyListingQualityLike) => (
  getPhotoScore(property)
  + getDescriptionScore(property)
  + getLocationScore(property)
);
