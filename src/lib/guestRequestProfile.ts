import type { GuestHostReviewSnippet, GuestOperationSignal, GuestRequestProfile } from '../types';

type GuestRequestProfileSource = {
  id?: string;
  userId?: string;
  userName?: string;
  status?: string;
  guestProfile?: Partial<GuestRequestProfile> | null;
};

const hostReviewCommentPool = [
  'La coordinación fue clara y mantuvo buena comunicación durante toda la reserva.',
  'Llegó con los datos completos y respetó lo acordado para la estadía.',
  'Respondió rápido y la experiencia fue ordenada desde el inicio.',
  'Avisó con tiempo los detalles de llegada y mantuvo un trato correcto.',
  'La reserva avanzó sin cambios de último momento y con buena predisposición.',
];

const hostReviewAuthorPool = ['Laura', 'Martín', 'Sofía', 'Paula', 'Federico'];

const buildSeed = (source: GuestRequestProfileSource, index: number) => {
  const baseValue = `${source.userId || source.id || source.userName || 'guest'}-${source.status || 'pending'}-${index}`;
  return Array.from(baseValue).reduce((total, char, position) => total + (char.charCodeAt(0) * (position + 1)), 0);
};

const pickValue = <T,>(values: T[], seed: number, offset = 0) => values[(seed + offset) % values.length];

const buildMockOperationSignals = (seed: number, status?: string): GuestOperationSignal[] => {
  const signals: GuestOperationSignal[] = [
    { id: 'consulted-before', label: 'Consultó antes de reservar', active: status === 'pending' || seed % 2 === 0 },
    { id: 'saved-property', label: 'Guardó la propiedad', active: seed % 3 !== 1 },
    { id: 'returned-to-view', label: 'Volvió a verla', active: status !== 'completed' || seed % 5 !== 0 },
  ];

  if (!signals.some((signal) => signal.active)) {
    signals[0] = { ...signals[0], active: true };
  }

  return signals;
};

const buildMockHostReviews = (seed: number, completedStays: number): GuestHostReviewSnippet[] => {
  const reviewCount = Math.min(3, Math.max(1, completedStays));

  return Array.from({ length: reviewCount }, (_, index) => ({
    id: `mock-review-${seed}-${index}`,
    authorName: pickValue(hostReviewAuthorPool, seed, index),
    date: `${2022 + ((seed + index) % 4)}-0${((index % 3) + 1)}-12`,
    comment: pickValue(hostReviewCommentPool, seed, index),
  }));
};

const buildMockGuestRequestProfile = (source: GuestRequestProfileSource, index: number): GuestRequestProfile => {
  const seed = buildSeed(source, index);
  const completedStays = Math.max(1, (seed % 5) + (source.status === 'completed' ? 2 : 1));
  const conflictsCount = seed % 7 === 0 ? 1 : 0;
  const cancellationsCount = seed % 6 === 0 ? 1 : 0;

  return {
    identityVerified: seed % 4 !== 0,
    platformHistory: {
      completedStays,
      conflictsCount,
      cancellationsCount,
    },
    hostReviews: buildMockHostReviews(seed, completedStays),
    profileCompletion: {
      profileComplete: seed % 3 !== 0,
      photoUploaded: seed % 5 !== 0,
      basicDetailsComplete: seed % 4 !== 1,
    },
    operationSignals: buildMockOperationSignals(seed, source.status),
    memberSince: `${2020 + (seed % 5)}-0${((seed % 3) + 1)}-15`,
  };
};

const normalizeHostReviews = (value: unknown, fallback: GuestHostReviewSnippet[]) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.slice(0, 3).map((review, index) => {
    const candidate = (review && typeof review === 'object' ? review : {}) as Partial<GuestHostReviewSnippet>;
    const fallbackReview = fallback[index] || fallback[0];

    return {
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `${fallbackReview.id}-${index}`,
      authorName: typeof candidate.authorName === 'string' && candidate.authorName.trim() ? candidate.authorName : fallbackReview.authorName,
      date: typeof candidate.date === 'string' && candidate.date.trim() ? candidate.date : fallbackReview.date,
      comment: typeof candidate.comment === 'string' && candidate.comment.trim() ? candidate.comment : fallbackReview.comment,
    };
  });
};

const normalizeOperationSignals = (value: unknown, fallback: GuestOperationSignal[]) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.slice(0, 3).map((signal, index) => {
    const candidate = (signal && typeof signal === 'object' ? signal : {}) as Partial<GuestOperationSignal>;
    const fallbackSignal = fallback[index] || fallback[0];

    return {
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `${fallbackSignal.id}-${index}`,
      label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label : fallbackSignal.label,
      active: typeof candidate.active === 'boolean' ? candidate.active : fallbackSignal.active,
    };
  });
};

const getSafeCount = (value: unknown, fallback: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
};

export const resolveGuestRequestProfile = (source: GuestRequestProfileSource, index = 0): GuestRequestProfile => {
  const fallback = buildMockGuestRequestProfile(source, index);
  const providedProfile = source.guestProfile;

  if (!providedProfile) {
    return fallback;
  }

  return {
    identityVerified: typeof providedProfile.identityVerified === 'boolean' ? providedProfile.identityVerified : fallback.identityVerified,
    platformHistory: {
      completedStays: getSafeCount(providedProfile.platformHistory?.completedStays, fallback.platformHistory.completedStays),
      conflictsCount: getSafeCount(providedProfile.platformHistory?.conflictsCount, fallback.platformHistory.conflictsCount),
      cancellationsCount: getSafeCount(providedProfile.platformHistory?.cancellationsCount, fallback.platformHistory.cancellationsCount),
    },
    hostReviews: normalizeHostReviews(providedProfile.hostReviews, fallback.hostReviews),
    profileCompletion: {
      profileComplete: typeof providedProfile.profileCompletion?.profileComplete === 'boolean'
        ? providedProfile.profileCompletion.profileComplete
        : fallback.profileCompletion.profileComplete,
      photoUploaded: typeof providedProfile.profileCompletion?.photoUploaded === 'boolean'
        ? providedProfile.profileCompletion.photoUploaded
        : fallback.profileCompletion.photoUploaded,
      basicDetailsComplete: typeof providedProfile.profileCompletion?.basicDetailsComplete === 'boolean'
        ? providedProfile.profileCompletion.basicDetailsComplete
        : fallback.profileCompletion.basicDetailsComplete,
    },
    operationSignals: normalizeOperationSignals(providedProfile.operationSignals, fallback.operationSignals),
    memberSince: typeof providedProfile.memberSince === 'string' && providedProfile.memberSince.trim()
      ? providedProfile.memberSince
      : fallback.memberSince,
  };
};

export const formatGuestMemberSinceYear = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', { year: 'numeric' }).format(parsedDate);
};

export const getGuestSnapshotTitle = (profile: GuestRequestProfile) => (
  profile.identityVerified ? 'Identidad confirmada' : 'Perfil en desarrollo'
);

export const getGuestSnapshotDetail = (profile: GuestRequestProfile) => {
  if (profile.platformHistory.completedStays > 1) {
    return `${profile.platformHistory.completedStays} estadías completadas`;
  }

  return `Usuario desde ${formatGuestMemberSinceYear(profile.memberSince)}`;
};