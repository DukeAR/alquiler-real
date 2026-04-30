import {
  buildGuestVerificationModel,
  type GuestVerificationItem,
  type GuestVerificationKey,
  type GuestVerificationSummary,
} from './guestVerification';
import {
  type IdentityVerificationStatus,
  type UserIdentityVerification,
} from './verificationModel';

export type UserVerificationLevel = 'INICIAL' | 'NIVEL_1' | 'NIVEL_2' | 'NIVEL_3' | 'NIVEL_4';

export type {
  IdentityVerificationStatus,
  UserIdentityVerification,
};

export type UserVerificationKey = GuestVerificationKey;

export type UserVerificationSummary = GuestVerificationSummary;

export type UserVerificationCategoryId = 'basicIdentity' | 'activity' | 'reputation' | 'additional';

export type UserVerificationChecks = {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  platformActivity: boolean;
  historyVerified: boolean;
  reviewsVerified: boolean;
  documentarySubmitted: boolean;
  documentaryVerified: boolean;
};

export type UserVerificationCheck = {
  id: keyof UserVerificationChecks;
  label: string;
  description: string;
  done: boolean;
  optional?: boolean;
};

export type UserVerificationCategory = {
  id: UserVerificationCategoryId;
  label: string;
  score: number;
  maxScore: number;
  summary: string;
  checks: UserVerificationCheck[];
};

export type UserVerificationBenefits = {
  current: string[];
  next: string[];
};

export type UserVerificationInput = {
  emailVerified?: boolean | null;
  phoneVerified?: boolean | null;
  phone?: string | null;
  bio?: string | null;
  zone?: string | null;
  profilePhoto?: string | null;
  totalBookings?: number | string | null;
  completedBookings?: number | string | null;
  totalReviewsWritten?: number | string | null;
  totalReviewsReceived?: number | string | null;
  totalConversations?: number | string | null;
  totalMessages?: number | string | null;
  documentarySubmitted?: boolean | null;
  documentaryVerified?: boolean | null;
  identityVerificationStatus?: IdentityVerificationStatus | string | null;
  identityVerificationProvider?: string | null;
  identityVerifiedAt?: string | Date | null;
};

export type UserVerificationStatus = {
  level: UserVerificationLevel;
  levelNumber: number;
  levelLabel: string;
  shortLabel: string;
  verificationScore: number;
  progress: number;
  headline: string;
  summary: string;
  nextStep: string;
  optionalUpgrade: string | null;
  missingRequirements: string[];
  benefits: UserVerificationBenefits;
  highValueBookingEligible: boolean;
  identityVerification: UserIdentityVerification;
  verificationSummary: UserVerificationSummary;
  verificationItems: GuestVerificationItem[];
  checks: UserVerificationChecks;
  categories: UserVerificationCategory[];
};

type LevelMeta = {
  shortLabel: string;
  levelLabel: string;
  headline: string;
  summary: string;
};

export const USER_VERIFICATION_LEVEL_META: Record<UserVerificationLevel, LevelMeta> = {
  INICIAL: {
    shortLabel: 'Primeras validaciones',
    levelLabel: 'Validaciones iniciales',
    headline: 'Todavía faltan las validaciones base de tu cuenta.',
    summary: 'Primero conviene confirmar email y teléfono. Después podés completar perfil, sumar historial real y, si querés, agregar la validación documental adicional.',
  },
  NIVEL_1: {
    shortLabel: 'Contacto confirmado',
    levelLabel: 'Base de contacto lista',
    headline: 'Tu cuenta ya muestra la base mínima de contacto.',
    summary: 'Email y teléfono ya quedaron confirmados como información validada de la cuenta.',
  },
  NIVEL_2: {
    shortLabel: 'Perfil completo',
    levelLabel: 'Perfil visible',
    headline: 'Tu cuenta ya muestra contacto y perfil completo.',
    summary: 'Además del contacto confirmado, tu perfil ya muestra foto, presentación, zona y teléfono cargados.',
  },
  NIVEL_3: {
    shortLabel: 'Historial visible',
    levelLabel: 'Historial real visible',
    headline: 'Tu cuenta ya muestra historial real dentro de la plataforma.',
    summary: 'La cuenta ya tiene actividad, estadías o reseñas de anfitriones que sostienen una señal real para decidir mejor.',
  },
  NIVEL_4: {
    shortLabel: 'Documental adicional',
    levelLabel: 'Validación documental adicional',
    headline: 'Sumaste la validación documental como respaldo extra.',
    summary: 'Además del contacto, el perfil y el historial real, tu cuenta ya muestra la validación documental adicional.',
  },
};

const toSafeCount = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildBenefits = (verificationSummary: UserVerificationSummary): UserVerificationBenefits => ({
  current: verificationSummary.items
    .filter((item) => item.status === 'complete')
    .slice(0, 2)
    .map((item) => `${item.label} ya está validado.`),
  next: verificationSummary.items
    .filter((item) => item.status === 'pending' && item.key !== 'documentary')
    .slice(0, 2)
    .map((item) => `${item.label} todavía está pendiente.`),
});

const getNextStep = (missingRequirements: string[], documentaryVerified: boolean) => {
  if (missingRequirements.length > 0) {
    return `${missingRequirements[0]}.`;
  }

  if (!documentaryVerified) {
    return 'Si querés sumar respaldo extra, podés agregar la validación documental adicional.';
  }

  return 'Ya están visibles las 5 validaciones de tu cuenta.';
};

