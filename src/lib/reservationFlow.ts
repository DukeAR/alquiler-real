import {
  type BookingStatus,
  type ReservationCancellationActor,
  type ReservationDepositStatus,
  type ReservationDepositType,
  type ReservationRequestMode,
  type ReservationRequestStatus,
} from '../types';

export type ReservationFlowStage =
  | 'request-pending'
  | 'request-not-advanced'
  | 'deposit-choice'
  | 'request-accepted'
  | 'external-deposit-pending'
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
  depositType?: ReservationDepositType | null;
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
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  pendingActionHint?: string;
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

const getModelLabel = (mode: ReservationRequestMode, depositType?: ReservationDepositType | null) => {
  if (depositType === 'protected') {
    return 'Seña protegida';
  }

  if (depositType === 'external' || mode === 'direct') {
    return 'Seña externa';
  }

  return 'Solicitud registrada';
};

const getDepositMilestoneLabel = (
  mode: ReservationRequestMode,
  depositType: ReservationDepositType | null | undefined,
  stage: ReservationFlowStageWithIssues | null,
) => {
  if (stage === 'deposit-choice') {
    return 'Elegir seña';
  }

  if (depositType === 'external' || mode === 'direct') {
    if (stage === 'direct-deposit-reported') {
      return 'Seña informada';
    }

    if (stage === 'external-deposit-pending') {
      return 'Seña por coordinar';
    }

    return 'Seña confirmada';
  }

  if (stage === 'protected-deposit-review') {
    return 'Seña en revisión';
  }

  if (stage === 'protected-no-show-pending') {
    return 'Llegada en revisión';
  }

  return 'Seña en custodia';
};

