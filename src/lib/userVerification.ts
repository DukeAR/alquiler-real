import {
  buildUserIdentityVerification,
  buildUserVerificationSummary,
  type IdentityVerificationStatus,
  type UserIdentityVerification,
  type UserVerificationSummary,
} from './verificationModel';

export type UserVerificationLevel = 'INICIAL' | 'NIVEL_1' | 'NIVEL_2' | 'NIVEL_3' | 'NIVEL_4';

export type {
  IdentityVerificationStatus,
  UserIdentityVerification,
  UserVerificationKey,
  UserVerificationSummary,
} from './verificationModel';

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
    shortLabel: 'Primeras comprobaciones',
    levelLabel: 'Comprobaciones iniciales',
    headline: 'Todavía faltan comprobaciones básicas para mostrar mejor tu cuenta.',
    summary: 'Con email y teléfono confirmados ya dejás clara la base mínima de contacto, sin depender de documentos.',
  },
  NIVEL_1: {
    shortLabel: 'Contacto confirmado',
    levelLabel: 'Base de contacto lista',
    headline: 'Tu cuenta ya muestra la base mínima para entender quién sos.',
    summary: 'Email y teléfono confirmados dejan información validada para empezar a decidir con menos dudas.',
  },
  NIVEL_2: {
    shortLabel: 'Perfil activo',
    levelLabel: 'Perfil y uso visibles',
    headline: 'Tu perfil ya aporta más contexto para decidir.',
    summary: 'Tus datos y tu actividad muestran una cuenta real y en uso, sin pedir documentación al inicio.',
  },
  NIVEL_3: {
    shortLabel: 'Historial consistente',
    levelLabel: 'Historial y reseñas visibles',
    headline: 'Tu cuenta ya combina actividad, historial y reseñas.',
    summary: 'La información validada de tu cuenta ayuda a decidir mejor porque muestra uso real dentro de la plataforma.',
  },
  NIVEL_4: {
    shortLabel: 'Documentación adicional',
    levelLabel: 'Comprobación documental adicional',
    headline: 'Sumaste una comprobación documental extra.',
    summary: 'Además del historial y la actividad, tu cuenta muestra una comprobación documental opcional para casos puntuales.',
  },
};

const toSafeCount = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasText = (value: string | null | undefined) => Boolean(value && value.trim().length > 0);

const buildBenefits = (levelNumber: number): UserVerificationBenefits => {
  switch (levelNumber) {
    case 4:
      return {
        current: ['Tu cuenta ya combina actividad real, historial y una comprobación documental adicional.'],
        next: [],
      };
    case 3:
      return {
        current: ['Tu cuenta ya muestra historial, interacciones y reseñas dentro de la app.'],
        next: ['Opcional: sumar una comprobación documental extra.'],
      };
    case 2:
      return {
        current: ['Tu perfil ya muestra más información validada antes de reservar o publicar.'],
        next: ['Siguiente foco: sumar historial y reseñas consistentes.'],
      };
    case 1:
      return {
        current: ['Tus datos de contacto ya están confirmados dentro de la cuenta.'],
        next: ['Siguiente foco: completar perfil y registrar actividad real.'],
      };
    default:
      return {
        current: ['Ya podés usar la plataforma y completar tu cuenta a tu ritmo.'],
        next: ['Primero: confirmar email y teléfono.'],
      };
  }
};

const getNextStep = (levelNumber: number, checks: UserVerificationChecks, hasPhone: boolean) => {
  if (levelNumber <= 0) {
    if (!checks.emailVerified) {
      return 'Confirmá tu email desde la cuenta.';
    }

    if (!checks.phoneVerified) {
      return hasPhone ? 'Confirmá tu teléfono.' : 'Agregá tu teléfono y después confirmalo.';
    }
  }

  if (levelNumber === 1) {
    if (!checks.profileComplete) {
      return 'Completá tu perfil para mostrar más información validada.';
    }

    if (!checks.platformActivity) {
      return 'Sumá actividad en la plataforma para dejar más contexto visible.';
    }
  }

  if (levelNumber === 2) {
    if (!checks.historyVerified) {
      return 'Necesitás más historial de reservas o conversaciones para sumar contexto confiable.';
    }

    if (!checks.reviewsVerified) {
      return 'Necesitás reseñas dentro de la plataforma para completar esta parte.';
    }
  }

  if (levelNumber === 3 && !checks.documentaryVerified) {
    return 'Si querés sumar respaldo extra, podés agregar la comprobación documental opcional.';
  }

  return 'Seguí usando la plataforma y manteniendo tus datos al día.';
};

