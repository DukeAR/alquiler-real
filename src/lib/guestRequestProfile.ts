import type {
  GuestInteractionHistory,
  GuestHostReviewSnippet,
  GuestOperationSignal,
  GuestOperationSignalSource,
  GuestProfileCompletion,
  GuestRequestProfile,
  GuestRequestProfileDataAvailability,
  GuestRequestProfileDataSource,
} from '../types';
import { buildGuestVerificationModel } from './guestVerification';

type GuestRequestProfileSource = {
  id?: string;
  userId?: string;
  userName?: string;
  status?: string;
  guestProfile?: Partial<GuestRequestProfile> | null;
};

type GuestRequestProfileScenario = 'sync-pending' | 'new-guest' | 'partial-profile' | 'complete';

type GuestRequestProfileSection =
  | 'identity'
  | 'platformHistory'
  | 'hostReviews'
  | 'profileCompletion'
  | 'operationSignals'
  | 'memberSince';

const canonicalOperationSignals: Array<{
  id: string;
  label: string;
  source: GuestOperationSignalSource;
}> = [
  { id: 'consulted-before', label: 'Consultó antes de reservar', source: 'api' },
  { id: 'saved-property', label: 'Guardó la propiedad', source: 'api' },
  { id: 'returned-to-view', label: 'Volvió a verla', source: 'pending' },
  { id: 'completed-profile', label: 'Completó sus datos', source: 'derived' },
];

