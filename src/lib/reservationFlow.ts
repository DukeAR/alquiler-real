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
export type ReservationFlowMilestoneKey = 'request' | 'accepted' | 'deposit' | 'confirmed';
export type ReservationFlowMilestoneState = 'completed' | 'current' | 'upcoming';

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

export type ReservationFlowMilestone = {
  key: ReservationFlowMilestoneKey;
  label: string;
  state: ReservationFlowMilestoneState;
};

const getRequestStatusLabel = (mode: ReservationRequestMode, viewerRole: ReservationFlowViewerRole) => {
  if (mode === 'protected') {
    return viewerRole === 'host' ? 'Solicitud recibida' : 'Solicitud enviada';
  }

  return viewerRole === 'host' ? 'Propuesta recibida' : 'Propuesta enviada';
};

const getDepositMilestoneLabel = (
  mode: ReservationRequestMode,
  stage: ReservationFlowStageWithIssues | null,
) => {
  if (mode === 'protected') {
    if (stage === 'protected-deposit-review') {
      return 'Seña en revisión';
    }

    if (stage === 'protected-no-show-pending') {
      return 'Pendiente de confirmación';
    }

    return 'Seña en custodia';
  }

  if (stage === 'direct-deposit-reported') {
    return 'Seña informada';
  }

  return 'Seña confirmada';
};

const getMilestoneIndex = (stage: ReservationFlowStageWithIssues | null) => {
  switch (stage) {
    case 'request-pending':
      return 0;
    case 'request-accepted':
      return 1;
    case 'direct-deposit-reported':
    case 'protected-deposit-held':
    case 'protected-deposit-review':
    case 'protected-no-show-pending':
      return 2;
    case 'reservation-confirmed':
    case 'protected-deposit-released':
    case 'guest-cancelled':
    case 'host-cancelled':
      return 3;
    default:
      return 0;
  }
};

export const getReservationFlowMilestones = (input: ReservationFlowInput): ReservationFlowMilestone[] => {
  if (!input.mode) {
    return [];
  }

  const stage = getReservationFlowStage(input);
  const viewerRole = input.viewerRole ?? 'guest';
  const currentIndex = getMilestoneIndex(stage);
  const milestones = [
    getRequestStatusLabel(input.mode, viewerRole),
    'Aceptada',
    getDepositMilestoneLabel(input.mode, stage),
    stage === 'guest-cancelled' || stage === 'host-cancelled' ? 'Cancelada' : 'Confirmada',
  ] as const;

  return milestones.map((label, index) => ({
    key: (['request', 'accepted', 'deposit', 'confirmed'] as const)[index],
    label,
    state: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming',
  }));
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
        statusLabel: getRequestStatusLabel(input.mode, viewerRole),
        description: input.mode === 'protected'
          ? viewerRole === 'host'
            ? 'Respondé esta solicitud dentro de las próximas 24 horas para que no se venza.'
            : 'Tu solicitud ya quedó enviada. Esperá a que el anfitrión la acepte antes de pagar la seña.'
          : viewerRole === 'host'
            ? 'Revisá la propuesta y respondé por acá antes de que venza.'
            : 'Tu propuesta ya quedó enviada. Esperá a que el anfitrión la acepte antes de seguir con la seña.',
        nextActor: 'host',
        nextActorLabel: 'Anfitrión',
        nextStepLabel: viewerRole === 'host'
          ? input.mode === 'protected' ? 'Aceptar solicitud' : 'Aceptar propuesta'
          : 'Esperar respuesta',
      };
    case 'request-accepted':
      return {
        stage,
        modelLabel,
        statusLabel: input.mode === 'protected' ? 'Solicitud aceptada' : 'Propuesta aceptada',
        description: input.mode === 'protected'
          ? 'Podés avanzar con una reserva protegida.'
          : 'La propuesta ya fue aceptada. Confirmá por acá cuando hayas enviado la seña.',
        supportText: input.mode === 'direct' ? 'Cuando ambos confirman, la reserva queda registrada.' : undefined,
        nextActor: 'guest',
        nextActorLabel: 'Huésped',
        nextStepLabel: input.mode === 'protected'
          ? viewerRole === 'host' ? 'Esperar pago de seña' : 'Pagar seña'
          : viewerRole === 'host' ? 'Esperar confirmación de seña' : 'Confirmar seña',
        directDepositHint: input.mode === 'direct' ? 'Revisá que el titular coincida con quien publica antes de transferir.' : undefined,
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
        directDepositHint: 'Revisá que el titular coincida con quien publica antes de transferir.',
      };
    case 'reservation-confirmed':
      return {
        stage,
        modelLabel,
        statusLabel: 'Reserva confirmada',
        description: 'La reserva ya quedó registrada.',
        supportText: viewerRole === 'host'
          ? 'Próximo paso: coordiná horario de llegada con el huésped.'
          : 'Próximo paso: coordiná horario de llegada con el anfitrión.',
        nextActor: 'none',
        nextActorLabel: 'Ambos',
        nextStepLabel: 'Coordinar llegada',
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
          nextActor: 'none',
          nextActorLabel: 'Ambos',
          nextStepLabel: 'Coordinar llegada',
        };
      }

      return {
        stage,
        modelLabel,
        statusLabel: 'Seña en custodia',
        description: 'La seña se mantiene protegida hasta tu llegada.',
        supportText: 'Próximo paso: coordiná horario de llegada con el anfitrión.',
        trackingHint: 'Si surge un problema al llegar, podés reportarlo desde la app.',
        nextActor: 'none',
        nextActorLabel: 'Ambos',
        nextStepLabel: 'Coordinar llegada',
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
            ? 'La devolución depende del momento de la cancelación y de cómo quedó la reserva. La seña está en revisión hasta cerrar qué corresponde.'
            : 'La devolución depende del momento de la cancelación y del estado de la reserva. Si la seña ya estaba en custodia, la plataforma revisa cómo cerrarla.'
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
          ? 'Si la seña ya estaba en custodia, se devuelve.'
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