const getMissingRequirements = (levelNumber: number, checks: UserVerificationChecks, hasPhone: boolean) => {
  if (levelNumber <= 0) {
    const requirements: string[] = [];

    if (!checks.emailVerified) {
      requirements.push('Confirmá tu email');
    }

    if (!checks.phoneVerified) {
      requirements.push(hasPhone ? 'Confirmá tu teléfono' : 'Agregá tu teléfono');
    }

    return requirements;
  }

  if (levelNumber === 1) {
    const requirements: string[] = [];

    if (!checks.profileComplete) {
      requirements.push('Completá tu perfil');
    }

    if (!checks.platformActivity) {
      requirements.push('Sumá actividad en la plataforma');
    }

    return requirements;
  }

  if (levelNumber === 2) {
    const requirements: string[] = [];

    if (!checks.historyVerified) {
      requirements.push('Construí historial con reservas o conversaciones');
    }

    if (!checks.reviewsVerified) {
      requirements.push('Sumá reseñas dentro de la app');
    }

    return requirements;
  }

  return [];
};

export const buildUserVerificationStatus = (input: UserVerificationInput): UserVerificationStatus => {
  const emailVerified = Boolean(input.emailVerified);
  const phoneVerified = Boolean(input.phoneVerified);
  const identityVerification = buildUserIdentityVerification({
    documentaryVerified: input.documentaryVerified,
    identityVerificationStatus: input.identityVerificationStatus,
    identityVerificationProvider: input.identityVerificationProvider,
    identityVerifiedAt: input.identityVerifiedAt,
  });
  const hasPhone = hasText(input.phone);
  const profileSignalsCount = [hasPhone, hasText(input.bio), hasText(input.zone), hasText(input.profilePhoto)].filter(Boolean).length;
  const profileComplete = profileSignalsCount >= 3;
  const totalBookings = toSafeCount(input.totalBookings);
  const completedBookings = toSafeCount(input.completedBookings);
  const totalReviewsWritten = toSafeCount(input.totalReviewsWritten);
  const totalReviewsReceived = toSafeCount(input.totalReviewsReceived);
  const totalConversations = toSafeCount(input.totalConversations);
  const totalMessages = toSafeCount(input.totalMessages);
  const activitySignalsCount = [
    totalBookings > 0,
    totalConversations > 0,
    totalMessages >= 3,
    totalReviewsWritten > 0,
  ].filter(Boolean).length;
  const platformActivity = activitySignalsCount >= 1;
  const historyVerified = completedBookings > 0 || totalBookings >= 2 || totalConversations >= 2 || totalMessages >= 6;
  const reviewsVerified = totalReviewsReceived > 0 || totalReviewsWritten >= 2;
  const documentaryVerified = identityVerification.status === 'verified';
  const documentarySubmitted = documentaryVerified || Boolean(input.documentarySubmitted);
  const verificationSummary = buildUserVerificationSummary({
    emailVerified,
    phoneVerified,
    documentaryVerified,
    identityVerificationStatus: identityVerification.status,
    identityVerificationProvider: identityVerification.provider,
    identityVerifiedAt: identityVerification.verifiedAt,
  });

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

  const basicIdentityScore = (emailVerified ? 12 : 0) + (phoneVerified ? 13 : 0);
  const profileScore = profileComplete ? 12 : profileSignalsCount >= 2 ? 6 : profileSignalsCount > 0 ? 3 : 0;
  const platformActivityScore = activitySignalsCount >= 2 ? 13 : activitySignalsCount === 1 ? 7 : 0;
  const historyScore = historyVerified ? 18 : totalBookings > 0 || totalConversations > 0 ? 8 : 0;
  const reviewsScore = reviewsVerified ? 17 : totalReviewsReceived > 0 || totalReviewsWritten > 0 ? 8 : 0;
  const additionalScore = documentaryVerified ? 15 : documentarySubmitted ? 7 : 0;

  const categories: UserVerificationCategory[] = [
    {
      id: 'basicIdentity',
      label: 'Identidad básica',
      score: basicIdentityScore,
      maxScore: 25,
      summary: emailVerified && phoneVerified
        ? 'Email y teléfono ya están confirmados.'
        : emailVerified || phoneVerified
          ? 'Ya hay una señal básica confirmada, pero falta la otra.'
          : 'Todavía faltan las confirmaciones básicas de contacto.',
      checks: [
        {
          id: 'emailVerified',
          label: 'Email confirmado',
          description: 'Ayuda a validar que la cuenta tiene un canal principal activo.',
          done: emailVerified,
        },
        {
          id: 'phoneVerified',
          label: hasPhone ? 'Teléfono confirmado' : 'Teléfono cargado y confirmado',
          description: 'Suma una segunda señal directa de contacto dentro de la cuenta.',
          done: phoneVerified,
        },
      ],
    },
    {
      id: 'activity',
      label: 'Actividad',
      score: profileScore + platformActivityScore,
      maxScore: 25,
      summary: profileComplete && platformActivity
        ? 'El perfil y la actividad ya muestran una cuenta en uso.'
        : profileComplete || platformActivity
          ? 'Ya hay una parte activa, pero todavía falta completar la otra.'
          : 'Todavía faltan perfil completo y actividad real en la app.',
      checks: [
        {
          id: 'profileComplete',
          label: 'Perfil completo',
          description: 'Foto, presentación, zona y teléfono ayudan a entender mejor con quién hablás.',
          done: profileComplete,
        },
        {
          id: 'platformActivity',
          label: 'Actividad en la plataforma',
          description: 'Mensajes, reservas y movimiento real reducen fricción y dudas básicas.',
          done: platformActivity,
        },
      ],
    },
    {
      id: 'reputation',
      label: 'Reputación',
      score: historyScore + reviewsScore,
      maxScore: 35,
      summary: historyVerified && reviewsVerified
        ? 'El historial y las reseñas ya sostienen una señal fuerte.'
        : historyVerified || reviewsVerified
          ? 'Ya hay reputación en marcha, pero todavía falta consistencia.'
          : 'Todavía no hay suficiente historial o reseñas para completar esta parte.',
      checks: [
        {
          id: 'historyVerified',
          label: 'Historial de reservas o interacciones',
          description: 'Reservas concretadas o conversaciones consistentes muestran uso real.',
          done: historyVerified,
        },
        {
          id: 'reviewsVerified',
          label: 'Reseñas dentro de la plataforma',
          description: 'Las reseñas suman experiencias registradas que ayudan a decidir mejor.',
          done: reviewsVerified,
        },
      ],
    },
    {
      id: 'additional',
      label: 'Verificaciones adicionales',
      score: additionalScore,
      maxScore: 15,
      summary: documentaryVerified
        ? 'La cuenta ya tiene una comprobación documental adicional.'
        : documentarySubmitted
          ? 'Hay documentación enviada para sumar respaldo extra.'
          : 'La capa documental queda como una comprobación opcional, no como requisito inicial.',
      checks: [
        {
          id: 'documentarySubmitted',
          label: 'Documentación adicional enviada',
          description: 'Sirve para sumar información validada extra cuando hace falta más respaldo.',
          done: documentarySubmitted,
          optional: true,
        },
        {
          id: 'documentaryVerified',
          label: 'Comprobación documental lista',
          description: 'Es una capa adicional. No reemplaza el historial, la actividad ni las reseñas.',
          done: documentaryVerified,
          optional: true,
        },
      ],
    },
  ];

  const verificationScore = Math.min(100, categories.reduce((total, category) => total + category.score, 0));
  const basicLevelReached = emailVerified && phoneVerified;
  const activityLevelReached = basicLevelReached && profileComplete && platformActivity;
  const reputationLevelReached = activityLevelReached && historyVerified && reviewsVerified;
  const additionalLevelReached = reputationLevelReached && documentaryVerified;
  const levelNumber = additionalLevelReached ? 4 : reputationLevelReached ? 3 : activityLevelReached ? 2 : basicLevelReached ? 1 : 0;
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
  const missingRequirements = getMissingRequirements(levelNumber, checks, hasPhone);
  const optionalUpgrade = levelNumber >= 3 && !documentaryVerified
    ? 'Si querés sumar una señal extra para casos puntuales, podés agregar la comprobación documental opcional.'
    : null;

  return {
    level,
    levelNumber,
    levelLabel: meta.levelLabel,
    shortLabel: meta.shortLabel,
    verificationScore,
    progress: verificationScore,
    headline: meta.headline,
    summary: meta.summary,
    nextStep: getNextStep(levelNumber, checks, hasPhone),
    optionalUpgrade,
    missingRequirements,
    benefits: buildBenefits(levelNumber),
    highValueBookingEligible: basicLevelReached || documentaryVerified,
    identityVerification,
    verificationSummary,
    checks,
    categories,
  };
};