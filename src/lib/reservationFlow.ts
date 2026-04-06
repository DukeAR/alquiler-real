import {
  type BookingStatus,
  type ReservationCancellationActor,
  type ReservationDepositStatus,
  type ReservationRequestMode,
  type ReservationRequestStatus,
} from '../types';

export type ReservationFlowStage =
  | 'request-pending'
  | 'request-accepted'
  | 'direct-deposit-reported'
  | 'reservation-confirmed'
  | 'protected-deposit-held'
  | 'protected-deposit-review'
  | 'protected-no-show-pending'
  | 'protected-deposit-released';

export type ReservationFlowStageWithIssues =
  | ReservationFlowStage
  | 'guest-cancelled'
  | 'host-cancelled';

export type ReservationFlowActor = 'guest' | 'host' | 'platform' | 'none';
export type ReservationFlowViewerRole = 'guest' | 'host';

type ReservationFlowInput = {
  mode?: ReservationRequestMode | null;
  requestStatus?: ReservationRequestStatus | null;
  bookingStatus?: BookingStatus | null;
  depositStatus?: ReservationDepositStatus | null;
  cancellationActor?: ReservationCancellationActor | null;
  viewerRole?: ReservationFlowViewerRole;
};

export type ReservationFlowCopy = {
  stage: ReservationFlowStageWithIssues | null;
  statusLabel: string | null;
  description: string | null;
  supportText?: string;
  nextActor: ReservationFlowActor;
  nextActorLabel?: string;
  nextStepLabel?: string;
  modelLabel?: string;
  directDepositHint?: string;
  trackingHint?: string;
};

export const getReservationFlowStage = ({
  mode,
  requestStatus,
  bookingStatus,
  depositStatus,
  cancellationActor,
}: ReservationFlowInput): ReservationFlowStageWithIssues | null => {
  if (!mode) {
    return null;
  }

  if (bookingStatus === 'cancelled') {
    return cancellationActor === 'host' ? 'host-cancelled' : 'guest-cancelled';
  }

  const requestAccepted = requestStatus === 'accepted' || (mode === 'protected' && bookingStatus === 'confirmed');

  if (mode === 'direct') {
    if (depositStatus === 'reported') {
      return 'direct-deposit-reported';
    }

    if (depositStatus === 'confirmed' || (bookingStatus === 'confirmed' && requestStatus !== 'accepted')) {
      return 'reservation-confirmed';
    }

    if (requestAccepted) {
      return 'request-accepted';
    }

    return 'request-pending';
  }

  if (depositStatus === 'review') {
    return 'protected-deposit-review';
  }

  if (depositStatus === 'pending_confirmation') {
    return 'protected-no-show-pending';
  }

  if (depositStatus === 'released') {
    return 'protected-deposit-released';
  }

  if (depositStatus === 'held') {
    return 'protected-deposit-held';
  }

  if (requestAccepted) {
    return 'request-accepted';
  }

  return 'request-pending';
};

