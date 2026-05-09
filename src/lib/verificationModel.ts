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

export const PROPERTY_VERIFICATION_KEYS = ['identity', 'location', 'geolocation', 'photos', 'availability'] as const;

export const PROPERTY_ADVANCED_CHECK_KEYS = ['documents', 'manualReview'] as const;

export type PropertyVerificationKey = typeof PROPERTY_VERIFICATION_KEYS[number];

export type PropertyAdvancedVerificationKey = typeof PROPERTY_ADVANCED_CHECK_KEYS[number];

export type LegacyPropertyVerificationKey = 'visual' | 'relationship' | 'material' | 'onsite' | 'history' | 'basics' | 'video' | 'data' | 'price';

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
  availabilityValidated?: boolean | number | string | null;
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
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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

const isLocationVerifiedCheckComplete = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.locationVerified)
);

const isPreciseGeolocationCheckComplete = (input: PropertyVerificationSummaryInput) => (
  isLocationVerifiedCheckComplete(input) && hasListingCoordinates(input)
);

const isRealMediaCheckComplete = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.materialVerified)
  || isTruthyFlag(input.videoValidated)
  || toSafeInteger(input.verificationPhotoCount) > 0
  || toSafeInteger(input.verificationVideoCount) > 0
);

const isAvailabilityValidatedCheckComplete = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.availabilityValidated)
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

  if (input.key === 'identity') {
    return {
      key: 'identity',
      label: 'Identidad del anfitrión validada en la plataforma',
      status,
      description: input.complete
        ? 'La identidad del anfitrión ya quedó validada dentro de la plataforma.'
        : 'Todavía falta validar la identidad del anfitrión.',
    };
  }

  if (input.key === 'location') {
    return {
      key: 'location',
      label: 'Ubicación del aviso cargada',
      status,
      description: input.complete
        ? 'La ubicación del aviso ya quedó cargada dentro de la plataforma.'
        : 'Todavía falta cargar la ubicación del aviso.',
    };
  }

  if (input.key === 'geolocation') {
    return {
      key: 'geolocation',
      label: 'Punto exacto del aviso',
      status,
      description: input.complete
        ? 'El aviso ya cuenta con un punto de mapa para ubicar mejor la propiedad.'
        : 'Todavía falta sumar el punto exacto del mapa para ubicar mejor la propiedad.',
    };
  }

  if (input.key === 'photos') {
    return {
      key: 'photos',
      label: input.complete ? 'Respaldo visual del aviso' : 'Falta respaldo visual del aviso',
      status,
      description: input.complete
        ? 'El aviso ya muestra fotos del lugar como respaldo visual.'
        : 'Sumar fotos del lugar ayuda a que el aviso se entienda mejor.',
    };
  }

  if (input.key === 'availability') {
    return {
      key: 'availability',
      label: input.complete ? 'Disponibilidad reciente' : 'Disponibilidad pendiente de confirmación',
      status,
      description: input.complete
        ? 'La disponibilidad ya muestra calendario o actividad reciente dentro de la plataforma.'
        : 'Responder o confirmar fechas actualiza este punto.',
    };
  }

  return {
    key: 'availability',
    label: input.complete ? 'Disponibilidad reciente' : 'Disponibilidad pendiente de confirmación',
    status,
    description: input.complete
      ? 'La disponibilidad ya muestra calendario o actividad reciente dentro de la plataforma.'
      : 'Responder o confirmar fechas actualiza este punto.',
  };
};

const getPropertyVerificationNextStep = (input: PropertyVerificationSummaryInput) => {
  if (!isRealMediaCheckComplete(input)) {
    return 'Falta sumar respaldo visual del aviso.';
  }

  if (!isAvailabilityValidatedCheckComplete(input)) {
    return 'Falta confirmar disponibilidad reciente.';
  }

  if (!isIdentityCheckComplete(input)) {
    return 'Falta validar la identidad del anfitrión.';
  }

  if (!isLocationVerifiedCheckComplete(input)) {
    return 'Falta confirmar la ubicación del aviso.';
  }

  if (!isPreciseGeolocationCheckComplete(input)) {
    return 'Falta sumar el punto exacto del mapa.';
  }

  return 'Suma documentación privada o una revisión manual para reforzar todavía más la confianza.';
};

const getPropertyVerificationDecisionSummary = (score: number) => {
  if (score >= 4) {
    return 'Listo para coordinar.';
  }

  if (score >= 3) {
    return 'Podés avanzar, pero hay información a completar.';
  }

  return 'Todavía falta información clave para decidir.';
};

export const buildPropertyVerificationSummary = (
  input: PropertyVerificationSummaryInput,
): PropertyVerificationSummary => {
  return buildVerificationSummary<PropertyVerificationKey>([
    buildPropertyVerificationItem({ key: 'identity', complete: isIdentityCheckComplete(input) }),
    buildPropertyVerificationItem({ key: 'location', complete: isLocationVerifiedCheckComplete(input) }),
    buildPropertyVerificationItem({ key: 'geolocation', complete: isPreciseGeolocationCheckComplete(input) }),
    buildPropertyVerificationItem({ key: 'photos', complete: isRealMediaCheckComplete(input) }),
    buildPropertyVerificationItem({ key: 'availability', complete: isAvailabilityValidatedCheckComplete(input) }),
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
  const verificationSummary = buildPropertyVerificationSummary(input);
  const advancedChecks = buildPropertyAdvancedVerificationItems(input);
  const allVisibleChecksReady = verificationSummary.score === verificationSummary.maxScore;
  const mediumReady = verificationSummary.score >= 3;
  const highReady = allVisibleChecksReady && advancedChecks.every((item) => item.status === 'complete');
  const decisionSummary = getPropertyVerificationDecisionSummary(verificationSummary.score);

  if (highReady) {
    return {
      level: 'high',
      label: 'Verificación avanzada',
      summary: decisionSummary,
      nextStep: 'Solo mantene el material al dia para sostener visibilidad y confianza cuando el lugar cambie.',
      advancedChecks,
    };
  }

  if (mediumReady) {
    return {
      level: 'medium',
      label: allVisibleChecksReady ? 'Verificación lista para coordinar' : 'Verificación en progreso',
      summary: decisionSummary,
      nextStep: advancedChecks[0]?.status === 'pending'
        ? getPropertyVerificationNextStep(input)
        : 'La siguiente mejora es dejar preparada una revision manual o presencial.',
      advancedChecks,
    };
  }

  return {
    level: 'base',
    label: 'Verificación inicial',
    summary: decisionSummary,
    nextStep: getPropertyVerificationNextStep(input),
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