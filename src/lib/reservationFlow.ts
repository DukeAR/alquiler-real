import {
  type BookingStatus,
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
  | 'protected-deposit-released';

export type ReservationFlowActor = 'guest' | 'host' | 'none';

type ReservationFlowInput = {
  mode?: ReservationRequestMode | null;
  requestStatus?: ReservationRequestStatus | null;
  bookingStatus?: BookingStatus | null;
  depositStatus?: ReservationDepositStatus | null;
};

export type ReservationFlowCopy = {
  stage: ReservationFlowStage | null;
  statusLabel: string | null;
  description: string | null;
  supportText?: string;
  nextActor: ReservationFlowActor;
  nextActorLabel?: string;
  nextStepLabel?: string;
  modelLabel?: string;
  directDepositHint?: string;
};

export const getReservationFlowStage = ({
  mode,
  requestStatus,
  bookingStatus,
  depositStatus,
}: ReservationFlowInput): ReservationFlowStage | null => {
  if (!mode) {
    return null;
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

  switch (stage) {
    case 'request-pending':
      return {
        stage,
        modelLabel,
        statusLabel: 'Solicitud pendiente',
        description: input.mode === 'protected'
          ? 'Esperá a que el anfitrión la acepte antes de pagar la seña.'
          : 'Esperá a que el anfitrión acepte la solicitud para seguir con la seña.',
        nextActor: 'host',
        nextActorLabel: 'Anfitrión',
        nextStepLabel: 'Aceptar solicitud',
      };
    case 'request-accepted':
      return {
        stage,
        modelLabel,
        statusLabel: 'Solicitud aceptada',
        description: input.mode === 'protected'
          ? 'Podés avanzar con una reserva protegida.'
          : 'La solicitud ya fue aceptada. Avisá cuando hayas enviado la seña.',
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
      return {
        stage,
        modelLabel,
        statusLabel: 'Seña en custodia',
        description: 'La seña se mantiene protegida hasta tu llegada.',
        nextActor: 'guest',
        nextActorLabel: 'Huésped',
        nextStepLabel: 'Confirmar llegada',
      };
    case 'protected-deposit-released':
      return {
        stage,
        modelLabel,
        statusLabel: 'Seña liberada',
        description: 'La llegada ya quedó confirmada y la seña salió de custodia.',
        nextActor: 'none',
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