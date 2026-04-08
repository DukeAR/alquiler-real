import {
  buildVerificationSummary,
  buildUserIdentityVerification,
  getIdentityVerificationDescription,
  type UserIdentityVerification,
  type VerificationItem,
  type VerificationSummary,
} from './verificationModel';

export const GUEST_VERIFICATION_KEYS = ['email', 'phone', 'profile', 'history', 'documentary'] as const;

export const GUEST_VERIFICATION_SCORE_MAX = GUEST_VERIFICATION_KEYS.length;

export type GuestVerificationKey = typeof GUEST_VERIFICATION_KEYS[number];

export type GuestVerificationItem = VerificationItem<GuestVerificationKey>;

export type GuestVerificationSummary = VerificationSummary<GuestVerificationKey>;

export type GuestProfileCompletionInput = {
  phone?: string | null;
  bio?: string | null;
  zone?: string | null;
  profilePhoto?: string | null;
  profileComplete?: boolean | null;
  photoUploaded?: boolean | null;
  basicDetailsComplete?: boolean | null;
};

export type GuestProfileCompletion = {
  profileComplete: boolean;
  photoUploaded: boolean;
  basicDetailsComplete: boolean;
  phoneLoaded: boolean;
  bioLoaded: boolean;
  zoneLoaded: boolean;
  profileSignalsCount: number;
};

export type GuestVerificationSummaryInput = GuestProfileCompletionInput & {
  verificationSummary?: Partial<GuestVerificationSummary> | null;
  emailVerified?: boolean | number | string | null;
  phoneVerified?: boolean | number | string | null;
  completedBookings?: number | string | null;
  completedStays?: number | string | null;
  totalBookings?: number | string | null;
  hostReviewsCount?: number | string | null;
  totalReviewsReceived?: number | string | null;
  totalConversations?: number | string | null;
  totalMessages?: number | string | null;
  activitySignalsCount?: number | string | null;
  documentaryVerified?: boolean | number | string | null;
  identityVerified?: boolean | number | string | null;
  identityVerificationStatus?: string | null;
  identityVerificationProvider?: string | null;
  identityVerifiedAt?: string | Date | null;
};

export type GuestVerificationSignals = {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompletion: GuestProfileCompletion;
  completedBookingsCount: number;
  hostReviewsCount: number;
  totalConversations: number;
  totalMessages: number;
  activitySignalsCount: number;
  historyVerified: boolean;
  identityVerification: UserIdentityVerification;
  documentaryVerified: boolean;
};

type GuestVerificationItemInput = Partial<GuestVerificationItem>;

const GUEST_VERIFICATION_KEY_SET = new Set<string>(GUEST_VERIFICATION_KEYS);

const isTruthyFlag = (value: unknown) => value === true || value === 1 || value === '1' || value === 't' || value === 'true';

const toSafeInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

const hasText = (value: string | null | undefined) => Boolean(value && value.trim().length > 0);

const withCountLabel = (count: number, singular: string, plural: string) => (
  `${count} ${count === 1 ? singular : plural}`
);