const hasOwn = <T extends object>(value: T, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const isOperationSignalSource = (value: unknown): value is GuestOperationSignalSource => (
  value === 'api' || value === 'derived' || value === 'pending'
);

const isCompletedProfileSignalActive = (profileCompletion?: Partial<GuestProfileCompletion> | null) => {
  if (!profileCompletion) {
    return false;
  }

  if (typeof profileCompletion.profileComplete === 'boolean') {
    return profileCompletion.profileComplete;
  }

  if (typeof profileCompletion.basicDetailsComplete === 'boolean') {
    return profileCompletion.basicDetailsComplete;
  }

  return false;
};

const createDataAvailability = (overrides?: Partial<GuestRequestProfileDataAvailability>): GuestRequestProfileDataAvailability => {
  const availability: GuestRequestProfileDataAvailability = {
    identity: false,
    platformHistory: false,
    hostReviews: false,
    profileCompletion: false,
    operationSignals: false,
    memberSince: false,
    anyStructuredData: false,
    ...overrides,
  };

  availability.anyStructuredData = [
    availability.identity,
    availability.platformHistory,
    availability.hostReviews,
    availability.profileCompletion,
    availability.operationSignals,
    availability.memberSince,
  ].some(Boolean);

  return availability;
};

const getDataSource = (availability: GuestRequestProfileDataAvailability): GuestRequestProfileDataSource => {
  const flags = [
    availability.identity,
    availability.platformHistory,
    availability.hostReviews,
    availability.profileCompletion,
    availability.operationSignals,
    availability.memberSince,
  ];

  if (!availability.anyStructuredData) {
    return 'fallback';
  }

  if (flags.every(Boolean)) {
    return 'api';
  }

  return 'mixed';
};

const hasPlatformHistory = (profile: GuestRequestProfile) => (
  profile.dataAvailability.platformHistory
  && (profile.platformHistory.completedStays > 0
    || profile.platformHistory.conflictsCount > 0
    || profile.platformHistory.cancellationsCount > 0)
);

const hasHostReviews = (profile: GuestRequestProfile) => (
  profile.dataAvailability.hostReviews && profile.hostReviews.length > 0
);

const hasOperationActivity = (profile: GuestRequestProfile) => (
  profile.dataAvailability.operationSignals && profile.operationSignals.some((signal) => signal.active && signal.source !== 'derived')
);

export const getGuestRequestProfileScenario = (profile: GuestRequestProfile): GuestRequestProfileScenario => {
  if (profile.dataSource === 'fallback') {
    return 'sync-pending';
  }

  const hasAllCoreBlocks = profile.dataAvailability.platformHistory
    && profile.dataAvailability.hostReviews
    && profile.dataAvailability.profileCompletion
    && profile.dataAvailability.operationSignals;

  if (hasAllCoreBlocks && !hasPlatformHistory(profile) && !hasHostReviews(profile) && !hasOperationActivity(profile)) {
    return 'new-guest';
  }

  if (profile.dataSource === 'mixed') {
    return 'partial-profile';
  }

  return 'complete';
};

export const getGuestRequestProfileBannerCopy = (profile: GuestRequestProfile) => {
  const scenario = getGuestRequestProfileScenario(profile);

  if (scenario === 'sync-pending') {
    return {
      title: 'Estamos armando esta ficha',
      description: 'Todavía se están cargando los primeros datos de esta cuenta.',
    };
  }

  if (scenario === 'new-guest') {
    return {
      title: 'Cuenta sin historial todavía',
      description: 'Todavía no hay estadías ni reseñas de anfitriones para revisar.',
    };
  }

  if (scenario === 'partial-profile') {
    return {
      title: 'Faltan bloques por completar',
      description: 'Ya hay datos visibles, pero esta ficha todavía no está completa.',
    };
  }

  return null;
};

export const getGuestRequestProfileEmptyStateMessage = (
  profile: GuestRequestProfile,
  section: GuestRequestProfileSection,
) => {
  const scenario = getGuestRequestProfileScenario(profile);

  if (scenario === 'sync-pending') {
    if (section === 'identity') return 'La validación de identidad va a aparecer acá cuando termine de cargarse la ficha.';
    if (section === 'platformHistory') return 'El historial de estadías y cancelaciones va a aparecer acá cuando haya datos cargados.';
    if (section === 'hostReviews') return 'Las reseñas de anfitriones van a aparecer acá cuando queden cargadas en la ficha.';
    if (section === 'profileCompletion') return 'El resumen del perfil va a aparecer acá cuando haya datos suficientes.';
    if (section === 'operationSignals') return 'Lo que hizo dentro de esta operación va a aparecer acá cuando quede registrado.';
    return 'La antigüedad de la cuenta va a aparecer acá cuando quede disponible.';
  }

  if (scenario === 'new-guest') {
    if (section === 'identity') return 'Todavía no figura una validación de identidad para mostrar.';
    if (section === 'platformHistory') return 'Todavía no hay estadías previas o cancelaciones para revisar.';
    if (section === 'hostReviews') return 'Todavía no hay reseñas de anfitriones porque esta cuenta todavía no tiene estadías visibles.';
    if (section === 'profileCompletion') return 'Todavía no hay suficientes datos cargados para resumir el perfil.';
    if (section === 'operationSignals') return 'Todavía no hay movimientos visibles para revisar en esta operación.';
    return 'La fecha de alta de la cuenta todavía no aparece en la ficha.';
  }

  if (section === 'identity') return 'La validación de identidad todavía no figura cargada en esta ficha.';
  if (section === 'platformHistory') return 'Todavía falta cargar el historial de estadías y cancelaciones.';
  if (section === 'hostReviews') return 'Todavía no aparecen reseñas de anfitriones en esta ficha.';
  if (section === 'profileCompletion') return 'Todavía faltan datos para resumir el perfil.';
  if (section === 'operationSignals') return 'Todavía no aparecen movimientos de esta operación dentro de la plataforma.';
  return 'La fecha de alta de la cuenta todavía no aparece disponible.';
};

export const getGuestRequestProfileReviewsEmptyMessage = (profile: GuestRequestProfile) => {
  if (getGuestRequestProfileScenario(profile) === 'new-guest') {
    return 'Todavía no hay reseñas de anfitriones porque esta cuenta todavía no tiene estadías visibles.';
  }

  return 'Todavía no hay reseñas de anfitriones para mostrar.';
};

export const getGuestRequestProfileOperationEmptyMessage = (profile: GuestRequestProfile) => {
  if (getGuestRequestProfileScenario(profile) === 'new-guest') {
    return 'Todavía no hay movimientos visibles para revisar en esta operación.';
  }

  return 'Todavía no hay movimientos registrados para esta operación.';
};

const createEmptyGuestRequestProfile = (): GuestRequestProfile => {
  const dataAvailability = createDataAvailability();
  const verification = buildGuestVerificationModel({});

  return {
    identityVerified: false,
    platformHistory: {
      completedStays: 0,
      conflictsCount: 0,
      cancellationsCount: 0,
    },
    interactionHistory: {
      completedStays: 0,
      feedbackCount: 0,
      agreementsKeptCount: 0,
      wouldInteractAgainCount: 0,
      incidentsCount: 0,
      publicSignals: [],
    },
    hostReviews: [],
    profileCompletion: {
      profileComplete: false,
      photoUploaded: false,
      basicDetailsComplete: false,
    },
    verificationSummary: verification.verificationSummary,
    verificationScore: verification.verificationScore,
    verificationItems: verification.verificationItems,
    identityVerification: verification.identityVerification,
    operationSignals: [],
    memberSince: '',
    dataAvailability,
    dataSource: getDataSource(dataAvailability),
  };
};

const normalizeHostReviews = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as GuestHostReviewSnippet[];
  }

  return value.slice(0, 3).map((review, index) => {
    const candidate = (review && typeof review === 'object' ? review : {}) as Partial<GuestHostReviewSnippet>;

    return {
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `guest-review-${index}`,
      authorName: typeof candidate.authorName === 'string' && candidate.authorName.trim() ? candidate.authorName : 'Anfitrión',
      date: typeof candidate.date === 'string' && candidate.date.trim() ? candidate.date : '',
      comment: typeof candidate.comment === 'string' && candidate.comment.trim() ? candidate.comment : 'Sin comentario cargado.',
    };
  });
};

