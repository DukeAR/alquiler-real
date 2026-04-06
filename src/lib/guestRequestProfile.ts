import type {
  GuestHostReviewSnippet,
  GuestOperationSignal,
  GuestRequestProfile,
  GuestRequestProfileDataAvailability,
  GuestRequestProfileDataSource,
} from '../types';

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

const hasOwn = <T extends object>(value: T, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

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
  profile.dataAvailability.operationSignals && profile.operationSignals.some((signal) => signal.active)
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
    if (section === 'operationSignals') return 'Lo que hizo dentro de esta solicitud va a aparecer acá cuando quede registrado.';
    return 'La antigüedad de la cuenta va a aparecer acá cuando quede disponible.';
  }

  if (scenario === 'new-guest') {
    if (section === 'identity') return 'Todavía no figura una validación de identidad para mostrar.';
    if (section === 'platformHistory') return 'Todavía no hay estadías previas o cancelaciones para revisar.';
    if (section === 'hostReviews') return 'Todavía no hay reseñas de anfitriones porque esta cuenta todavía no tiene estadías visibles.';
    if (section === 'profileCompletion') return 'Todavía no hay suficientes datos cargados para resumir el perfil.';
    if (section === 'operationSignals') return 'Esta solicitud todavía no dejó movimientos para revisar dentro de la plataforma.';
    return 'La fecha de alta de la cuenta todavía no aparece en la ficha.';
  }

  if (section === 'identity') return 'La validación de identidad todavía no figura cargada en esta ficha.';
  if (section === 'platformHistory') return 'Todavía falta cargar el historial de estadías y cancelaciones.';
  if (section === 'hostReviews') return 'Todavía no aparecen reseñas de anfitriones en esta ficha.';
  if (section === 'profileCompletion') return 'Todavía faltan datos para resumir el perfil.';
  if (section === 'operationSignals') return 'Todavía no aparecen movimientos de esta solicitud dentro de la plataforma.';
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
    return 'Esta solicitud todavía no dejó movimientos para revisar dentro de la plataforma.';
  }

  return 'Todavía no hay movimientos registrados para esta solicitud.';
};

const createEmptyGuestRequestProfile = (): GuestRequestProfile => {
  const dataAvailability = createDataAvailability();

  return {
    identityVerified: false,
    platformHistory: {
      completedStays: 0,
      conflictsCount: 0,
      cancellationsCount: 0,
    },
    hostReviews: [],
    profileCompletion: {
      profileComplete: false,
      photoUploaded: false,
      basicDetailsComplete: false,
    },
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

const normalizeOperationSignals = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as GuestOperationSignal[];
  }

  return value.slice(0, 3).map((signal, index) => {
    const candidate = (signal && typeof signal === 'object' ? signal : {}) as Partial<GuestOperationSignal>;

    return {
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `guest-signal-${index}`,
      label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label : 'Señal disponible',
      active: typeof candidate.active === 'boolean' ? candidate.active : false,
    };
  });
};

const getSafeCount = (value: unknown, fallback = 0) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
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

  return {
    identityVerified: dataAvailability.identity && typeof providedProfile.identityVerified === 'boolean'
      ? providedProfile.identityVerified
      : emptyProfile.identityVerified,
    platformHistory: {
      completedStays: getSafeCount(platformHistory?.completedStays, emptyProfile.platformHistory.completedStays),
      conflictsCount: getSafeCount(platformHistory?.conflictsCount, emptyProfile.platformHistory.conflictsCount),
      cancellationsCount: getSafeCount(platformHistory?.cancellationsCount, emptyProfile.platformHistory.cancellationsCount),
    },
    hostReviews: normalizeHostReviews(providedProfile.hostReviews),
    profileCompletion: {
      profileComplete: typeof profileCompletion?.profileComplete === 'boolean'
        ? profileCompletion.profileComplete
        : emptyProfile.profileCompletion.profileComplete,
      photoUploaded: typeof profileCompletion?.photoUploaded === 'boolean'
        ? profileCompletion.photoUploaded
        : emptyProfile.profileCompletion.photoUploaded,
      basicDetailsComplete: typeof profileCompletion?.basicDetailsComplete === 'boolean'
        ? profileCompletion.basicDetailsComplete
        : emptyProfile.profileCompletion.basicDetailsComplete,
    },
    operationSignals: normalizeOperationSignals(providedProfile.operationSignals),
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