export const getReservationFlowCopy = (input: ReservationFlowInput): ReservationFlowCopy => {
  const stage = getReservationFlowStage(input);

  if (!stage || !input.mode) {
    return {
      stage: null,
      statusLabel: null,
      description: null,
      nextActor: 'none',
    };
  }

  const modelLabel = input.mode === 'protected' ? 'Reserva protegida' : 'Acuerdo directo';
  const viewerRole = input.viewerRole ?? 'guest';

  switch (stage) {
    case 'request-pending':
      return {
        stage,
        modelLabel,
        statusLabel: input.mode === 'protected' ? 'Solicitud pendiente' : 'Propuesta enviada',
        description: input.mode === 'protected'
          ? 'Esperá a que el anfitrión la acepte antes de pagar la seña.'
          : 'Esperá a que el anfitrión acepte la propuesta para seguir con la seña.',
        nextActor: 'host',
        nextActorLabel: 'Anfitrión',
        nextStepLabel: input.mode === 'protected' ? 'Aceptar solicitud' : 'Aceptar propuesta',
      };
    case 'request-accepted':
      return {
        stage,
        modelLabel,
        statusLabel: input.mode === 'protected' ? 'Solicitud aceptada' : 'Propuesta aceptada',
        description: input.mode === 'protected'
          ? 'Podés avanzar con una reserva protegida.'
          : 'La propuesta ya fue aceptada. Avisá cuando hayas enviado la seña.',
        supportText: input.mode === 'direct' ? 'Cuando ambos confirman, la reserva queda registrada.' : undefined,
        nextActor: 'guest',
        nextActorLabel: 'Huésped',
        nextStepLabel: input.mode === 'protected' ? 'Pagar seña' : 'Ya envié la seña',
        directDepositHint: input.mode === 'direct' ? 'Si vas a transferir una seña, verificá que coincida con quien publica.' : undefined,
      };
    case 'direct-deposit-reported':
      return {
        stage,
        modelLabel,
        statusLabel: 'Seña informada',
        description: 'La seña ya quedó informada en la conversación.',
        supportText: 'Cuando ambos confirman, la reserva queda registrada.',
        nextActor: 'host',
        nextActorLabel: 'Anfitrión',
        nextStepLabel: 'Confirmar recepción',
        directDepositHint: 'Si vas a transferir una seña, verificá que coincida con quien publica.',
      };
    case 'reservation-confirmed':
      return {
        stage,
        modelLabel,
        statusLabel: 'Reserva confirmada',
        description: 'La reserva ya quedó registrada.',
        nextActor: 'none',
      };
    case 'protected-deposit-held':
      if (viewerRole === 'host') {
        return {
          stage,
          modelLabel,
          statusLabel: 'Seña en custodia',
          description: 'La seña ya fue recibida',
          supportText: 'El huésped confirmó la seña a través de la plataforma. El monto queda en custodia y se libera cuando el huésped confirma su llegada al lugar.',
          trackingHint: 'Vas a poder ver el estado y el momento de liberación desde esta reserva.',
          nextActor: 'guest',
          nextActorLabel: 'Huésped',
          nextStepLabel: 'Confirmar llegada',
        };
      }

      return {
        stage,
        modelLabel,
        statusLabel: 'Seña en custodia',
        description: 'La seña se mantiene protegida hasta tu llegada.',
        supportText: 'Si surge un problema al llegar, podés reportarlo desde la app.',
        nextActor: 'guest',
        nextActorLabel: 'Huésped',
        nextStepLabel: 'Confirmar llegada',
      };
    case 'protected-deposit-review':
      return {
        stage,
        modelLabel,
        statusLabel: 'Seña en revisión',
        description: 'Quedó reportado un problema al llegar y la seña pasó a revisión.',
        supportText: 'La plataforma revisa lo que pasó antes de definir cómo sigue la seña.',
        nextActor: 'platform',
        nextActorLabel: 'Plataforma',
        nextStepLabel: 'Revisar reporte',
      };
    case 'protected-no-show-pending':
      return {
        stage,
        modelLabel,
        statusLabel: 'Pendiente de confirmación',
        description: 'La seña no se libera automáticamente mientras se confirma el no show.',
        supportText: 'La plataforma deja la seña en pausa hasta revisar lo que pasó.',
        nextActor: 'platform',
        nextActorLabel: 'Plataforma',
        nextStepLabel: 'Confirmar no show',
      };
    case 'protected-deposit-released':
      return {
        stage,
        modelLabel,
        statusLabel: 'Seña liberada',
        description: 'La llegada ya quedó confirmada y la seña salió de custodia.',
        nextActor: 'none',
      };
    case 'guest-cancelled':
      return {
        stage,
        modelLabel,
        statusLabel: input.mode === 'protected' ? 'Cancelaste la reserva' : 'Cancelaste la reserva',
        description: 'La cancelación ya quedó registrada.',
        supportText: input.mode === 'protected'
          ? input.depositStatus === 'review'
            ? 'La plataforma revisa qué pasa con la seña según la etapa de la reserva.'
            : 'Si la seña ya estaba en la plataforma, revisamos cómo sigue según la etapa de la reserva.'
          : 'La plataforma solo informa el estado. Si hubo una seña, la resolución queda entre ustedes.',
        nextActor: input.mode === 'protected' && (input.depositStatus === 'review' || input.depositStatus === 'held' || input.depositStatus === 'pending_confirmation')
          ? 'platform'
          : 'none',
        nextActorLabel: input.mode === 'protected' && (input.depositStatus === 'review' || input.depositStatus === 'held' || input.depositStatus === 'pending_confirmation')
          ? 'Plataforma'
          : undefined,
        nextStepLabel: input.mode === 'protected' && (input.depositStatus === 'review' || input.depositStatus === 'held' || input.depositStatus === 'pending_confirmation')
          ? 'Revisar seña'
          : undefined,
      };
    case 'host-cancelled':
      return {
        stage,
        modelLabel,
        statusLabel: 'Canceló el anfitrión',
        description: 'La reserva ya no sigue activa.',
        supportText: input.mode === 'protected'
          ? 'La seña se devuelve automáticamente.'
          : 'La plataforma solo informa el estado. Si hubo una seña, la resolución queda entre ustedes.',
        nextActor: input.mode === 'protected' ? 'platform' : 'none',
        nextActorLabel: input.mode === 'protected' ? 'Plataforma' : undefined,
        nextStepLabel: input.mode === 'protected' ? 'Devolver seña' : undefined,
      };
    default:
      return {
        stage: null,
        statusLabel: null,
        description: null,
        nextActor: 'none',
      };
  }
};