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
  if (!profile.dataAvailability.anyStructuredData) {
    return 'Datos en preparación';
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
  if (!profile.dataAvailability.anyStructuredData) {
    return 'Todavía sin datos estructurados';
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