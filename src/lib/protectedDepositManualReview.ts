import { formatBookingDateTime } from './bookingDates';
import type { ReservationFlowStage, ReservationFlowViewerRole } from './reservationFlow';

export type ProtectedDepositManualReviewReason =
  | 'guest_checkin_without_host_access_confirmation'
  | 'guest_reported_no_access_after_host_confirmation'
  | 'inconsistent_guest_geolocation'
  | 'suspicious_payment_proof'
  | 'property_reported_nonexistent'
  | 'host_reported_no_show';

const PROTECTED_DEPOSIT_MANUAL_REVIEW_REASON_SET = new Set<ProtectedDepositManualReviewReason>([
  'guest_checkin_without_host_access_confirmation',
  'guest_reported_no_access_after_host_confirmation',
  'inconsistent_guest_geolocation',
  'suspicious_payment_proof',
  'property_reported_nonexistent',
  'host_reported_no_show',
]);

type ProtectedDepositTraceable = {
  conversationId?: string | null;
  depositPaymentReference?: string | null;
  manualReviewReason?: ProtectedDepositManualReviewReason | null;
  manualReviewOpenedAt?: string | null;
  guestCheckinConfirmed?: boolean;
  guestCheckinConfirmedAt?: string | null;
  guestCheckinLatitude?: number | null;
  guestCheckinLongitude?: number | null;
  guestCheckinAccuracyMeters?: number | null;
  hostAccessConfirmed?: boolean;
  hostAccessConfirmedAt?: string | null;
};

type ProtectedDepositManualReviewInput = ProtectedDepositTraceable & {
  stage?: ReservationFlowStage | null;
  viewerRole: ReservationFlowViewerRole;
};

export type ProtectedDepositManualReviewCard = {
  title: string;
  description: string;
  details: Array<{
    label: string;
    value: string;
  }>;
  nextStep: string;
};

export const normalizeProtectedDepositManualReviewReason = (value: unknown): ProtectedDepositManualReviewReason | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedReason = value.trim() as ProtectedDepositManualReviewReason;
  return PROTECTED_DEPOSIT_MANUAL_REVIEW_REASON_SET.has(normalizedReason)
    ? normalizedReason
    : null;
};

export const getProtectedDepositManualReviewReasonLabel = (
  reason: ProtectedDepositManualReviewReason | null | undefined,
) => {
  switch (reason) {
    case 'guest_checkin_without_host_access_confirmation':
      return 'El huésped confirmó la llegada pero falta la confirmación de acceso del anfitrión';
    case 'guest_reported_no_access_after_host_confirmation':
      return 'El anfitrión confirmó el acceso pero el huésped reportó que no pudo ingresar';
    case 'inconsistent_guest_geolocation':
      return 'La ubicación registrada necesita revisión';
    case 'suspicious_payment_proof':
      return 'El comprobante necesita revisión';
    case 'property_reported_nonexistent':
      return 'Se reportó que la propiedad podría no existir';
    case 'host_reported_no_show':
      return 'El anfitrión reportó un no show y falta validar lo ocurrido';
    default:
      return 'Confirmaciones o evidencia pendientes de revisión';
  }
};

const formatConfirmationTrace = (confirmed: boolean | undefined, confirmedAt?: string | null) => {
  const formattedTimestamp = formatBookingDateTime(confirmedAt);

  if (formattedTimestamp) {
    return formattedTimestamp;
  }

  if (confirmed) {
    return 'Confirmado sin horario legible';
  }

  return 'Sin confirmación registrada';
};

const formatGuestGeolocationTrace = (
  latitude?: number | null,
  longitude?: number | null,
  accuracyMeters?: number | null,
  guestCheckinConfirmed?: boolean,
) => {
  if (typeof latitude === 'number' && Number.isFinite(latitude) && typeof longitude === 'number' && Number.isFinite(longitude)) {
    const coordinateLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    if (typeof accuracyMeters === 'number' && Number.isFinite(accuracyMeters)) {
      return `${coordinateLabel} · ±${Math.round(accuracyMeters)} m`;
    }

    return coordinateLabel;
  }

  if (guestCheckinConfirmed) {
    return 'Sin geolocalización disponible';
  }

  return 'Sin ubicación registrada';
};

const formatChatTrace = (conversationId?: string | null) => (
  typeof conversationId === 'string' && conversationId.trim()
    ? 'Disponible en esta reserva'
    : 'Sin chat asociado'
);

const formatPaymentProofTrace = (depositPaymentReference?: string | null) => {
  if (typeof depositPaymentReference === 'string' && depositPaymentReference.trim()) {
    return `Referencia ${depositPaymentReference.trim()}`;
  }

  return 'Sin comprobante asociado';
};

export const getProtectedDepositManualReviewCard = ({
  stage,
  viewerRole,
  conversationId,
  depositPaymentReference,
  manualReviewReason,
  manualReviewOpenedAt,
  guestCheckinConfirmed,
  guestCheckinConfirmedAt,
  guestCheckinLatitude,
  guestCheckinLongitude,
  guestCheckinAccuracyMeters,
  hostAccessConfirmed,
  hostAccessConfirmedAt,
}: ProtectedDepositManualReviewInput): ProtectedDepositManualReviewCard | null => {
  if (stage !== 'protected-deposit-review' && stage !== 'protected-no-show-pending') {
    return null;
  }

  const normalizedReviewReason = normalizeProtectedDepositManualReviewReason(manualReviewReason);
  const formattedOpenedAt = formatBookingDateTime(manualReviewOpenedAt);

  return {
    title: 'En revisión manual',
    description: 'Vamos a revisar la información disponible: chat, comprobante, confirmaciones y ubicación registrada.',
    details: [
      {
        label: 'Motivo',
        value: getProtectedDepositManualReviewReasonLabel(normalizedReviewReason),
      },
      {
        label: 'Chat',
        value: formatChatTrace(conversationId),
      },
      {
        label: 'Comprobante',
        value: formatPaymentProofTrace(depositPaymentReference),
      },
      ...(formattedOpenedAt
        ? [{
            label: 'Abierta',
            value: formattedOpenedAt,
          }]
        : []),
      {
        label: viewerRole === 'guest' ? 'Tu check-in' : 'Check-in huésped',
        value: formatConfirmationTrace(guestCheckinConfirmed, guestCheckinConfirmedAt),
      },
      {
        label: viewerRole === 'host' ? 'Tu acceso' : 'Acceso anfitrión',
        value: formatConfirmationTrace(hostAccessConfirmed, hostAccessConfirmedAt),
      },
      {
        label: 'Ubicación registrada',
        value: formatGuestGeolocationTrace(
          guestCheckinLatitude,
          guestCheckinLongitude,
          guestCheckinAccuracyMeters,
          guestCheckinConfirmed,
        ),
      },
    ],
    nextStep: 'La seña no se libera automáticamente mientras esta revisión siga abierta.',
  };
};