const normalizeOperationSignals = (value: unknown, profileCompletion?: Partial<GuestProfileCompletion> | null) => {
  if (!Array.isArray(value)) {
    return [] as GuestOperationSignal[];
  }

  const providedSignals = new Map<string, Partial<GuestOperationSignal>>();

  value.forEach((signal) => {
    const candidate = (signal && typeof signal === 'object' ? signal : {}) as Partial<GuestOperationSignal>;
    const signalId = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : null;

    if (!signalId) {
      return;
    }

    providedSignals.set(signalId, candidate);
  });

  return canonicalOperationSignals.map((definition) => {
    const candidate = providedSignals.get(definition.id);

    if (candidate) {
      return {
        id: definition.id,
        label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label : definition.label,
        active: typeof candidate.active === 'boolean'
          ? candidate.active
          : definition.id === 'completed-profile'
            ? isCompletedProfileSignalActive(profileCompletion)
            : false,
        source: isOperationSignalSource(candidate.source) ? candidate.source : definition.source,
      };
    }

    return {
      id: definition.id,
      label: definition.label,
      active: definition.id === 'completed-profile' ? isCompletedProfileSignalActive(profileCompletion) : false,
      source: definition.source,
    };
  });
};

const getSafeCount = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(0, Math.round(numericValue));
};

const normalizeInteractionSignals = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as GuestInteractionHistory['publicSignals'];
  }

  const signals: GuestInteractionHistory['publicSignals'] = [];

  value.forEach((signal, index) => {
    const candidate = (signal && typeof signal === 'object' ? signal : {}) as Partial<GuestInteractionHistory['publicSignals'][number]>;
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';

    if (!label) {
      return;
    }

    signals.push({
      key: typeof candidate.key === 'string' && candidate.key.trim() ? candidate.key : `interaction-signal-${index}`,
      label,
      tone: candidate.tone === 'positive' ? 'positive' : 'neutral',
      ...(typeof candidate.detail === 'string' && candidate.detail.trim() ? { detail: candidate.detail } : {}),
    });
  });

  return signals;
};

