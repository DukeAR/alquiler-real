export const HOST_TRUST_SCORE_MAX = 5;

export type HostTrustLevel = 'low' | 'medium' | 'high';

export type HostTrustStatus = 'complete' | 'pending';

export interface HostTrustItem {
  key: string;
  label: string;
  description: string;
  status: HostTrustStatus;
}

export interface HostTrustSummary {
  score: number;
  level: HostTrustLevel;
  items: HostTrustItem[];
}

type HostTrustLike = {
  hostTrust?: Partial<HostTrustSummary> & {
    items?: Array<Partial<HostTrustItem>>;
  };
};

const clampHostTrustSummaryScore = (score: number) => {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(HOST_TRUST_SCORE_MAX, Math.round(score)));
};

const getHostTrustLevelFromScore = (score: number): HostTrustLevel => {
  if (score >= HOST_TRUST_SCORE_MAX - 1) {
    return 'high';
  }

  if (score >= 2) {
    return 'medium';
  }

  return 'low';
};

const normalizeHostTrustStatus = (status?: HostTrustStatus): HostTrustStatus => (
  status === 'complete' ? 'complete' : 'pending'
);

const normalizeHostTrustLevel = (level?: HostTrustLevel): HostTrustLevel | null => {
  if (level === 'high' || level === 'medium' || level === 'low') {
    return level;
  }

  return null;
};

export const getHostTrust = (property: HostTrustLike): HostTrustSummary => {
  const items = Array.isArray(property.hostTrust?.items)
    ? property.hostTrust.items.map((item, index) => ({
        key: item.key || `item-${index + 1}`,
        label: item.label || 'Confianza del anfitrión',
        description: item.description || '',
        status: normalizeHostTrustStatus(item.status),
      }))
    : [];

  const fallbackScore = items.filter((item) => item.status === 'complete').length;
  const score = clampHostTrustSummaryScore(
    typeof property.hostTrust?.score === 'number'
      ? property.hostTrust.score
      : fallbackScore,
  );

  return {
    score,
    level: normalizeHostTrustLevel(property.hostTrust?.level) || getHostTrustLevelFromScore(score),
    items,
  };
};

export const getHostTrustLevelLabel = (level: HostTrustLevel) => {
  if (level === 'high') {
    return 'Alto';
  }

  if (level === 'medium') {
    return 'Medio';
  }

  return 'Bajo';
};

export const hasHighHostTrust = (property: HostTrustLike) => getHostTrust(property).level === 'high';