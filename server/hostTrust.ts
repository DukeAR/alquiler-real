export type HostTrustLevel = 'low' | 'medium' | 'high';

export type HostTrustStatus = 'complete' | 'pending';

export type HostTrustItemKey = 'identity' | 'onsite' | 'response' | 'operations' | 'tenure';

export type HostTrustInternalFactorKey = 'identity' | 'onsite' | 'operations' | 'response' | 'reviews' | 'reports' | 'cancellations';

export interface HostTrustItem {
  key: HostTrustItemKey;
  label: string;
  description: string;
  status: HostTrustStatus;
}

export interface HostTrustInternalFactor {
  key: HostTrustInternalFactorKey;
  label: string;
  description: string;
  value: number;
  direction: 'positive' | 'negative';
}

export interface HostTrustInternalRanking {
  score: number;
  factors: HostTrustInternalFactor[];
}

type HostTrustSource = {
  identityValidated?: boolean;
  hasPresencialVerification?: boolean;
  hostCompletedReservationsCount?: number;
  hostGuestReviewsCount?: number;
  hostGuestFeedbackCount?: number;
  hostGuestAgreementsKeptCount?: number;
  hostGuestWouldInteractAgainCount?: number;
  hostGuestIncidentsCount?: number;
  hostAverageResponseTimeMinutes?: number;
  confirmedReportsCount?: number;
  confirmedSevereReportsCount?: number;
  hostCancellationsCount?: number;
  hostMemberSince?: string;
  hostSince?: string;
};

export const HOST_TRUST_SCORE_MAX = 5;

export const HOST_TRUST_COMPLETED_RESERVATIONS_MIN = 3;

export const HOST_TRUST_TENURE_MONTHS_MIN = 12;

export const HOST_TRUST_FAST_RESPONSE_MINUTES_MAX = 180;

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

const formatCountLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

const getHostTrustLevel = (score: number): HostTrustLevel => {
  if (score >= HOST_TRUST_SCORE_MAX - 1) {
    return 'high';
  }

  if (score >= 2) {
    return 'medium';
  }

  return 'low';
};

const formatOperationsLabel = (count: number) => {
  if (count <= 0) {
    return 'Sin operaciones completadas';
  }

  return formatCountLabel(count, 'operación completada', 'operaciones completadas');
};

const formatOperationsDescription = (count: number) => {
  if (count <= 0) {
    return 'Todavía no registra operaciones completadas dentro de la plataforma.';
  }

  return `${formatCountLabel(count, 'operación completada', 'operaciones completadas')} dentro de la plataforma.`;
};

const formatResponseTimeLabel = (minutes: number) => {
  if (minutes <= 0) {
    return 'Sin historial de respuesta';
  }

  if (minutes < 60) {
    return `Responde en ~${Math.max(1, Math.round(minutes))} min`;
  }

  if (minutes < 24 * 60) {
    const roundedHours = Math.max(1, Math.round((minutes / 60) * 10) / 10);
    return `Responde en ~${roundedHours} h`;
  }

  const dayCount = Math.max(1, Math.round(minutes / (24 * 60)));
  return `Responde en ~${dayCount} día${dayCount === 1 ? '' : 's'}`;
};

const formatResponseTimeDescription = (minutes: number) => {
  if (minutes <= 0) {
    return 'Todavía no hay suficiente historial de respuesta para resumir este dato.';
  }

  const label = formatResponseTimeLabel(minutes);
  return `Promedio de primera respuesta visible: ${label.replace('Responde en ', '')}.`;
};