const getMilestoneIndex = (stage: ReservationFlowStageWithIssues | null) => {
  switch (stage) {
    case 'request-pending':
      return 0;
    case 'request-not-advanced':
    case 'request-accepted':
      return 1;
    case 'deposit-choice':
    case 'external-deposit-pending':
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
    stage === 'request-not-advanced' ? 'No avanzó' : 'Aceptada',
    getDepositMilestoneLabel(input.mode, input.depositType, stage),
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
  depositType,
  requestStatus,
  bookingStatus,
  depositStatus,
  cancellationActor,
}: ReservationFlowInput): ReservationFlowStageWithIssues | null => {
  if (!mode) {
    return null;
  }

  if (
    requestStatus === 'not_advanced'
    || (bookingStatus === 'cancelled' && cancellationActor !== 'guest' && cancellationActor !== 'host' && !depositStatus)
  ) {
    return 'request-not-advanced';
  }

  if (bookingStatus === 'cancelled') {
    return cancellationActor === 'host' ? 'host-cancelled' : 'guest-cancelled';
  }

  const requestAccepted = requestStatus === 'accepted' || (mode === 'protected' && bookingStatus === 'confirmed');

  if (mode === 'direct') {
    if (depositStatus === 'reported') {
      return 'direct-deposit-reported';
    }

    if (depositStatus === 'confirmed' || (bookingStatus === 'confirmed' && requestStatus !== 'accepted' && depositStatus !== 'external_pending')) {
      return 'reservation-confirmed';
    }

    if (depositStatus === 'external_pending') {
      return 'external-deposit-pending';
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

  if (requestAccepted && depositType === 'external') {
    return 'external-deposit-pending';
  }

  if (requestAccepted && !depositType) {
    return 'deposit-choice';
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

  const modelLabel = getModelLabel(input.mode, input.depositType);
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
            : 'Tu solicitud ya quedó enviada. Esperá a que el anfitrión la acepte antes de definir la seña.'
          : viewerRole === 'host'
            ? 'Revisá la propuesta y respondé por acá antes de que venza.'
            : 'Tu propuesta ya quedó enviada. Esperá a que el anfitrión la acepte antes de seguir con la seña.',
        nextActor: 'host',
        nextActorLabel: 'Anfitrión',
        nextStepLabel: viewerRole === 'host'
          ? input.mode === 'protected' ? 'Aceptar solicitud' : 'Aceptar propuesta'
          : 'Esperar respuesta',
        primaryActionLabel: viewerRole === 'host'
          ? input.mode === 'protected' ? 'Aceptar solicitud' : 'Aceptar propuesta'
          : undefined,
      };
    case 'request-not-advanced':
      return {
        stage,
        modelLabel,
        statusLabel: 'No avanzó',
        description: viewerRole === 'host'
          ? 'Marcaste que no podés avanzar con esta reserva por ahora.'
          : 'No se pudo avanzar con esta reserva.',
        supportText: viewerRole === 'host'
          ? 'El chat sigue abierto por si quieren recoordinar o dejar una nueva propuesta por acá.'
          : 'El anfitrión no puede avanzar en este momento. Podés seguir conversando o buscar otras opciones.',
        nextActor: 'none',
        nextActorLabel: 'Sin acción pendiente',
        nextStepLabel: 'Seguir por chat si hace falta',
      };
    case 'deposit-choice':
      return {
        stage,
        modelLabel,
        statusLabel: viewerRole === 'host' ? 'Seña por definir' : 'Elegir seña',
        description: viewerRole === 'host'
          ? 'Ya la aceptaste. Ahora el huésped puede coordinar la seña por fuera o resolverla dentro de la plataforma.'
          : 'El anfitrión ya aceptó. Ahora podés coordinar la seña por fuera sin costo o resolverla dentro de la plataforma.',
        supportText: viewerRole === 'host'
          ? 'Si elige la opción protegida, la seña queda registrada en la plataforma y el fee aparece antes de confirmar.'
          : 'Si elegís la opción protegida, la seña queda registrada y se libera cuando confirmás la llegada. El fee se muestra antes de confirmar.',
        nextActor: 'guest',
        nextActorLabel: 'Huésped',
        nextStepLabel: viewerRole === 'host' ? 'Esperar elección de seña' : 'Elegir cómo resolver la seña',
      };
    case 'request-accepted':
      return {
        stage,
        modelLabel,
        statusLabel: input.mode === 'protected' ? 'Solicitud aceptada' : 'Propuesta aceptada',
        description: input.mode === 'protected'
          ? viewerRole === 'host'
            ? 'Ya la aceptaste. Ahora el huésped puede registrar la seña protegida desde la app.'
            : 'El anfitrión ya aceptó. Para seguir, registrá la seña protegida desde la app.'
          : viewerRole === 'host'
            ? 'Ya la aceptaste. Esperá que el huésped confirme la seña por acá.'
            : 'La propuesta ya fue aceptada. Confirmá por acá cuando hayas enviado la seña.',
        supportText: input.mode === 'protected'
          ? 'La reserva queda confirmada cuando la seña entra en custodia.'
          : 'Cuando ambos confirman, la reserva queda registrada.',
        nextActor: 'guest',
        nextActorLabel: 'Huésped',
        nextStepLabel: input.mode === 'protected'
          ? viewerRole === 'host' ? 'Esperar registro de seña' : 'Registrar seña protegida'
          : viewerRole === 'host' ? 'Esperar que el huésped informe la seña' : 'Informar seña',
        primaryActionLabel: viewerRole === 'guest'
          ? input.mode === 'protected' ? 'Registrar seña protegida' : 'Informar seña'
          : undefined,
        directDepositHint: input.mode === 'direct' ? 'Revisá que el titular coincida con quien publica antes de transferir.' : undefined,
      };
    case 'external-deposit-pending':
      return {
        stage,
        modelLabel,
        statusLabel: 'Seña externa',
        description: viewerRole === 'host'
          ? 'El huésped eligió coordinar la seña por fuera.'
          : 'Elegiste coordinar la seña por fuera sin costo.',
        supportText: viewerRole === 'host'
          ? 'La plataforma no cobra este paso. Si la reciben, después la pueden dejar asentada por chat.'
          : 'Podés seguir por chat sin pagar dentro de la plataforma. Si querés dejarlo asentado después, informá la seña por acá.',
        nextActor: viewerRole === 'guest' ? 'guest' : 'none',
        nextActorLabel: viewerRole === 'guest' ? 'Huésped' : 'Sin acción pendiente',
        nextStepLabel: viewerRole === 'guest' ? 'Seguir por chat' : 'Seguir por chat si hace falta',
        primaryActionLabel: viewerRole === 'guest' ? 'Informar seña' : undefined,
        directDepositHint: 'Revisá que el titular coincida con quien publica antes de transferir.',
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
        primaryActionLabel: 'Confirmar recepción',
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
        nextActorLabel: 'Sin acción pendiente',
        nextStepLabel: 'Seguir por chat si hace falta',
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
          nextActorLabel: 'Sin acción pendiente',
          nextStepLabel: 'Coordinar llegada',
          primaryActionLabel: 'Informar no show',
          pendingActionHint: 'Informar no show se habilita el día del ingreso.',
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
        nextActorLabel: 'Sin acción pendiente',
        nextStepLabel: 'Coordinar llegada',
        primaryActionLabel: 'Confirmar llegada',
        secondaryActionLabel: 'Reportar problema',
        pendingActionHint: 'Confirmar llegada o reportar un problema se habilitan el día del ingreso.',
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
        nextStepLabel: 'Esperar revisión',
      };
    case 'protected-no-show-pending':
      return {
        stage,
        modelLabel,
        statusLabel: 'Llegada en revisión',
        description: 'La seña quedó en pausa mientras se revisa el no show informado.',
        supportText: 'La plataforma revisa qué pasó antes de decidir cómo sigue la seña.',
        nextActor: 'platform',
        nextActorLabel: 'Plataforma',
        nextStepLabel: 'Esperar revisión',
      };
    case 'protected-deposit-released':
      return {
        stage,
        modelLabel,
        statusLabel: 'Seña liberada',
        description: 'La llegada ya quedó confirmada y la seña salió de custodia.',
        nextActor: 'none',
        nextActorLabel: 'Sin acción pendiente',
        nextStepLabel: 'Seguir por chat si hace falta',
      };
    case 'guest-cancelled':
      return {
        stage,
        modelLabel,
        statusLabel: 'Cancelaste la reserva',
        description: 'La cancelación ya quedó registrada.',
        supportText: input.mode === 'protected' || input.depositType === 'protected'
          ? input.depositStatus === 'review'
            ? 'La devolución depende del momento de la cancelación y de cómo quedó la reserva. La seña está en revisión hasta cerrar qué corresponde.'
            : 'La devolución depende del momento de la cancelación y del estado de la reserva. Si la seña ya estaba en custodia, la plataforma revisa cómo cerrarla.'
          : 'La plataforma solo informa el estado. Si hubo una seña, la resolución queda entre ustedes.',
        nextActor: (input.mode === 'protected' || input.depositType === 'protected') && (input.depositStatus === 'review' || input.depositStatus === 'held' || input.depositStatus === 'pending_confirmation')
          ? 'platform'
          : 'none',
        nextActorLabel: (input.mode === 'protected' || input.depositType === 'protected') && (input.depositStatus === 'review' || input.depositStatus === 'held' || input.depositStatus === 'pending_confirmation')
          ? 'Plataforma'
          : 'Sin acción pendiente',
        nextStepLabel: (input.mode === 'protected' || input.depositType === 'protected') && (input.depositStatus === 'review' || input.depositStatus === 'held' || input.depositStatus === 'pending_confirmation')
          ? 'Esperar revisión'
          : 'Seguir por chat si hace falta',
      };
    case 'host-cancelled':
      return {
        stage,
        modelLabel,
        statusLabel: 'Canceló el anfitrión',
        description: 'La reserva ya no sigue activa.',
        supportText: input.mode === 'protected' || input.depositType === 'protected'
          ? 'Si la seña ya estaba en custodia, se devuelve.'
          : 'La plataforma solo informa el estado. Si hubo una seña, la resolución queda entre ustedes.',
        nextActor: input.mode === 'protected' || input.depositType === 'protected' ? 'platform' : 'none',
        nextActorLabel: input.mode === 'protected' || input.depositType === 'protected' ? 'Plataforma' : 'Sin acción pendiente',
        nextStepLabel: input.mode === 'protected' || input.depositType === 'protected' ? 'Esperar devolución' : 'Seguir por chat si hace falta',
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

export const getReservationNextActorDisplayLabel = (flow: ReservationFlowCopy) => (
  flow.nextActorLabel ?? 'Sin acción pendiente'
);

export const getReservationNextStepDisplayLabel = (flow: ReservationFlowCopy) => (
  flow.nextStepLabel ?? 'Seguir por chat si hace falta'
);