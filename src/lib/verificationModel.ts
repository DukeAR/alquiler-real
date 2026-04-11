export type VerificationItemStatus = 'complete' | 'pending';

export interface VerificationItem<K extends string = string> {
  key: K;
  label: string;
  status: VerificationItemStatus;
  description: string;
}

export interface VerificationSummary<K extends string = string> {
  score: number;
  maxScore: number;
  items: Array<VerificationItem<K>>;
}

export const PROPERTY_VERIFICATION_KEYS = ['basics', 'location', 'photos', 'video', 'identity'] as const;

export const PROPERTY_ADVANCED_CHECK_KEYS = ['documents', 'manualReview'] as const;

export type PropertyVerificationKey = typeof PROPERTY_VERIFICATION_KEYS[number];

export type PropertyAdvancedVerificationKey = typeof PROPERTY_ADVANCED_CHECK_KEYS[number];

export type LegacyPropertyVerificationKey = 'visual' | 'relationship' | 'material' | 'onsite' | 'history';

export type PropertyVerificationItem = VerificationItem<PropertyVerificationKey | LegacyPropertyVerificationKey | string>;

export type PropertyVerificationSummary = VerificationSummary<PropertyVerificationKey | string>;

export type PropertyAdvancedVerificationItem = VerificationItem<PropertyAdvancedVerificationKey>;

export type PropertyVerificationProgressLevel = 'base' | 'medium' | 'high';

export type PropertyVerificationProgress = {
  level: PropertyVerificationProgressLevel;
  label: string;
  summary: string;
  nextStep: string;
  advancedChecks: PropertyAdvancedVerificationItem[];
};

export type PropertyVerificationSummaryInput = {
  title?: string | null;
  location?: string | null;
  description?: string | null;
  price?: number | string | null;
  maxGuests?: number | string | null;
  propertyType?: string | null;
  imageUrl?: string | null;
  images?: string[] | string | null;
  verificationPhotoCount?: number | string | null;
  verificationVideoCount?: number | string | null;
  verificationDocumentCount?: number | string | null;
  verificationDocumentsReviewedCount?: number | string | null;
  identityValidated?: boolean | number | string | null;
  locationVerified?: boolean | number | string | null;
  materialVerified?: boolean | number | string | null;
  videoValidated?: boolean | number | string | null;
  hasPresencialVerification?: boolean | number | string | null;
  onsiteVerifiedAt?: string | Date | null;
  documentationSubmitted?: boolean | number | string | null;
  documentationVerified?: boolean | number | string | null;
  manualReviewReady?: boolean | number | string | null;
  manualReviewCompleted?: boolean | number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
};

export type IdentityVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type UserVerificationKey = 'email' | 'phone' | 'identity';

export type UserVerificationSummary = VerificationSummary<UserVerificationKey>;

export interface UserIdentityVerification {
  status: IdentityVerificationStatus;
  provider: string | null;
  verifiedAt: string | null;
}

export type UserVerificationSummaryInput = {
  emailVerified?: boolean | number | string | null;
  phoneVerified?: boolean | number | string | null;
  documentaryVerified?: boolean | number | string | null;
  identityVerificationStatus?: string | null;
  identityVerificationProvider?: string | null;
  identityVerifiedAt?: string | Date | null;
};

const isTruthyFlag = (value: unknown) => value === true || value === 1 || value === '1';

const toSafeInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsedValue = JSON.parse(value);
      return toStringArray(parsedValue);
    } catch {
      return [value.trim()];
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

  return null;
};

const formatIsoDateLabel = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
};

const formatProviderLabel = (provider: string | null) => {
  if (!provider) {
    return null;
  }

  const normalizedProvider = provider.trim().toLowerCase();

  if (!normalizedProvider) {
    return null;
  }

  if (normalizedProvider === 'documentary') return 'revisión documental';
  if (normalizedProvider === 'manual_review') return 'revisión manual';
  if (normalizedProvider === 'legacy') return 'validación previa';

  return normalizedProvider.replace(/_/g, ' ');
};
const hasListingCoordinates = (input: Pick<PropertyVerificationSummaryInput, 'lat' | 'lng'>) => (
  toSafeNumber(input.lat) !== null && toSafeNumber(input.lng) !== null
);

const resolvePublishedPhotoCount = (input: Pick<PropertyVerificationSummaryInput, 'images' | 'imageUrl'>) => {
  const galleryImages = toStringArray(input.images);

  if (galleryImages.length > 0) {
    return galleryImages.length;
  }

  return hasText(input.imageUrl) ? 1 : 0;
};

const isPropertyBasicsComplete = (input: PropertyVerificationSummaryInput) => (
  hasText(input.title)
  && hasText(input.description)
  && hasText(input.location)
  && hasText(input.propertyType)
  && toSafeNumber(input.price) !== null
  && (toSafeNumber(input.price) ?? 0) > 0
  && toSafeInteger(input.maxGuests) > 0
);

