import {
  type BookingStatus,
  type ReservationCancellationActor,
  type ReservationDepositStatus,
  type ReservationDepositType,
  type ReservationRequestMode,
  type ReservationRequestStatus,
} from '../types';
import { isBookingCheckInReached } from './bookingDates';

export type ReservationFlowStage =
  | 'request-pending'
  | 'request-not-advanced'
  | 'deposit-choice'
  | 'request-accepted'
  | 'protected-checkout-pending'
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

export type ReservationFlowState =
  | 'inquiry'
  | 'free_operation_selected'
  | 'protected_deposit_selected'
  | 'deposit_pending'
  | 'deposit_reported'
  | 'deposit_confirmed'
  | 'checkin_pending'
  | 'guest_checkin_confirmed'
  | 'host_access_confirmed'
  | 'deposit_released'
  | 'manual_review'
  | 'cancelled';

export type ReservationFlowActor = 'guest' | 'host' | 'platform' | 'none';
export type ReservationFlowViewerRole = 'guest' | 'host';
export type ReservationFlowMilestoneKey = 'request' | 'accepted' | 'deposit' | 'confirmed';
export type ReservationFlowMilestoneState = 'completed' | 'current' | 'upcoming';
export type ReservationVisibleStatusKey =
  | 'proposal-sent'
  | 'in-conversation'
  | 'pending-deposit'
  | 'deposit-registered'
  | 'confirmed'
  | 'not-advanced'
  | 'issue-reported';
export type ReservationVisibleStatusTone = 'neutral' | 'brand' | 'success' | 'warning';

export type ReservationVisibleStatus = {
  key: ReservationVisibleStatusKey;
  label: string;
  tone: ReservationVisibleStatusTone;
};

type ReservationFlowInput = {
  mode?: ReservationRequestMode | null;
  depositType?: ReservationDepositType | null;
  requestStatus?: ReservationRequestStatus | null;
  bookingStatus?: BookingStatus | null;
  depositStatus?: ReservationDepositStatus | null;
  cancellationActor?: ReservationCancellationActor | null;
  startDate?: string | null;
  guestCheckinConfirmed?: boolean | null;
  hostAccessConfirmed?: boolean | null;
  viewerRole?: ReservationFlowViewerRole;
};

type ReservationVisibleStatusOptions = {
  hasConversation?: boolean;
  isExpiredPendingRequest?: boolean;
};

export type ReservationFlowCopy = {
  stage: ReservationFlowStageWithIssues | null;
  state: ReservationFlowState | null;
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

  if (depositType === 'external') {
    return 'Operación libre';
  }

  return mode === 'protected' ? 'Seña protegida' : 'Operación libre';
};