export const buildUserVerificationStatus = (input: UserVerificationInput): UserVerificationStatus => {
  const totalBookings = toSafeCount(input.totalBookings);
  const completedBookings = toSafeCount(input.completedBookings);
  const totalReviewsReceived = toSafeCount(input.totalReviewsReceived);
  const totalConversations = toSafeCount(input.totalConversations);
  const totalMessages = toSafeCount(input.totalMessages);
  const guestVerification = buildGuestVerificationModel({
    ...input,
    completedBookings,
    hostReviewsCount: totalReviewsReceived,
    totalConversations,
    totalMessages,
  });
  const emailVerified = guestVerification.checks.emailVerified;
  const phoneVerified = guestVerification.checks.phoneVerified;
  const profileComplete = guestVerification.checks.profileComplete;
  const historyVerified = guestVerification.checks.historyVerified;
  const documentaryVerified = guestVerification.checks.documentaryVerified;
  const documentarySubmitted = documentaryVerified || Boolean(input.documentarySubmitted);
  const platformActivity = totalBookings > 0 || totalConversations > 0 || totalMessages > 0;
  const reviewsVerified = totalReviewsReceived > 0;

  const checks: UserVerificationChecks = {
    emailVerified,
    phoneVerified,
    profileComplete,
    platformActivity,
    historyVerified,
    reviewsVerified,
    documentarySubmitted,
    documentaryVerified,
  };

  const categories: UserVerificationCategory[] = [
    {
      id: 'basicIdentity',
      label: 'Contacto',
      score: Number(emailVerified) + Number(phoneVerified),
      maxScore: 2,
      summary: emailVerified && phoneVerified
        ? 'Email y teléfono ya están confirmados como base de contacto.'
        : emailVerified || phoneVerified
          ? 'Ya hay una señal de contacto confirmada, pero todavía falta la otra.'
          : 'Todavía faltan las confirmaciones base de contacto.',
      checks: [
        {
          id: 'emailVerified',
          label: 'Email confirmado',
          description: 'Confirma el canal principal de la cuenta.',
          done: emailVerified,
        },
        {
          id: 'phoneVerified',
          label: 'Teléfono confirmado',
          description: 'Suma una segunda señal directa de contacto dentro de la cuenta.',
          done: phoneVerified,
        },
      ],
    },
    {
      id: 'activity',
      label: 'Perfil',
      score: Number(profileComplete),
      maxScore: 1,
      summary: profileComplete
        ? 'El perfil ya muestra foto, presentación, zona y teléfono cargados.'
        : 'Todavía faltan datos para completar el perfil.',
      checks: [
        {
          id: 'profileComplete',
          label: 'Perfil completo',
          description: 'Foto, presentación, zona y teléfono ayudan a entender mejor con quién hablás.',
          done: profileComplete,
        },
      ],
    },
    {
      id: 'reputation',
      label: 'Historial',
      score: Number(historyVerified),
      maxScore: 1,
      summary: historyVerified
        ? 'La cuenta ya muestra estadías, reseñas de anfitriones o actividad real dentro de la plataforma.'
        : 'Todavía no hay historial real visible dentro de la plataforma.',
      checks: [
        {
          id: 'historyVerified',
          label: 'Historial real en la plataforma',
          description: 'Estadías, reseñas de anfitriones o actividad real muestran uso real de la cuenta.',
          done: historyVerified,
        },
      ],
    },
    {
      id: 'additional',
      label: 'Identidad documental',
      score: Number(documentaryVerified),
      maxScore: 1,
      summary: documentaryVerified
        ? 'La cuenta ya tiene una validación documental adicional.'
        : documentarySubmitted
          ? 'Hay documentación enviada para sumar respaldo extra.'
          : 'La capa documental sigue siendo opcional y solo suma como respaldo extra.',
      checks: [
        {
          id: 'documentaryVerified',
          label: 'Validación documental lista',
          description: 'Es una capa adicional. No reemplaza el historial, el contacto ni el perfil.',
          done: documentaryVerified,
          optional: true,
        },
      ],
    },
  ];

  const basicLevelReached = emailVerified && phoneVerified;
  const profileLevelReached = basicLevelReached && profileComplete;
  const reputationLevelReached = profileLevelReached && historyVerified;
  const additionalLevelReached = reputationLevelReached && documentaryVerified;
  const levelNumber = additionalLevelReached ? 4 : reputationLevelReached ? 3 : profileLevelReached ? 2 : basicLevelReached ? 1 : 0;
  const level = (levelNumber === 4
    ? 'NIVEL_4'
    : levelNumber === 3
      ? 'NIVEL_3'
      : levelNumber === 2
        ? 'NIVEL_2'
        : levelNumber === 1
          ? 'NIVEL_1'
          : 'INICIAL') as UserVerificationLevel;
  const meta = USER_VERIFICATION_LEVEL_META[level];
  const verificationSummary = guestVerification.verificationSummary;
  const verificationScore = guestVerification.verificationScore;
  const progress = verificationSummary.maxScore > 0
    ? Math.round((verificationScore / verificationSummary.maxScore) * 100)
    : 0;
  const missingRequirements = guestVerification.missingRequirements;
  const optionalUpgrade = !documentaryVerified
    ? 'Podés sumar la validación documental adicional como respaldo extra. No reemplaza historial, contacto ni perfil.'
    : null;

  return {
    level,
    levelNumber,
    levelLabel: meta.levelLabel,
    shortLabel: meta.shortLabel,
    verificationScore,
    progress,
    headline: meta.headline,
    summary: meta.summary,
    nextStep: getNextStep(missingRequirements, documentaryVerified),
    optionalUpgrade,
    missingRequirements,
    benefits: buildBenefits(verificationSummary),
    highValueBookingEligible: basicLevelReached || documentaryVerified,
    identityVerification: guestVerification.identityVerification,
    verificationSummary,
    verificationItems: guestVerification.verificationItems,
    checks,
    categories,
  };
};