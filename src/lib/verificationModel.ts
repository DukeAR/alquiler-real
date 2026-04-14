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

export const PROPERTY_VERIFICATION_KEYS = ['location', 'identity', 'data', 'photos', 'price'] as const;

export const PROPERTY_ADVANCED_CHECK_KEYS = ['documents', 'manualReview'] as const;

export type PropertyVerificationKey = typeof PROPERTY_VERIFICATION_KEYS[number];

export type PropertyAdvancedVerificationKey = typeof PROPERTY_ADVANCED_CHECK_KEYS[number];

export type LegacyPropertyVerificationKey = 'visual' | 'relationship' | 'material' | 'onsite' | 'history' | 'basics' | 'video';

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

const isListingDataCheckComplete = (input: PropertyVerificationSummaryInput) => (
  hasText(input.title)
  && hasText(input.description)
  && toSafeInteger(input.maxGuests) > 0
);

const isLocationVisible = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.locationVerified) || (hasText(input.location) && hasListingCoordinates(input))
);

const isRealPhotoCheckComplete = (input: PropertyVerificationSummaryInput) => (
  isTruthyFlag(input.materialVerified) || toSafeInteger(input.verificationPhotoCount) >= 4
);

const isPriceCheckComplete = (input: PropertyVerificationSummaryInput) => (
  toSafeNumber(input.price) !== null && (toSafeNumber(input.price) ?? 0) > 0
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

  if (input.key === 'location') {
    return {
      key: 'location',
      label: 'Ubicación',
      status,
      description: input.complete
        ? 'La ubicación aproximada ya quedó comprobada para ubicar el lugar con más claridad.'
        : 'Todavía falta confirmar mejor la ubicación aproximada del lugar.',
    };
  }

  if (input.key === 'identity') {
    return {
      key: 'identity',
      label: 'Anfitrión',
      status,
      description: input.complete
        ? 'La identidad del anfitrión ya quedó validada y suma una señal fuerte de confianza.'
        : 'Todavía falta validar la identidad del anfitrión para sumar más confianza.',
    };
  }

  if (input.key === 'data') {
    return {
      key: 'data',
      label: 'Datos',
      status,
      description: input.complete
        ? 'El aviso ya muestra descripción y capacidad suficientes para entenderse rápido.'
        : 'Todavía faltan datos visibles para que el aviso se entienda de entrada.',
    };
  }

  if (input.key === 'photos') {
    return {
      key: 'photos',
      label: 'Fotos',
      status,
      description: input.complete
        ? 'El aviso ya suma fotos reales que ayudan a comparar el lugar de entrada.'
        : 'Todavía faltan fotos reales para comparar mejor este aviso.',
    };
  }

  if (input.key === 'price') {
    return {
      key: 'price',
      label: 'Precio',
      status,
      description: input.complete
        ? 'El precio por noche ya está visible y permite comparar este aviso con otras opciones.'
        : 'Todavía falta publicar un precio claro para poder comparar este aviso.',
    };
  }

  return {
    key: 'data',
    label: 'Datos',
    status,
    description: input.complete
      ? 'El aviso ya muestra descripción y capacidad suficientes para entenderse rápido.'
      : 'Todavía faltan datos visibles para que el aviso se entienda de entrada.',
  };
};

const getPropertyVerificationNextStep = (input: PropertyVerificationSummaryInput) => {
  if (!isLocationVisible(input)) {
    return 'Confirma mejor la ubicación aproximada del lugar.';
  }

  if (!isListingDataCheckComplete(input)) {
    return 'Completa los datos visibles para que el aviso se entienda rápido.';
  }

  if (!isPriceCheckComplete(input)) {
    return 'Publica un precio claro por noche para que el aviso se pueda comparar.';
  }

  if (!isIdentityCheckComplete(input)) {
    return 'Valida tu identidad para sumar una comprobación visible.';
  }

  if (!isRealPhotoCheckComplete(input)) {
    return 'Subi fotos reales para que el aviso se compare mejor de entrada.';
  }

  return 'Suma documentación privada o una revisión manual para reforzar todavía más la confianza.';
};

export const buildPropertyVerificationSummary = (
  input: PropertyVerificationSummaryInput,
): PropertyVerificationSummary => {
  return buildVerificationSummary<PropertyVerificationKey>([
    buildPropertyVerificationItem({ key: 'location', complete: isLocationVisible(input) }),
    buildPropertyVerificationItem({ key: 'identity', complete: isIdentityCheckComplete(input) }),
    buildPropertyVerificationItem({ key: 'data', complete: isListingDataCheckComplete(input) }),
    buildPropertyVerificationItem({ key: 'photos', complete: isRealPhotoCheckComplete(input) }),
    buildPropertyVerificationItem({ key: 'price', complete: isPriceCheckComplete(input) }),
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
  const baseReady = isListingDataCheckComplete(input) && isLocationVisible(input) && isPriceCheckComplete(input);
  const mediumReady = baseReady && isIdentityCheckComplete(input) && isRealPhotoCheckComplete(input);
  const highReady = mediumReady && advancedChecks.every((item) => item.status === 'complete');

  if (highReady) {
    return {
      level: 'high',
      label: 'Confianza avanzada',
      summary: 'Ya completaste las 5 comprobaciones visibles y además sumaste respaldo avanzado para moderación.',
      nextStep: 'Solo mantene el material al dia para sostener visibilidad y confianza cuando el lugar cambie.',
      advancedChecks,
    };
  }

  if (mediumReady) {
    return {
      level: 'medium',
      label: 'Comprobación completa',
      summary: 'Ya completaste las 5 comprobaciones visibles: ubicación, anfitrión, datos, fotos y precio.',
      nextStep: advancedChecks[0]?.status === 'pending'
        ? 'Si queres sumar otra capa, podes cargar documentacion privada para moderacion interna.'
        : 'La siguiente mejora es dejar preparada una revision manual o presencial.',
      advancedChecks,
    };
  }

  return {
    level: 'base',
    label: 'Base publicada',
    summary: 'El aviso ya esta publicado. Ahora podes completar ubicación, anfitrión, datos, fotos y precio para que se compare mejor.',
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