const normalizeInteractionHistory = (value: unknown, completedStays: number): GuestInteractionHistory => {
  if (!isObject(value)) {
    return {
      completedStays,
      feedbackCount: 0,
      agreementsKeptCount: 0,
      wouldInteractAgainCount: 0,
      incidentsCount: 0,
      publicSignals: [],
    };
  }

  return {
    completedStays: getSafeCount(value.completedStays, completedStays),
    feedbackCount: getSafeCount(value.feedbackCount),
    agreementsKeptCount: getSafeCount(value.agreementsKeptCount),
    wouldInteractAgainCount: getSafeCount(value.wouldInteractAgainCount),
    incidentsCount: getSafeCount(value.incidentsCount),
    publicSignals: normalizeInteractionSignals(value.publicSignals),
  };
};

export const resolveGuestRequestProfile = (source: GuestRequestProfileSource, _index = 0): GuestRequestProfile => {
  const providedProfile = source.guestProfile;
  const emptyProfile = createEmptyGuestRequestProfile();

  if (!isObject(providedProfile)) {
    return emptyProfile;
  }

  const platformHistory = isObject(providedProfile.platformHistory) ? providedProfile.platformHistory : null;
  const profileCompletion = isObject(providedProfile.profileCompletion) ? providedProfile.profileCompletion : null;

  const dataAvailability = createDataAvailability({
    identity: hasOwn(providedProfile, 'identityVerified') && typeof providedProfile.identityVerified === 'boolean',
    platformHistory: !!platformHistory && ['completedStays', 'conflictsCount', 'cancellationsCount'].some(
      (key) => typeof platformHistory[key] === 'number',
    ),
    hostReviews: Array.isArray(providedProfile.hostReviews),
    profileCompletion: !!profileCompletion && ['profileComplete', 'photoUploaded', 'basicDetailsComplete'].some(
      (key) => typeof profileCompletion[key] === 'boolean',
    ),
    operationSignals: Array.isArray(providedProfile.operationSignals),
    memberSince: typeof providedProfile.memberSince === 'string' && providedProfile.memberSince.trim().length > 0,
  });

  const normalizedProfileCompletion = {
    profileComplete: typeof profileCompletion?.profileComplete === 'boolean'
      ? profileCompletion.profileComplete
      : emptyProfile.profileCompletion.profileComplete,
    photoUploaded: typeof profileCompletion?.photoUploaded === 'boolean'
      ? profileCompletion.photoUploaded
      : emptyProfile.profileCompletion.photoUploaded,
    basicDetailsComplete: typeof profileCompletion?.basicDetailsComplete === 'boolean'
      ? profileCompletion.basicDetailsComplete
      : emptyProfile.profileCompletion.basicDetailsComplete,
  };
  const normalizedHostReviews = normalizeHostReviews(providedProfile.hostReviews);
  const normalizedOperationSignals = normalizeOperationSignals(providedProfile.operationSignals, normalizedProfileCompletion);
  const normalizedPlatformHistory = {
    completedStays: getSafeCount(platformHistory?.completedStays, emptyProfile.platformHistory.completedStays),
    conflictsCount: getSafeCount(platformHistory?.conflictsCount, emptyProfile.platformHistory.conflictsCount),
    cancellationsCount: getSafeCount(platformHistory?.cancellationsCount, emptyProfile.platformHistory.cancellationsCount),
  };
  const normalizedInteractionHistory = normalizeInteractionHistory(providedProfile.interactionHistory, normalizedPlatformHistory.completedStays);
  const identityVerified = dataAvailability.identity && typeof providedProfile.identityVerified === 'boolean'
    ? providedProfile.identityVerified
    : emptyProfile.identityVerified;
  const providedIdentityVerification = isObject(providedProfile.identityVerification)
    ? providedProfile.identityVerification
    : null;
  const verification = buildGuestVerificationModel({
    verificationSummary: (typeof providedProfile.verificationSummary === 'object' && providedProfile.verificationSummary !== null)
      ? providedProfile.verificationSummary
      : null,
    profileComplete: normalizedProfileCompletion.profileComplete,
    photoUploaded: normalizedProfileCompletion.photoUploaded,
    basicDetailsComplete: normalizedProfileCompletion.basicDetailsComplete,
    completedStays: normalizedPlatformHistory.completedStays,
    hostReviewsCount: normalizedHostReviews.length,
    activitySignalsCount: normalizedOperationSignals.filter((signal) => signal.active && signal.source !== 'derived').length,
    documentaryVerified: identityVerified,
    identityVerificationStatus: typeof providedIdentityVerification?.status === 'string'
      ? providedIdentityVerification.status
      : null,
    identityVerificationProvider: typeof providedIdentityVerification?.provider === 'string'
      ? providedIdentityVerification.provider
      : null,
    identityVerifiedAt: typeof providedIdentityVerification?.verifiedAt === 'string'
      ? providedIdentityVerification.verifiedAt
      : null,
  });

  return {
    identityVerified,
    platformHistory: normalizedPlatformHistory,
    interactionHistory: normalizedInteractionHistory,
    hostReviews: normalizedHostReviews,
    profileCompletion: normalizedProfileCompletion,
    verificationSummary: verification.verificationSummary,
    verificationScore: verification.verificationScore,
    verificationItems: verification.verificationItems,
    identityVerification: verification.identityVerification,
    operationSignals: normalizedOperationSignals,
    memberSince: dataAvailability.memberSince && typeof providedProfile.memberSince === 'string' && providedProfile.memberSince.trim()
      ? providedProfile.memberSince
      : emptyProfile.memberSince,
    dataAvailability,
    dataSource: getDataSource(dataAvailability),
  };
};