const isLocationVisible = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.locationVerified) || (hasText(input.location) && hasListingCoordinates(input))
);

const isRealPhotoCheckComplete = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.materialVerified) || toSafeInteger(input.verificationPhotoCount) >= 4
);

const isVideoCheckComplete = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.videoValidated) || toSafeInteger(input.verificationVideoCount) > 0
);

const isIdentityCheckComplete = (input: PropertyVerificationSummaryInput) => isTruthyFlag(input.identityValidated);

const isDocumentationAdvancedReady = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.documentationVerified)
  || isTruthyFlag(input.documentationSubmitted)
  || toSafeInteger(input.verificationDocumentCount) > 0
);

const isManualReviewAdvancedReady = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.manualReviewCompleted)
  || isTruthyFlag(input.manualReviewReady)
  || isTruthyFlag(input.hasPresencialVerification)
);

export const buildVerificationSummary = <K extends string>(items: Array<VerificationItem<K>>): VerificationSummary<K> => ({
  score: items.filter((item) => item.status === 'complete').length,
  maxScore: items.length,
  items,
});

export const buildPropertyVerificationItem = (input: {
  key: PropertyVerificationKey;
  complete: boolean;
  onsiteVerifiedAt?: string | Date | null;
}): VerificationItem<PropertyVerificationKey> => {
  const status: VerificationItemStatus = input.complete ? 'complete' : 'pending';
  const onsiteVerifiedAt = formatIsoDateLabel(toDateString(input.onsiteVerifiedAt));

  if (input.key === 'basics') {
    return {
      key: 'basics',
      label: 'Datos básicos',
      status,
      description: input.complete
        ? 'El aviso ya tiene fotos, capacidad, precio y descripción para mostrarse con claridad.'
        : 'Todavía faltan datos básicos para que el aviso se entienda mejor.',
    };
  }

  if (input.key === 'location') {
    return {
      key: 'location',
      label: 'Ubicación',
      status,
      description: input.complete
        ? 'La zona del lugar ya está cargada y se puede ubicar dentro del mapa.'
        : 'Todavía falta dejar más clara la ubicación aproximada del lugar.',
    };
  }

  if (input.key === 'photos') {
    return {
      key: 'photos',
      label: 'Fotos reales',
      status,
      description: input.complete
        ? 'El aviso ya suma fotos reales cargadas como respaldo visual del lugar.'
        : 'Todavía faltan fotos reales cargadas como respaldo visual del lugar.',
    };
  }

  if (input.key === 'video') {
    return {
      key: 'video',
      label: 'Video del lugar',
      status,
      description: input.complete
        ? onsiteVerifiedAt
          ? `El video del lugar ya quedó cargado y se actualizó el ${onsiteVerifiedAt}.`
          : 'El aviso ya muestra un video del lugar como respaldo fuerte.'
        : 'Todavía no hay un video del lugar cargado como respaldo fuerte.',
    };
  }

  return {
    key: 'identity',
    label: 'Identidad validada',
    status,
    description: input.complete
      ? 'La identidad del anfitrión ya quedó validada.'
      : 'Todavía falta validar la identidad del anfitrión para sumar más confianza.',
  };
};

export const buildPropertyVerificationSummary = (
  input: PropertyVerificationSummaryInput,
): PropertyVerificationSummary => {
  return buildVerificationSummary<PropertyVerificationKey>([
    buildPropertyVerificationItem({ key: 'basics', complete: isPropertyBasicsComplete(input) }),
    buildPropertyVerificationItem({ key: 'location', complete: isLocationVisible(input) }),
    buildPropertyVerificationItem({ key: 'photos', complete: isRealPhotoCheckComplete(input) }),
    buildPropertyVerificationItem({
      key: 'video',
      complete: isVideoCheckComplete(input),
      onsiteVerifiedAt: input.onsiteVerifiedAt,
    }),
    buildPropertyVerificationItem({ key: 'identity', complete: isIdentityCheckComplete(input) }),
  ]);
};

export const buildPropertyAdvancedVerificationItems = (
  input: PropertyVerificationSummaryInput,
): PropertyAdvancedVerificationItem[] => ([
  {
    key: 'documents',
    label: 'Documentación avanzada',
    status: isDocumentationAdvancedReady(input) ? 'complete' : 'pending',
    description: isDocumentationAdvancedReady(input)
      ? 'Ya hay documentación privada cargada como respaldo interno para moderación.'
      : 'Podés sumar DNI, comprobantes u otros archivos como respaldo interno, sin volverlo obligatorio para publicar.',
  },
  {
    key: 'manualReview',
    label: 'Revisión manual o presencial',
    status: isManualReviewAdvancedReady(input) ? 'complete' : 'pending',
    description: isManualReviewAdvancedReady(input)
      ? 'La estructura de revisión manual o presencial ya quedó preparada para este aviso.'
      : 'La capa manual o presencial queda lista para una etapa avanzada, sin frenar el alta.',
  },
]);

