const clampCount = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);

const VERIFICATION_LEVEL_LABELS: Record<number, string> = {
  0: 'Muy baja',
  1: 'Muy baja',
  2: 'Baja',
  3: 'Media',
  4: 'Alta',
  5: 'Muy alta',
};

const VERIFICATION_LEVEL_SUMMARY_LABELS: Record<number, string> = {
  0: 'Nivel muy bajo',
  1: 'Nivel muy bajo',
  2: 'Nivel bajo',
  3: 'Nivel medio',
  4: 'Nivel alto',
  5: 'Nivel muy alto',
};

export type VerificationIdentityTone = 'high' | 'medium' | 'low';

export const getNormalizedVerificationLevelScore = (score: number, maxScore = 5) => {
  const safeMaxScore = Math.max(1, clampCount(maxScore));
  const safeScore = Math.min(clampCount(score), safeMaxScore);

  if (safeMaxScore === 5) {
    return safeScore;
  }

  return Math.round((safeScore / safeMaxScore) * 5);
};

export const getVerificationLevelLabel = (score: number, maxScore = 5) => (
  VERIFICATION_LEVEL_LABELS[getNormalizedVerificationLevelScore(score, maxScore)] || 'Muy baja'
);

export const getVerificationIdentityTone = (score: number, maxScore = 5): VerificationIdentityTone => {
  const normalizedLevel = getNormalizedVerificationLevelScore(score, maxScore);

  if (normalizedLevel >= 4) {
    return 'high';
  }

  if (normalizedLevel >= 3) {
    return 'medium';
  }

  return 'low';
};

export const getVerificationCountLabel = (score: number, maxScore = 5) => {
  const safeMaxScore = Math.max(1, clampCount(maxScore));
  const safeScore = Math.min(clampCount(score), safeMaxScore);

  return `${safeScore}/${safeMaxScore}`;
};

export const getVerificationIdentityLabel = (
  score: number,
  maxScore = 5,
  options?: { includeCount?: boolean },
) => {
  const levelLabel = getVerificationLevelLabel(score, maxScore);
  const baseLabel = levelLabel === 'Media'
    ? 'Confianza media'
    : `${levelLabel} confianza`;

  if (options?.includeCount === false) {
    return baseLabel;
  }

  return `${baseLabel} (${getVerificationCountLabel(score, maxScore)})`;
};

export const getVerificationLevelSummaryLabel = (
  score: number,
  maxScore = 5,
  options?: { includeCount?: boolean },
) => {
  const baseLabel = VERIFICATION_LEVEL_SUMMARY_LABELS[getNormalizedVerificationLevelScore(score, maxScore)] || 'Nivel muy bajo';

  if (options?.includeCount === false) {
    return baseLabel;
  }

  return `${baseLabel} (${getVerificationCountLabel(score, maxScore)})`;
};