export const formatGuestMemberSinceYear = (value: string) => {
  if (!value.trim()) {
    return '';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', { year: 'numeric' }).format(parsedDate);
};

export const getGuestSnapshotTitle = (profile: GuestRequestProfile) => {
  const scenario = getGuestRequestProfileScenario(profile);

  if (scenario === 'sync-pending') {
    return 'Ficha en preparación';
  }

  if (scenario === 'new-guest') {
    return 'Cuenta sin historial todavía';
  }

  if (scenario === 'partial-profile') {
    if (profile.dataAvailability.identity) {
      return profile.identityVerified ? 'Identidad confirmada' : 'Identidad pendiente';
    }

    return 'Faltan bloques por completar';
  }

  if (profile.dataAvailability.identity) {
    return profile.identityVerified ? 'Identidad confirmada' : 'Identidad pendiente';
  }

  if (profile.dataAvailability.platformHistory && profile.platformHistory.completedStays > 1) {
    return 'Con historial en la plataforma';
  }

  return 'Ficha inicial';
};

export const getGuestSnapshotDetail = (profile: GuestRequestProfile) => {
  const scenario = getGuestRequestProfileScenario(profile);

  if (scenario === 'sync-pending') {
    return 'Todavía estamos cargando sus primeros datos';
  }

  if (scenario === 'new-guest') {
    return 'Todavía no hay estadías ni reseñas para revisar';
  }

  if (scenario === 'partial-profile') {
    return 'Ya hay datos visibles, pero faltan otros bloques.';
  }

  if (profile.dataAvailability.platformHistory && profile.platformHistory.completedStays > 1) {
    return `${profile.platformHistory.completedStays} estadías completadas`;
  }

  if (profile.dataAvailability.memberSince && profile.memberSince.trim()) {
    return `Usuario desde ${formatGuestMemberSinceYear(profile.memberSince)}`;
  }

  if (profile.dataAvailability.hostReviews && profile.hostReviews.length > 0) {
    return `${profile.hostReviews.length} ${profile.hostReviews.length === 1 ? 'reseña' : 'reseñas'} de anfitriones`;
  }

  if (profile.dataAvailability.profileCompletion) {
    return 'Información inicial disponible';
  }

  return 'Información inicial disponible';
};