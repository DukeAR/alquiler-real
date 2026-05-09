export type ReservationDepositStatus =
  | 'external_pending'
  | 'reported'
  | 'confirmed'
  | 'checkout_pending'
  | 'held'
  | 'guest_checkin_confirmed'
  | 'host_access_confirmed'
  | 'manual_review'
  | 'deposit_released'
  | 'refunded';

type ProtectedDepositLegacyStatus = 'review' | 'pending_confirmation' | 'released';

type DepositConfirmationSignals = {
  guestCheckinConfirmed?: unknown;
  hostAccessConfirmed?: unknown;
};

const EXTERNAL_DEPOSIT_STATUSES = [
  'external_pending',
  'reported',
  'confirmed',
] as const satisfies readonly ReservationDepositStatus[];

const PROTECTED_DEPOSIT_STATUSES = [
  'checkout_pending',
  'held',
  'guest_checkin_confirmed',
  'host_access_confirmed',
  'manual_review',
  'deposit_released',
  'refunded',
] as const satisfies readonly ReservationDepositStatus[];

const PROTECTED_DEPOSIT_SETTLED_STATUSES = [
  'held',
  'guest_checkin_confirmed',
  'host_access_confirmed',
  'manual_review',
  'deposit_released',
  'refunded',
] as const satisfies readonly ReservationDepositStatus[];

const PROTECTED_DEPOSIT_ACTIVE_ARRIVAL_STATUSES = [
  'held',
  'guest_checkin_confirmed',
  'host_access_confirmed',
] as const satisfies readonly ReservationDepositStatus[];

const PROTECTED_DEPOSIT_REVIEWABLE_STATUSES = [
  'held',
  'guest_checkin_confirmed',
  'host_access_confirmed',
  'deposit_released',
] as const satisfies readonly ReservationDepositStatus[];

const LEGACY_TO_CANONICAL_STATUS: Record<ProtectedDepositLegacyStatus, ReservationDepositStatus> = {
  review: 'manual_review',
  pending_confirmation: 'manual_review',
  released: 'deposit_released',
};

export const EXTERNAL_DEPOSIT_STATUS_SET = new Set<ReservationDepositStatus>(EXTERNAL_DEPOSIT_STATUSES);
export const PROTECTED_DEPOSIT_STATUS_SET = new Set<ReservationDepositStatus>(PROTECTED_DEPOSIT_STATUSES);
export const PROTECTED_DEPOSIT_SETTLED_STATUS_SET = new Set<ReservationDepositStatus>(PROTECTED_DEPOSIT_SETTLED_STATUSES);
export const PROTECTED_DEPOSIT_ACTIVE_ARRIVAL_STATUS_SET = new Set<ReservationDepositStatus>(PROTECTED_DEPOSIT_ACTIVE_ARRIVAL_STATUSES);
export const PROTECTED_DEPOSIT_REVIEWABLE_STATUS_SET = new Set<ReservationDepositStatus>(PROTECTED_DEPOSIT_REVIEWABLE_STATUSES);

export const normalizeReservationDepositStatus = (
  value: unknown,
  signals: DepositConfirmationSignals = {},
): ReservationDepositStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const depositStatus = value.trim();

  if (!depositStatus) {
    return null;
  }

  const guestCheckinConfirmed = Boolean(signals.guestCheckinConfirmed);
  const hostAccessConfirmed = Boolean(signals.hostAccessConfirmed);

  if (
    depositStatus === 'held'
    || depositStatus === 'guest_checkin_confirmed'
    || depositStatus === 'host_access_confirmed'
  ) {
    if (guestCheckinConfirmed && hostAccessConfirmed) {
      return 'deposit_released';
    }

    if (depositStatus === 'guest_checkin_confirmed' || guestCheckinConfirmed) {
      return 'guest_checkin_confirmed';
    }

    if (depositStatus === 'host_access_confirmed' || hostAccessConfirmed) {
      return 'host_access_confirmed';
    }

    return 'held';
  }

  if (depositStatus === 'manual_review') {
    return 'manual_review';
  }

  if (depositStatus === 'deposit_released') {
    return 'deposit_released';
  }

  if (depositStatus === 'review' || depositStatus === 'pending_confirmation' || depositStatus === 'released') {
    return LEGACY_TO_CANONICAL_STATUS[depositStatus as ProtectedDepositLegacyStatus];
  }

  if (EXTERNAL_DEPOSIT_STATUS_SET.has(depositStatus as ReservationDepositStatus)) {
    return depositStatus as ReservationDepositStatus;
  }

  if (PROTECTED_DEPOSIT_STATUS_SET.has(depositStatus as ReservationDepositStatus)) {
    return depositStatus as ReservationDepositStatus;
  }

  return null;
};

export const isProtectedDepositPlatformStatus = (value: unknown, signals?: DepositConfirmationSignals) => {
  const normalized = normalizeReservationDepositStatus(value, signals);
  return Boolean(normalized && PROTECTED_DEPOSIT_STATUS_SET.has(normalized));
};

export const isProtectedDepositSettledStatus = (value: unknown, signals?: DepositConfirmationSignals) => {
  const normalized = normalizeReservationDepositStatus(value, signals);
  return Boolean(normalized && PROTECTED_DEPOSIT_SETTLED_STATUS_SET.has(normalized));
};