export const buildPropertyVerificationProgress = (
  input: PropertyVerificationSummaryInput,
): PropertyVerificationProgress => {
  const advancedChecks = buildPropertyAdvancedVerificationItems(input);
  const baseReady = isPropertyBasicsComplete(input) && resolvePublishedPhotoCount(input) > 0 && hasText(input.location);
  const mediumReady = baseReady && isIdentityCheckComplete(input) && isVideoCheckComplete(input);
  const highReady = mediumReady && advancedChecks.every((item) => item.status === 'complete');

  if (highReady) {
    return {
      level: 'high',
      label: 'Nivel alto',
      summary: 'El aviso ya combina una base clara, identidad validada, video y respaldo avanzado.',
      nextStep: 'La capa avanzada ya quedó lista. Solo mantené el material al día cuando el lugar cambie.',
      advancedChecks,
    };
  }

  if (mediumReady) {
    return {
      level: 'medium',
      label: 'Nivel medio',
      summary: 'Ya sumaste identidad validada y video del lugar como señales fuertes de confianza.',
      nextStep: advancedChecks[0]?.status === 'pending'
        ? 'Si querés sumar una capa avanzada, podés cargar documentación privada para moderación interna.'
        : 'La siguiente mejora fuerte es dejar preparada una revisión manual o presencial.',
      advancedChecks,
    };
  }

  return {
    level: 'base',
    label: 'Nivel base',
    summary: 'El aviso ya puede publicarse con fotos y datos mínimos, sin frenar el alta por validaciones extra.',
    nextStep: !isIdentityCheckComplete(input)
      ? 'Validá la identidad del perfil para subir al nivel medio.'
      : 'Subí un video del lugar para reforzar confianza sin complicar la publicación.',
    advancedChecks,
  };
};

export const normalizeIdentityVerificationStatus = (input: {
  documentaryVerified?: boolean | number | string | null;
  identityVerificationStatus?: string | null;
}): IdentityVerificationStatus => {
  const normalizedStatus = typeof input.identityVerificationStatus === 'string'
    ? input.identityVerificationStatus.trim().toLowerCase()
    : '';

  if (normalizedStatus === 'verified' || isTruthyFlag(input.documentaryVerified)) {
    return 'verified';
  }

  if (normalizedStatus === 'pending') {
    return 'pending';
  }

  if (normalizedStatus === 'rejected') {
    return 'rejected';
  }

  return 'unverified';
};

export const buildUserIdentityVerification = (
  input: UserVerificationSummaryInput,
): UserIdentityVerification => ({
  status: normalizeIdentityVerificationStatus(input),
  provider: typeof input.identityVerificationProvider === 'string' && input.identityVerificationProvider.trim().length > 0
    ? input.identityVerificationProvider.trim().toLowerCase()
    : null,
  verifiedAt: toDateString(input.identityVerifiedAt),
});

export const getIdentityVerificationDescription = (identityVerification: UserIdentityVerification) => {
  if (identityVerification.status === 'verified') {
    const providerLabel = formatProviderLabel(identityVerification.provider);
    const verifiedAtLabel = formatIsoDateLabel(identityVerification.verifiedAt);

    if (providerLabel && verifiedAtLabel) {
      return `La identidad ya fue verificada por ${providerLabel} el ${verifiedAtLabel}.`;
    }

    if (providerLabel) {
      return `La identidad ya fue verificada por ${providerLabel}.`;
    }

    if (verifiedAtLabel) {
      return `La identidad ya fue verificada el ${verifiedAtLabel}.`;
    }

    return 'La identidad ya fue verificada.';
  }

  if (identityVerification.status === 'pending') {
    return 'La verificación de identidad está en revisión.';
  }

  if (identityVerification.status === 'rejected') {
    return 'La última verificación de identidad fue rechazada.';
  }

  return 'Todavía no hay una verificación de identidad completa.';
};

export const buildUserVerificationSummary = (
  input: UserVerificationSummaryInput,
): UserVerificationSummary => {
  const identityVerification = buildUserIdentityVerification(input);

  return buildVerificationSummary<UserVerificationKey>([
    {
      key: 'email',
      label: 'Email verificado',
      status: isTruthyFlag(input.emailVerified) ? 'complete' : 'pending',
      description: isTruthyFlag(input.emailVerified)
        ? 'El email principal de la cuenta ya está confirmado.'
        : 'Todavía falta confirmar el email principal de la cuenta.',
    },
    {
      key: 'phone',
      label: 'Teléfono verificado',
      status: isTruthyFlag(input.phoneVerified) ? 'complete' : 'pending',
      description: isTruthyFlag(input.phoneVerified)
        ? 'El teléfono principal de la cuenta ya está confirmado.'
        : 'Todavía falta confirmar el teléfono principal de la cuenta.',
    },
    {
      key: 'identity',
      label: 'Identidad verificada',
      status: identityVerification.status === 'verified' ? 'complete' : 'pending',
      description: getIdentityVerificationDescription(identityVerification),
    },
  ]);
};