const formatTenureLabel = (monthsOnPlatform: number | null) => {
  if (monthsOnPlatform === null) {
    return 'Antigüedad sin historial';
  }

  if (monthsOnPlatform < 1) {
    return 'Hace menos de un mes en la plataforma';
  }

  if (monthsOnPlatform >= 12) {
    const yearsOnPlatform = Math.max(1, Math.floor(monthsOnPlatform / 12));
    return `${yearsOnPlatform} ${yearsOnPlatform === 1 ? 'año' : 'años'} en la plataforma`;
  }

  return `${monthsOnPlatform} ${monthsOnPlatform === 1 ? 'mes' : 'meses'} en la plataforma`;
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

const clampInternalScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const buildInternalFactor = (
  key: HostTrustInternalFactorKey,
  label: string,
  description: string,
  value: number,
): HostTrustInternalFactor => ({
  key,
  label,
  description,
  value,
  direction: value >= 0 ? 'positive' : 'negative',
});

const getReviewContribution = (params: {
  guestReviewsCount: number;
  feedbackCount: number;
  agreementsKeptCount: number;
  wouldInteractAgainCount: number;
  incidentsCount: number;
}) => {
  let contribution = 0;

  if (params.guestReviewsCount >= 5) {
    contribution += 6;
  } else if (params.guestReviewsCount >= 2) {
    contribution += 4;
  } else if (params.guestReviewsCount === 1) {
    contribution += 2;
  }

  if (params.feedbackCount > 0) {
    const agreementsRate = params.agreementsKeptCount / params.feedbackCount;
    const returnRate = params.wouldInteractAgainCount / params.feedbackCount;

    if (agreementsRate >= 0.8) {
      contribution += 4;
    } else if (agreementsRate >= 0.6) {
      contribution += 2;
    }

    if (returnRate >= 0.8) {
      contribution += 4;
    } else if (returnRate >= 0.6) {
      contribution += 2;
    }

    if (params.incidentsCount === 0 && params.feedbackCount >= 2) {
      contribution += 2;
    }
  }

  contribution -= Math.min(params.incidentsCount * 4, 12);

  return Math.max(-12, Math.min(16, contribution));
};

export const buildHostTrustInternalRanking = (host: HostTrustSource): HostTrustInternalRanking => {
  const completedReservationsCount = toSafeInteger(host.hostCompletedReservationsCount);
  const guestReviewsCount = toSafeInteger(host.hostGuestReviewsCount);
  const feedbackCount = toSafeInteger(host.hostGuestFeedbackCount);
  const agreementsKeptCount = toSafeInteger(host.hostGuestAgreementsKeptCount);
  const wouldInteractAgainCount = toSafeInteger(host.hostGuestWouldInteractAgainCount);
  const incidentsCount = toSafeInteger(host.hostGuestIncidentsCount);
  const averageResponseTimeMinutes = toSafeInteger(host.hostAverageResponseTimeMinutes);
  const confirmedReportsCount = toSafeInteger(host.confirmedReportsCount);
  const confirmedSevereReportsCount = toSafeInteger(host.confirmedSevereReportsCount);
  const hostCancellationsCount = toSafeInteger(host.hostCancellationsCount);

  const identityContribution = host.identityValidated ? 12 : 0;
  const onsiteContribution = host.hasPresencialVerification ? 10 : 0;
  const operationsContribution = Math.min(completedReservationsCount, 10) * 2;
  const responseContribution = averageResponseTimeMinutes <= 0
    ? 0
    : averageResponseTimeMinutes <= 30
      ? 12
      : averageResponseTimeMinutes <= 60
        ? 10
        : averageResponseTimeMinutes <= HOST_TRUST_FAST_RESPONSE_MINUTES_MAX
          ? 6
          : averageResponseTimeMinutes <= 360
            ? 2
            : -8;
  const reviewsContribution = getReviewContribution({
    guestReviewsCount,
    feedbackCount,
    agreementsKeptCount,
    wouldInteractAgainCount,
    incidentsCount,
  });
  const reportsPenalty = Math.min((confirmedReportsCount * 10) + (confirmedSevereReportsCount * 8), 38);
  const cancellationsPenalty = Math.min(hostCancellationsCount * 8, 24);

  const factors: HostTrustInternalFactor[] = [
    buildInternalFactor(
      'identity',
      'Identidad validada',
      host.identityValidated
        ? 'La cuenta ya tiene identidad validada dentro de la plataforma.'
        : 'La cuenta todavía no sumó validación de identidad.',
      identityContribution,
    ),
    buildInternalFactor(
      'onsite',
      'Verificación presencial',
      host.hasPresencialVerification
        ? 'Ya existe al menos una verificación presencial asociada al anfitrión.'
        : 'Todavía no hay una verificación presencial asociada al anfitrión.',
      onsiteContribution,
    ),
    buildInternalFactor(
      'operations',
      'Operaciones completadas',
      completedReservationsCount > 0
        ? `${formatCountLabel(completedReservationsCount, 'operación completada', 'operaciones completadas')} dentro de la plataforma.`
        : 'Todavía no hay operaciones completadas para ponderar.',
      operationsContribution,
    ),
    buildInternalFactor(
      'response',
      'Velocidad de respuesta',
      averageResponseTimeMinutes > 0
        ? `Promedio de primera respuesta visible: ${formatResponseTimeLabel(averageResponseTimeMinutes).replace('Responde en ', '')}.`
        : 'Todavía no hay suficiente historial de respuesta.',
      responseContribution,
    ),
    buildInternalFactor(
      'reviews',
      'Reseñas operativas',
      feedbackCount > 0
        ? `${formatCountLabel(feedbackCount, 'cierre compartido', 'cierres compartidos')} con ${incidentsCount === 0 ? 'sin incidentes reportados' : `${formatCountLabel(incidentsCount, 'incidente', 'incidentes')} reportados`}.`
        : 'Todavía no hay suficientes cierres compartidos para evaluar consistencia.',
      reviewsContribution,
    ),
    buildInternalFactor(
      'reports',
      'Reportes confirmados',
      confirmedReportsCount > 0
        ? `${formatCountLabel(confirmedReportsCount, 'reporte confirmado', 'reportes confirmados')} y ${formatCountLabel(confirmedSevereReportsCount, 'reporte grave', 'reportes graves')} en seguimiento interno.`
        : 'No hay reportes confirmados asociados a este aviso en el contexto actual.',
      reportsPenalty * -1,
    ),
    buildInternalFactor(
      'cancellations',
      'Cancelaciones del anfitrión',
      hostCancellationsCount > 0
        ? `${formatCountLabel(hostCancellationsCount, 'cancelación a cargo del anfitrión', 'cancelaciones a cargo del anfitrión')}.`
        : 'No registra cancelaciones a cargo del anfitrión.',
      cancellationsPenalty * -1,
    ),
  ];

  const score = clampInternalScore(
    35
    + identityContribution
    + onsiteContribution
    + operationsContribution
    + responseContribution
    + reviewsContribution
    - reportsPenalty
    - cancellationsPenalty,
  );

  return {
    score,
    factors,
  };
};

export const buildHostTrust = (host: HostTrustSource) => {
  const completedReservationsCount = toSafeInteger(host.hostCompletedReservationsCount);
  const averageResponseTimeMinutes = toSafeInteger(host.hostAverageResponseTimeMinutes);
  const monthsOnPlatform = getElapsedMonths(host.hostMemberSince || host.hostSince);

  const items: HostTrustItem[] = [
    {
      key: 'identity',
      label: 'Identidad validada',
      description: host.identityValidated ? 'La identidad del anfitrión ya fue validada.' : 'Todavía falta validar la identidad del anfitrión.',
      status: host.identityValidated ? 'complete' : 'pending',
    },
    {
      key: 'onsite',
      label: 'Verificación presencial',
      description: host.hasPresencialVerification
        ? 'Ya hay una verificación presencial registrada para este anfitrión.'
        : 'Todavía no hay una verificación presencial registrada.',
      status: host.hasPresencialVerification ? 'complete' : 'pending',
    },
    {
      key: 'response',
      label: averageResponseTimeMinutes > 0 ? formatResponseTimeLabel(averageResponseTimeMinutes) : 'Sin historial de respuesta',
      description: formatResponseTimeDescription(averageResponseTimeMinutes),
      status: averageResponseTimeMinutes > 0 && averageResponseTimeMinutes <= HOST_TRUST_FAST_RESPONSE_MINUTES_MAX ? 'complete' : 'pending',
    },
    {
      key: 'operations',
      label: formatOperationsLabel(completedReservationsCount),
      description: formatOperationsDescription(completedReservationsCount),
      status: completedReservationsCount >= HOST_TRUST_COMPLETED_RESERVATIONS_MIN ? 'complete' : 'pending',
    },
    {
      key: 'tenure',
      label: formatTenureLabel(monthsOnPlatform),
      description: formatTenureDescription(monthsOnPlatform),
      status: monthsOnPlatform !== null && monthsOnPlatform >= HOST_TRUST_TENURE_MONTHS_MIN ? 'complete' : 'pending',
    },
  ];

  const score = items.filter((item) => item.status === 'complete').length;

  return {
    hostTrust: {
      score,
      level: getHostTrustLevel(score),
      items,
    },
  };
};