const joinLabels = (items: string[]) => {
  if (items.length <= 1) {
    return items[0] ?? '';
  }

  if (items.length === 2) {
    return `${items[0]} y ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
};

const isGuestVerificationKey = (value: string): value is GuestVerificationKey => GUEST_VERIFICATION_KEY_SET.has(value);

export const buildGuestProfileCompletion = (input: GuestProfileCompletionInput): GuestProfileCompletion => {
  const phoneLoaded = hasText(input.phone);
  const bioLoaded = hasText(input.bio);
  const zoneLoaded = hasText(input.zone);
  const photoUploaded = typeof input.photoUploaded === 'boolean' ? input.photoUploaded : hasText(input.profilePhoto);
  const basicDetailsComplete = typeof input.basicDetailsComplete === 'boolean'
    ? input.basicDetailsComplete
    : phoneLoaded && bioLoaded && zoneLoaded;

  return {
    profileComplete: typeof input.profileComplete === 'boolean'
      ? input.profileComplete
      : photoUploaded && basicDetailsComplete,
    photoUploaded,
    basicDetailsComplete,
    phoneLoaded,
    bioLoaded,
    zoneLoaded,
    profileSignalsCount: [photoUploaded, phoneLoaded, bioLoaded, zoneLoaded].filter(Boolean).length,
  };
};

export const buildGuestVerificationSignals = (
  input: GuestVerificationSummaryInput,
): GuestVerificationSignals => {
  const emailVerified = isTruthyFlag(input.emailVerified);
  const phoneVerified = isTruthyFlag(input.phoneVerified);
  const profileCompletion = buildGuestProfileCompletion(input);
  const completedBookingsCount = toSafeInteger(input.completedBookings ?? input.completedStays);
  const hostReviewsCount = toSafeInteger(input.hostReviewsCount ?? input.totalReviewsReceived);
  const totalConversations = toSafeInteger(input.totalConversations);
  const totalMessages = toSafeInteger(input.totalMessages);
  const activitySignalsCount = toSafeInteger(input.activitySignalsCount)
    + (toSafeInteger(input.totalBookings) > 0 ? 1 : 0)
    + (totalConversations > 0 ? 1 : 0)
    + (totalMessages > 0 ? 1 : 0);
  const identityVerification = buildUserIdentityVerification({
    documentaryVerified: input.documentaryVerified ?? input.identityVerified,
    identityVerificationStatus: input.identityVerificationStatus,
    identityVerificationProvider: input.identityVerificationProvider,
    identityVerifiedAt: input.identityVerifiedAt,
  });
  const documentaryVerified = identityVerification.status === 'verified';

  return {
    emailVerified,
    phoneVerified,
    profileCompletion,
    completedBookingsCount,
    hostReviewsCount,
    totalConversations,
    totalMessages,
    activitySignalsCount,
    historyVerified: completedBookingsCount > 0 || hostReviewsCount > 0 || activitySignalsCount > 0,
    identityVerification,
    documentaryVerified,
  };
};

const getProfileCompletionDescription = (profileCompletion: GuestProfileCompletion) => {
  if (profileCompletion.profileComplete) {
    return 'La cuenta ya tiene foto, presentación, zona y teléfono cargados.';
  }

  const missing: string[] = [];

  if (!profileCompletion.photoUploaded) {
    missing.push('foto de perfil');
  }

  if (!profileCompletion.bioLoaded) {
    missing.push('presentación');
  }

  if (!profileCompletion.zoneLoaded) {
    missing.push('zona');
  }

  if (!profileCompletion.phoneLoaded) {
    missing.push('teléfono');
  }

  const uniqueMissing = Array.from(new Set(missing));

  return uniqueMissing.length > 0
    ? `Todavía faltan ${joinLabels(uniqueMissing)} para completar el perfil.`
    : 'Todavía faltan datos para completar el perfil.';
};

const getHistoryDescription = (signals: GuestVerificationSignals) => {
  if (!signals.historyVerified) {
    return 'Todavía no hay estadías completadas, reseñas de anfitriones ni actividad real visible dentro de la plataforma.';
  }

  const evidence: string[] = [];

  if (signals.completedBookingsCount > 0) {
    evidence.push(withCountLabel(signals.completedBookingsCount, 'estadía completada', 'estadías completadas'));
  }

  if (signals.hostReviewsCount > 0) {
    evidence.push(withCountLabel(signals.hostReviewsCount, 'reseña de anfitrión', 'reseñas de anfitriones'));
  }

  if (evidence.length === 0) {
    if (signals.totalConversations > 0) {
      evidence.push(withCountLabel(signals.totalConversations, 'conversación', 'conversaciones'));
    }

    if (signals.totalMessages > 0) {
      evidence.push(withCountLabel(signals.totalMessages, 'mensaje', 'mensajes'));
    }

    if (evidence.length === 0 && signals.activitySignalsCount > 0) {
      evidence.push(withCountLabel(signals.activitySignalsCount, 'señal de actividad', 'señales de actividad'));
    }
  }

  return evidence.length > 0
    ? `La cuenta ya muestra ${joinLabels(evidence)} dentro de la plataforma.`
    : 'La cuenta ya muestra historial real dentro de la plataforma.';
};

export const buildGuestVerificationSummary = (
  input: GuestVerificationSummaryInput,
): GuestVerificationSummary => {
  const signals = buildGuestVerificationSignals(input);

  return buildVerificationSummary<GuestVerificationKey>([
    {
      key: 'email',
      label: 'Email verificado',
      status: signals.emailVerified ? 'complete' : 'pending',
      description: signals.emailVerified
        ? 'El email principal de la cuenta ya está confirmado.'
        : 'Todavía falta confirmar el email principal de la cuenta.',
    },
    {
      key: 'phone',
      label: 'Teléfono verificado',
      status: signals.phoneVerified ? 'complete' : 'pending',
      description: signals.phoneVerified
        ? 'El teléfono principal de la cuenta ya está confirmado.'
        : 'Todavía falta confirmar el teléfono principal de la cuenta.',
    },
    {
      key: 'profile',
      label: 'Perfil completo',
      status: signals.profileCompletion.profileComplete ? 'complete' : 'pending',
      description: getProfileCompletionDescription(signals.profileCompletion),
    },
    {
      key: 'history',
      label: 'Historial real en la plataforma',
      status: signals.historyVerified ? 'complete' : 'pending',
      description: getHistoryDescription(signals),
    },
    {
      key: 'documentary',
      label: 'Identidad documental',
      status: signals.documentaryVerified ? 'complete' : 'pending',
      description: getIdentityVerificationDescription(signals.identityVerification),
    },
  ]);
};

const buildSummaryFromExplicitItems = (
  items: GuestVerificationItemInput[],
  fallback: GuestVerificationSummary,
): GuestVerificationSummary => {
  const fallbackByKey = new Map<GuestVerificationKey, GuestVerificationItem>(
    fallback.items.map((item) => [item.key, item]),
  );
  const providedByKey = new Map<GuestVerificationKey, GuestVerificationItem>();

  items.forEach((item) => {
    if (typeof item.key !== 'string' || !isGuestVerificationKey(item.key)) {
      return;
    }

    const fallbackItem = fallbackByKey.get(item.key);

    if (!fallbackItem) {
      return;
    }

    providedByKey.set(item.key, {
      key: item.key,
      label: typeof item.label === 'string' && item.label.trim().length > 0 ? item.label : fallbackItem.label,
      status: item.status === 'complete' ? 'complete' : 'pending',
      description: typeof item.description === 'string' && item.description.trim().length > 0
        ? item.description
        : fallbackItem.description,
    });
  });

  return buildVerificationSummary<GuestVerificationKey>(
    GUEST_VERIFICATION_KEYS.map((key) => providedByKey.get(key) ?? fallbackByKey.get(key)!),
  );
};

export const getGuestVerificationSummary = (
  input: GuestVerificationSummaryInput,
): GuestVerificationSummary => {
  const fallback = buildGuestVerificationSummary(input);

  if (!Array.isArray(input.verificationSummary?.items) || input.verificationSummary.items.length === 0) {
    return fallback;
  }

  return buildSummaryFromExplicitItems(input.verificationSummary.items as GuestVerificationItemInput[], fallback);
};

export const getGuestVerificationScore = (input: GuestVerificationSummaryInput) => getGuestVerificationSummary(input).score;