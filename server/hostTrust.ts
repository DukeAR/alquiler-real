export type HostTrustLevel = 'low' | 'medium' | 'high';

export type HostTrustStatus = 'complete' | 'pending';

export type HostTrustItemKey = 'identity' | 'reservations' | 'reviews' | 'tenure';

export interface HostTrustItem {
  key: HostTrustItemKey;
  label: string;
  description: string;
  status: HostTrustStatus;
}

type HostTrustSource = {
  identityValidated?: boolean;
  hostCompletedReservationsCount?: number;
  hostGuestReviewsCount?: number;
  hostMemberSince?: string;
  hostSince?: string;
};

export const HOST_TRUST_SCORE_MAX = 4;

export const HOST_TRUST_COMPLETED_RESERVATIONS_MIN = 3;

export const HOST_TRUST_GUEST_REVIEWS_MIN = 2;

export const HOST_TRUST_TENURE_MONTHS_MIN = 12;

const toSafeInteger = (value: unknown, fallback = 0) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.round(numericValue)) : fallback;
};

const parseDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getElapsedMonths = (value?: string) => {
  const parsed = parseDate(value);

  if (!parsed) {
    return null;
  }

  const now = new Date();
  let months = (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());

  if (now.getDate() < parsed.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
};

const getHostTrustLevel = (score: number): HostTrustLevel => {
  if (score >= HOST_TRUST_SCORE_MAX) {
    return 'high';
  }

  if (score >= 2) {
    return 'medium';
  }

  return 'low';
};

const formatReservationsDescription = (count: number) => {
  if (count <= 0) {
    return 'Todavía no registra reservas completadas.';
  }

  return `${count} ${count === 1 ? 'reserva completada' : 'reservas completadas'}.`;
};

const formatGuestReviewsDescription = (count: number) => {
  if (count <= 0) {
    return 'Todavía no recibió reseñas de huéspedes.';
  }

  return `${count} ${count === 1 ? 'reseña de huéspedes' : 'reseñas de huéspedes'}.`;
};

const formatTenureDescription = (monthsOnPlatform: number | null) => {
  if (monthsOnPlatform === null) {
    return 'Todavía no hay antigüedad suficiente para evaluarlo.';
  }

  if (monthsOnPlatform < 1) {
    return 'Se sumó hace menos de un mes.';
  }

  if (monthsOnPlatform >= 12) {
    const yearsOnPlatform = Math.max(1, Math.floor(monthsOnPlatform / 12));
    return `${yearsOnPlatform} ${yearsOnPlatform === 1 ? 'año' : 'años'} en la plataforma.`;
  }

  return `${monthsOnPlatform} ${monthsOnPlatform === 1 ? 'mes' : 'meses'} en la plataforma.`;
};

export const buildHostTrust = (host: HostTrustSource) => {
  const completedReservationsCount = toSafeInteger(host.hostCompletedReservationsCount);
  const guestReviewsCount = toSafeInteger(host.hostGuestReviewsCount);
  const monthsOnPlatform = getElapsedMonths(host.hostMemberSince || host.hostSince);

  const items: HostTrustItem[] = [
    {
      key: 'identity',
      label: 'Identidad confirmada',
      description: host.identityValidated ? 'Identidad ya confirmada.' : 'Todavía falta confirmar identidad.',
      status: host.identityValidated ? 'complete' : 'pending',
    },
    {
      key: 'reservations',
      label: 'Historial de reservas',
      description: formatReservationsDescription(completedReservationsCount),
      status: completedReservationsCount >= HOST_TRUST_COMPLETED_RESERVATIONS_MIN ? 'complete' : 'pending',
    },
    {
      key: 'reviews',
      label: 'Reseñas de huéspedes',
      description: formatGuestReviewsDescription(guestReviewsCount),
      status: guestReviewsCount >= HOST_TRUST_GUEST_REVIEWS_MIN ? 'complete' : 'pending',
    },
    {
      key: 'tenure',
      label: 'Antigüedad en la plataforma',
      description: formatTenureDescription(monthsOnPlatform),
      status: monthsOnPlatform !== null && monthsOnPlatform >= HOST_TRUST_TENURE_MONTHS_MIN ? 'complete' : 'pending',
    },
  ];

  const score = items.filter((item) => item.status === 'complete').length;

  return {
    hostTrustScore: score,
    hostTrust: {
      score,
      level: getHostTrustLevel(score),
      items,
    },
  };
};