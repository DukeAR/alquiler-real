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

export const PROPERTY_VERIFICATION_KEYS = ['identity', 'location', 'material', 'onsite', 'history'] as const;

export type PropertyVerificationKey = typeof PROPERTY_VERIFICATION_KEYS[number];

export type LegacyPropertyVerificationKey = 'visual' | 'relationship';

export type PropertyVerificationItem = VerificationItem<PropertyVerificationKey | LegacyPropertyVerificationKey | string>;

export type PropertyVerificationSummary = VerificationSummary<PropertyVerificationKey | string>;

export type PropertyVerificationSummaryInput = {
  identityValidated?: boolean | number | string | null;
  locationVerified?: boolean | number | string | null;
  materialVerified?: boolean | number | string | null;
  videoValidated?: boolean | number | string | null;
  hasPresencialVerification?: boolean | number | string | null;
  onsiteVerifiedAt?: string | Date | null;
  completedBookingsCount?: number | string | null;
  realReviewsCount?: number | string | null;
  reviewsCount?: number | string | null;
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

const hasProvidedCount = (value: unknown) => value !== null && value !== undefined && value !== '';

const resolveReviewHistoryCount = (realReviewsCount: unknown, reviewsCount: unknown) => (
  hasProvidedCount(realReviewsCount) ? toSafeInteger(realReviewsCount) : toSafeInteger(reviewsCount)
);

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

const withCountLabel = (count: number, singular: string, plural: string) => (
  `${count} ${count === 1 ? singular : plural}`
);

export const buildVerificationSummary = <K extends string>(items: Array<VerificationItem<K>>): VerificationSummary<K> => ({
  score: items.filter((item) => item.status === 'complete').length,
  maxScore: items.length,
  items,
});

export const buildPropertyVerificationItem = (input: {
  key: PropertyVerificationKey;
  complete: boolean;
  completedBookingsCount?: number | string | null;
  realReviewsCount?: number | string | null;
  reviewsCount?: number | string | null;
  onsiteVerifiedAt?: string | Date | null;
}): VerificationItem<PropertyVerificationKey> => {
  const status: VerificationItemStatus = input.complete ? 'complete' : 'pending';
  const completedBookingsCount = toSafeInteger(input.completedBookingsCount);
  const realReviewsCount = resolveReviewHistoryCount(input.realReviewsCount, input.reviewsCount);
  const onsiteVerifiedAt = formatIsoDateLabel(toDateString(input.onsiteVerifiedAt));

  if (input.key === 'identity') {
    return {
      key: 'identity',
      label: 'Identidad del anfitrión',
      status,
      description: input.complete ? 'La identidad del anfitrión ya está verificada.' : 'Todavía falta verificar la identidad del anfitrión.',
    };
  }

  if (input.key === 'location') {
    return {
      key: 'location',
      label: 'Ubicación de la propiedad',
      status,
      description: input.complete ? 'La ubicación de la propiedad ya está validada.' : 'Todavía falta validar la ubicación de la propiedad.',
    };
  }

  if (input.key === 'material') {
    return {
      key: 'material',
      label: 'Material real del lugar',
      status,
      description: input.complete ? 'Hay material real validado del lugar.' : 'Todavía falta material real validado del lugar.',
    };
  }

  if (input.key === 'onsite') {
    return {
      key: 'onsite',
      label: 'Verificación presencial',
      status,
      description: input.complete
        ? onsiteVerifiedAt
          ? `La verificación presencial quedó registrada el ${onsiteVerifiedAt}.`
          : 'La verificación presencial ya quedó registrada.'
        : 'Todavía no hay una verificación presencial registrada.',
    };
  }

  if (input.complete) {
    const evidence: string[] = [];

    if (completedBookingsCount > 0) {
      evidence.push(withCountLabel(completedBookingsCount, 'reserva completada', 'reservas completadas'));
    }

    if (realReviewsCount > 0) {
      evidence.push(withCountLabel(realReviewsCount, 'reseña real', 'reseñas reales'));
    }

    return {
      key: 'history',
      label: 'Historial real del aviso',
      status,
      description: evidence.length > 0
        ? `El aviso ya tiene ${evidence.join(' y ')}.`
        : 'El aviso ya tiene historial real registrado.',
    };
  }

  return {
    key: 'history',
    label: 'Historial real del aviso',
    status,
    description: 'Todavía no hay reservas completadas ni reseñas reales asociadas al aviso.',
  };
};

export const buildPropertyVerificationSummary = (
  input: PropertyVerificationSummaryInput,
): PropertyVerificationSummary => {
  const materialComplete = isTruthyFlag(input.materialVerified) || isTruthyFlag(input.videoValidated);
  const historyReviewsCount = resolveReviewHistoryCount(input.realReviewsCount, input.reviewsCount);
  const historyComplete = toSafeInteger(input.completedBookingsCount) > 0 || historyReviewsCount > 0;

  return buildVerificationSummary<PropertyVerificationKey>([
    buildPropertyVerificationItem({ key: 'identity', complete: isTruthyFlag(input.identityValidated) }),
    buildPropertyVerificationItem({ key: 'location', complete: isTruthyFlag(input.locationVerified) }),
    buildPropertyVerificationItem({ key: 'material', complete: materialComplete }),
    buildPropertyVerificationItem({
      key: 'onsite',
      complete: isTruthyFlag(input.hasPresencialVerification),
      onsiteVerifiedAt: input.onsiteVerifiedAt,
    }),
    buildPropertyVerificationItem({
      key: 'history',
      complete: historyComplete,
      completedBookingsCount: input.completedBookingsCount,
      realReviewsCount: historyReviewsCount,
    }),
  ]);
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