const getDepositMilestoneLabel = (
  mode: ReservationRequestMode,
  depositType: ReservationDepositType | null | undefined,
  stage: ReservationFlowStageWithIssues | null,
) => {
  if (stage === 'deposit-choice') {
    return 'Elegir seña';
  }

  if (mode === 'protected') {
    if (stage === 'protected-checkout-pending') {
      return 'Seña protegida elegida';
    }

    if (stage === 'protected-deposit-review') {
      return 'Seña en revisión';
    }

    if (stage === 'protected-no-show-pending') {
      return 'Llegada en revisión';
    }

    return 'Seña protegida';
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

  if (stage === 'protected-checkout-pending') {
    return 'Seña por registrar';
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
    case 'protected-checkout-pending':
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

  if (bookingStatus === 'completed') {
    return 'reservation-confirmed';
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

  if (depositStatus === 'checkout_pending') {
    return 'protected-checkout-pending';
  }

  if (depositStatus === 'held') {
    return 'protected-deposit-held';
  }

  if (requestAccepted && depositType === 'external') {
    return 'external-deposit-pending';
  }

  if (requestAccepted && depositType === 'protected') {
    return 'protected-checkout-pending';
  }

  if (requestAccepted && !depositType) {
    return 'protected-checkout-pending';
  }

  if (requestAccepted) {
    return 'request-accepted';
  }

  return 'request-pending';
};

export const getReservationFlowState = (input: ReservationFlowInput): ReservationFlowState | null => {
  const stage = getReservationFlowStage(input);

  if (!stage || !input.mode) {
    return null;
  }

  if (stage === 'request-pending') {
    return 'inquiry';
  }

  if (stage === 'request-not-advanced' || stage === 'guest-cancelled' || stage === 'host-cancelled') {
    return 'cancelled';
  }

  if (stage === 'protected-deposit-review' || stage === 'protected-no-show-pending') {
    return 'manual_review';
  }

  if (stage === 'protected-deposit-released') {
    return 'deposit_released';
  }

  if (input.mode === 'direct') {
    if (stage === 'direct-deposit-reported') {
      return 'deposit_reported';
    }

    if (input.depositStatus === 'confirmed') {
      return 'deposit_confirmed';
    }

    return 'free_operation_selected';
  }

  if (input.hostAccessConfirmed) {
    return 'host_access_confirmed';
  }

  if (input.guestCheckinConfirmed) {
    return 'guest_checkin_confirmed';
  }

  if (input.depositStatus === 'reported') {
    return 'deposit_reported';
  }

  if (input.depositStatus === 'confirmed') {
    return 'deposit_confirmed';
  }

  if (stage === 'request-accepted') {
    return 'protected_deposit_selected';
  }

  if (stage === 'protected-checkout-pending') {
    return 'deposit_pending';
  }

  if (stage === 'protected-deposit-held') {
    return isBookingCheckInReached(input.startDate) ? 'checkin_pending' : 'deposit_confirmed';
  }

  if (stage === 'reservation-confirmed') {
    return input.mode === 'protected' ? 'deposit_released' : 'free_operation_selected';
  }

  return 'protected_deposit_selected';
};

export const getReservationVisibleStatus = (
  input: ReservationFlowInput,
  options: ReservationVisibleStatusOptions = {},
): ReservationVisibleStatus | null => {
  const stage = getReservationFlowStage(input);
  const state = getReservationFlowState(input);

  if (!stage || !input.mode) {
    return null;
  }

  if (options.isExpiredPendingRequest) {
    return {
      key: 'not-advanced',
      label: 'No avanzó',
      tone: 'neutral',
    };
  }

  if (input.bookingStatus === 'completed') {
    return {
      key: 'confirmed',
      label: 'Finalizada',
      tone: 'success',
    };
  }

  switch (stage) {
    case 'request-pending':
      if (options.hasConversation) {
        return {
          key: 'in-conversation',
          label: 'En conversación',
          tone: 'brand',
        };
      }

      return {
        key: 'proposal-sent',
        label: input.mode === 'protected' ? 'Solicitud enviada' : 'Propuesta enviada',
        tone: 'brand',
      };
    case 'request-not-advanced':
      return {
        key: 'not-advanced',
        label: 'No avanzó',
        tone: 'neutral',
      };
    case 'deposit-choice':
    case 'request-accepted':
      return {
        key: input.mode === 'protected' ? 'pending-deposit' : 'in-conversation',
        label: input.mode === 'protected' ? 'Seña protegida' : 'Operación libre',
        tone: 'brand',
      };
    case 'protected-checkout-pending':
      return {
        key: 'pending-deposit',
        label: state === 'deposit_pending' ? 'Seña pendiente' : 'Seña protegida',
        tone: 'brand',
      };
    case 'external-deposit-pending':
      return {
        key: 'in-conversation',
        label: 'Operación libre',
        tone: 'brand',
      };
    case 'direct-deposit-reported':
    case 'protected-deposit-held':
      return {
        key: 'deposit-registered',
        label: state === 'checkin_pending'
          ? 'Check-in pendiente'
          : state === 'guest_checkin_confirmed'
            ? 'Check-in confirmado'
            : state === 'host_access_confirmed'
              ? 'Acceso confirmado'
              : state === 'deposit_confirmed'
                ? 'Seña confirmada'
                : 'Seña registrada',
        tone: 'brand',
      };
    case 'reservation-confirmed':
    case 'protected-deposit-released':
      return {
        key: 'confirmed',
        label: state === 'deposit_released' ? 'Seña liberada' : 'Confirmada',
        tone: 'success',
      };
    case 'protected-deposit-review':
    case 'protected-no-show-pending':
      return {
        key: 'issue-reported',
        label: state === 'manual_review' ? 'Revisión manual' : 'Problema reportado',
        tone: 'warning',
      };
    default:
      return null;
  }
};

export const getReservationFlowCopy = (input: ReservationFlowInput): ReservationFlowCopy => {
  const stage = getReservationFlowStage(input);
  const state = getReservationFlowState(input);

  if (!stage || !input.mode) {
    return {
      stage: null,
      state: null,
      statusLabel: null,
      description: null,
      nextActor: 'none',
    };
  }

  const buildFlowCopy = (
    copy: Omit<ReservationFlowCopy, 'stage' | 'state'> & { stage?: ReservationFlowStageWithIssues | null },
  ): ReservationFlowCopy => ({
    ...copy,
    stage: copy.stage ?? stage,
    state,
  });

  const modelLabel = getModelLabel(input.mode, input.depositType);
  const viewerRole = input.viewerRole ?? 'guest';
  const visibleStatus = getReservationVisibleStatus(input);

  if (input.bookingStatus === 'completed') {
    return buildFlowCopy({
      modelLabel,
      statusLabel: visibleStatus?.label ?? 'Finalizada',
      description: 'La estadía ya terminó.',
      supportText: viewerRole === 'guest'
        ? 'Podés revisar el cierre, dejar una reseña o volver al chat si necesitás contexto de esa reserva.'
        : 'La reserva ya quedó cerrada y sigue visible como historial por si necesitás revisar el cierre.',
      nextActor: 'none',
      nextActorLabel: 'Sin acción pendiente',
      nextStepLabel: viewerRole === 'guest' ? 'Revisar el cierre' : 'Historial cerrado',
    });
  }

  switch (stage) {
    case 'request-pending':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? getRequestStatusLabel(input.mode, viewerRole),
        description: input.mode === 'protected'
          ? viewerRole === 'host'
            ? 'La solicitud de seña protegida ya quedó abierta en el chat. Cuando lo tengas claro, respondé por acá.'
            : 'Tu solicitud de seña protegida ya quedó enviada. Si responden, siguen por acá sin salir del chat.'
          : viewerRole === 'host'
            ? 'La operación libre ya quedó abierta en el chat. Cuando lo tengas claro, respondé por acá.'
            : 'Tu operación libre ya quedó abierta por chat. Las fechas no se bloquean y, si responden, siguen coordinando desde acá.',
        nextActor: 'host',
        nextActorLabel: 'Anfitrión',
        nextStepLabel: viewerRole === 'host'
          ? 'Responder por chat'
          : 'Esperar respuesta',
        primaryActionLabel: viewerRole === 'host'
          ? input.mode === 'protected' ? 'Aceptar solicitud' : 'Aceptar propuesta'
          : undefined,
      });
    case 'request-not-advanced':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'No avanzó',
        description: viewerRole === 'host'
          ? 'Marcaste que no podés avanzar con esta reserva por ahora.'
          : 'No se pudo avanzar con esta reserva.',
        supportText: viewerRole === 'host'
          ? 'El chat sigue abierto por si quieren recoordinar o dejar una nueva propuesta por acá.'
          : 'El anfitrión no puede avanzar en este momento. Podés seguir conversando o buscar otras opciones.',
        nextActor: 'none',
        nextActorLabel: 'Sin acción pendiente',
        nextStepLabel: 'Seguir por chat si hace falta',
      });
    case 'deposit-choice':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Pendiente seña',
        description: viewerRole === 'host'
          ? 'Ya acordaron seguir. Ahora el huésped define cómo resolver la seña.'
          : 'Ya acordaron seguir. Ahora podés elegir cómo avanzar con la seña.',
        supportText: viewerRole === 'host'
          ? 'La opción que elija queda visible en el chat para que el cierre sea claro.'
          : 'Si la dejás registrada acá, el acuerdo queda más claro y después siguen por chat.',
        nextActor: 'guest',
        nextActorLabel: 'Huésped',
        nextStepLabel: viewerRole === 'host' ? 'Esperar elección de seña' : 'Elegir cómo avanzar con la seña',
      });
    case 'request-accepted':
      if (input.mode === 'direct') {
        return buildFlowCopy({
          modelLabel,
          statusLabel: visibleStatus?.label ?? 'Operación libre',
          description: viewerRole === 'host'
            ? 'Ya aceptaste seguir por operación libre.'
            : 'El anfitrión aceptó seguir por operación libre.',
          supportText: 'Desde acá coordinan por chat. La app no retiene dinero, no protege la seña ni interviene en pagos externos.',
          nextActor: 'none',
          nextActorLabel: 'Sin acción pendiente',
          nextStepLabel: 'Coordinar todo por chat',
        });
      }

      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Seña protegida',
        description: viewerRole === 'host'
          ? 'La reserva ya quedó marcada con seña protegida.'
          : 'El anfitrión ya aceptó y la reserva quedó marcada con seña protegida.',
        supportText: 'La app retiene la seña solo en este modo, suma un costo por operación y prevé liberarla después del check-in doble o pasarla a revisión manual si hace falta.',
        nextActor: 'platform',
        nextActorLabel: 'Plataforma',
        nextStepLabel: 'Seguir el estado protegido',
        trackingHint: 'Por ahora solo mostramos la estructura y el estado base: el cobro todavía no se procesa dentro de la app.',
      });
    case 'protected-checkout-pending':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Seña pendiente',
        description: 'La reserva ya quedó dentro del modo de seña protegida.',
        supportText: 'Queda registrada la estructura del flujo protegido. La seña todavía no quedó confirmada dentro de la app.',
        nextActor: 'platform',
        nextActorLabel: 'Plataforma',
        nextStepLabel: 'Esperar confirmación de seña',
        trackingHint: 'Por ahora solo mostramos la estructura y el estado base: el cobro todavía no se procesa dentro de la app.',
      });
    case 'external-deposit-pending':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Operación libre',
        description: viewerRole === 'host'
          ? 'La reserva quedó en operación libre y la coordinación sigue por chat.'
          : 'La reserva quedó en operación libre y la coordinación sigue por chat.',
        supportText: 'La app no retiene dinero ni interviene sobre pagos o señas coordinados por fuera.',
        nextActor: viewerRole === 'guest' ? 'guest' : 'none',
        nextActorLabel: viewerRole === 'guest' ? 'Huésped' : 'Sin acción pendiente',
        nextStepLabel: viewerRole === 'guest' ? 'Coordinar por chat' : 'Seguir por chat si hace falta',
      });
    case 'direct-deposit-reported':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Seña registrada',
        description: 'La seña ya quedó registrada en la conversación.',
        supportText: 'Ahora el anfitrión tiene que confirmar la recepción para cerrar la reserva.',
        nextActor: 'host',
        nextActorLabel: 'Anfitrión',
        nextStepLabel: 'Confirmar recepción',
        primaryActionLabel: 'Confirmar recepción',
        directDepositHint: 'Revisá que el titular coincida con quien publica antes de transferir.',
      });
    case 'reservation-confirmed':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Confirmada',
        description: 'Todo listo para esas fechas.',
        supportText: viewerRole === 'host'
          ? 'Ya pueden coordinar la llegada por el chat.'
          : 'Ya podés coordinar tranquilo la llegada por el chat.',
        nextActor: 'none',
        nextActorLabel: 'Sin acción pendiente',
        nextStepLabel: 'Coordinar llegada por chat',
      });
    case 'protected-deposit-held':
      if (state === 'guest_checkin_confirmed') {
        return buildFlowCopy({
          modelLabel,
          statusLabel: visibleStatus?.label ?? 'Check-in confirmado',
          description: viewerRole === 'host'
            ? 'El huésped ya confirmó que llegó.'
            : 'Ya registraste que llegaste a la propiedad.',
          supportText: viewerRole === 'host'
            ? 'Ahora falta que confirmes el acceso para liberar la seña.'
            : 'Ahora falta que el anfitrión confirme el acceso para liberar la seña.',
          nextActor: 'host',
          nextActorLabel: 'Anfitrión',
          nextStepLabel: 'Confirmar acceso',
          primaryActionLabel: viewerRole === 'host' ? 'Confirmar acceso' : undefined,
          secondaryActionLabel: viewerRole === 'guest' ? 'Reportar un problema' : undefined,
          pendingActionHint: viewerRole === 'guest' ? 'La seña se libera cuando el anfitrión confirma el acceso.' : undefined,
        });
      }

      if (state === 'host_access_confirmed') {
        return buildFlowCopy({
          modelLabel,
          statusLabel: visibleStatus?.label ?? 'Acceso confirmado',
          description: viewerRole === 'guest'
            ? 'El anfitrión ya confirmó el acceso a la propiedad.'
            : 'Ya registraste que el acceso quedó resuelto.',
          supportText: viewerRole === 'guest'
            ? 'Ahora falta tu confirmación de llegada para liberar la seña.'
            : 'Ahora falta que el huésped confirme la llegada para liberar la seña.',
          nextActor: 'guest',
          nextActorLabel: 'Huésped',
          nextStepLabel: 'Confirmar llegada',
          pendingActionHint: viewerRole === 'host' ? 'La seña se libera cuando el huésped confirma la llegada.' : undefined,
        });
      }

      if (state === 'checkin_pending') {
        return buildFlowCopy({
          modelLabel,
          statusLabel: visibleStatus?.label ?? 'Check-in pendiente',
          description: 'La seña ya quedó confirmada y ahora falta validar el ingreso.',
          supportText: viewerRole === 'host'
            ? 'Cuando el huésped confirme la llegada, vas a poder confirmar el acceso. Si no se presenta, también podés informar un no show.'
            : 'Cuando llegues, confirmá el ingreso desde acá. Si algo falla, podés reportarlo.',
          nextActor: 'guest',
          nextActorLabel: 'Huésped',
          nextStepLabel: viewerRole === 'host' ? 'Esperar confirmación de llegada' : 'Confirmar llegada',
          primaryActionLabel: viewerRole === 'guest' ? 'Confirmar llegada' : viewerRole === 'host' ? 'Informar no show' : undefined,
          secondaryActionLabel: viewerRole === 'guest' ? 'Reportar un problema' : undefined,
          pendingActionHint: viewerRole === 'host'
            ? 'Informar no show se habilita el día del ingreso.'
            : 'Las confirmaciones del ingreso se habilitan desde el día del check-in.',
        });
      }

      if (state === 'deposit_confirmed') {
        return buildFlowCopy({
          modelLabel,
          statusLabel: visibleStatus?.label ?? 'Seña confirmada',
          description: 'La seña ya quedó confirmada dentro de la app.',
          supportText: 'El siguiente paso es validar el ingreso cuando llegue la fecha de check-in.',
          nextActor: 'none',
          nextActorLabel: 'Sin acción pendiente',
          nextStepLabel: 'Esperar check-in',
          pendingActionHint: viewerRole === 'host'
            ? 'Informar no show se habilita el día del ingreso.'
            : 'Las confirmaciones del ingreso se habilitan desde el día del check-in.',
        });
      }

      if (viewerRole === 'host') {
        return buildFlowCopy({
          modelLabel,
          statusLabel: visibleStatus?.label ?? 'Seña registrada',
          description: 'La seña ya quedó registrada.',
          supportText: 'Ahora pueden coordinar la llegada por el chat.',
          trackingHint: 'Si hace falta intervención más adelante, también queda registrada desde esta reserva.',
          nextActor: 'none',
          nextActorLabel: 'Sin acción pendiente',
          nextStepLabel: 'Coordinar llegada por chat',
          primaryActionLabel: 'Reportar un problema',
          pendingActionHint: 'Informar no show se habilita el día del ingreso.',
        });
      }

      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Seña registrada',
        description: 'La seña ya quedó registrada.',
        supportText: 'Ahora ya podés coordinar la llegada por el chat.',
        trackingHint: 'Si surge un problema al llegar, podés reportarlo desde acá.',
        nextActor: 'none',
        nextActorLabel: 'Sin acción pendiente',
        nextStepLabel: 'Coordinar llegada por chat',
        primaryActionLabel: 'Confirmar llegada',
        secondaryActionLabel: 'Reportar un problema',
        pendingActionHint: 'Confirmar llegada o reportar un problema se habilitan el día del ingreso.',
      });
    case 'protected-deposit-review':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Revisión manual',
        description: 'Quedó reportado un problema en esta reserva.',
        supportText: 'La plataforma está revisando qué pasó antes de definir cómo sigue.',
        nextActor: 'platform',
        nextActorLabel: 'Plataforma',
        nextStepLabel: 'Esperar revisión',
      });
    case 'protected-no-show-pending':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Revisión manual',
        description: 'Quedó reportado un problema con la llegada.',
        supportText: 'La plataforma está revisando qué pasó antes de decidir cómo sigue.',
        nextActor: 'platform',
        nextActorLabel: 'Plataforma',
        nextStepLabel: 'Esperar revisión',
      });
    case 'protected-deposit-released':
      return buildFlowCopy({
        modelLabel,
        statusLabel: visibleStatus?.label ?? 'Seña liberada',
        description: 'Las dos confirmaciones ya quedaron registradas.',
        supportText: 'La seña ya salió de custodia y el chat sigue disponible para cualquier coordinación final.',
        nextActor: 'none',
        nextActorLabel: 'Sin acción pendiente',
        nextStepLabel: 'Seguir por chat si hace falta',
      });
    case 'guest-cancelled':
      return buildFlowCopy({
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
      });
    case 'host-cancelled':
      return buildFlowCopy({
        modelLabel,
        statusLabel: 'Canceló el anfitrión',
        description: 'La reserva ya no sigue activa.',
        supportText: input.mode === 'protected' || input.depositType === 'protected'
          ? 'Si la seña ya estaba en custodia, se devuelve.'
          : 'La plataforma solo informa el estado. Si hubo una seña, la resolución queda entre ustedes.',
        nextActor: input.mode === 'protected' || input.depositType === 'protected' ? 'platform' : 'none',
        nextActorLabel: input.mode === 'protected' || input.depositType === 'protected' ? 'Plataforma' : 'Sin acción pendiente',
        nextStepLabel: input.mode === 'protected' || input.depositType === 'protected' ? 'Esperar devolución' : 'Seguir por chat si hace falta',
      });
    default:
      return {
        stage: null,
        state: null,
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