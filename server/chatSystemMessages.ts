type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

type ReservationDepositType = 'external' | 'protected';

type ReservationDepositStatus = 'external_pending' | 'reported' | 'confirmed' | 'held' | 'review' | 'pending_confirmation' | 'released' | 'refunded';

type ReservationRequestMode = 'direct' | 'protected';

type ReservationRequestStatus = 'pending' | 'accepted' | 'not_advanced';

export type ChatSystemMessageKey =
  | 'conversation-start'
  | 'request-sent'
  | 'request-not-advanced'
  | 'request-accepted'
  | 'before-payment'
  | 'deposit-choice'
  | 'protected-payment'
  | 'external-deposit'
  | 'direct-after-payment'
  | 'protected-after-payment'
  | 'before-arrival'
  | 'protected-arrival'
  | 'problem'
  | 'review-prompt';

export type ChatSystemMessage = {
  key: ChatSystemMessageKey;
  content: string;
};

export type ChatSystemMessageContext = {
  requestMode?: ReservationRequestMode | null;
  depositType?: ReservationDepositType | null;
  requestStatus?: ReservationRequestStatus | null;
  bookingStatus?: BookingStatus | null;
  depositStatus?: ReservationDepositStatus | null;
  requestStartDate?: string | null;
  requestEndDate?: string | null;
  bookingStartDate?: string | null;
  bookingEndDate?: string | null;
  today?: string | null;
};

export const CHAT_SYSTEM_MESSAGE_COPY: Record<ChatSystemMessageKey, string> = {
  'conversation-start': 'Podés coordinar todo por acá. Evitá compartir datos sensibles o pagos por fuera hasta tener claro el acuerdo.',
  'request-sent': 'La solicitud o la propuesta ya quedó enviada en el chat.',
  'request-not-advanced': 'No se pudo avanzar con esta reserva.',
  'request-accepted': 'La otra parte aceptó avanzar.',
  'before-payment': 'Antes de avanzar con la seña, confirmá que los datos coincidan con el anfitrión del aviso.',
  'deposit-choice': 'Podés resolver la seña acá para dejar todo claro y confirmado entre ambos. Si preferís, también podés coordinarla por fuera.',
  'protected-payment': 'Si elegís dejar la seña en la app, queda registrada y se libera cuando se confirme la llegada.',
  'external-deposit': 'Eligieron coordinar la seña por fuera. Si cambian de idea antes de informarla, todavía pueden resolverla acá.',
  'direct-after-payment': 'La seña ya quedó informada y el siguiente paso depende de la otra parte.',
  'protected-after-payment': 'La reserva sigue avanzando dentro de la app y la seña cambia de estado según la llegada.',
  'before-arrival': 'Coordiná horario y detalles con el anfitrión antes de llegar.',
  'protected-arrival': 'Cuando estés en el lugar, podés confirmar tu llegada para continuar.',
  problem: 'Si algo no coincide con lo acordado, reportalo desde acá para dejarlo asentado.',
  'review-prompt': 'La estadía ya terminó. Si querés, dejá una opinión para ayudar a otros usuarios.',
};

const PROTECTED_AFTER_PAYMENT_STATUSES = new Set<ReservationDepositStatus>([
  'held',
  'review',
  'pending_confirmation',
  'released',
  'refunded',
]);

const DIRECT_AFTER_PAYMENT_STATUSES = new Set<ReservationDepositStatus>([
  'reported',
  'confirmed',
]);

const EXTERNAL_COORDINATION_STATUSES = new Set<ReservationDepositStatus>([
  'external_pending',
]);

const getEffectiveRequestMode = (context: ChatSystemMessageContext): ReservationRequestMode | null => (
  context.requestMode === 'direct' || context.requestMode === 'protected'
    ? context.requestMode
    : null
);

const getEffectiveDepositType = (context: ChatSystemMessageContext, mode: ReservationRequestMode | null): ReservationDepositType | null => {
  if (context.depositType === 'external' || context.depositType === 'protected') {
    return context.depositType;
  }

  if (mode === 'protected' && context.depositStatus && PROTECTED_AFTER_PAYMENT_STATUSES.has(context.depositStatus)) {
    return 'protected';
  }

  if ((mode === 'direct' || mode === 'protected') && context.depositStatus && DIRECT_AFTER_PAYMENT_STATUSES.has(context.depositStatus)) {
    return 'external';
  }

  return null;
};

const getEffectiveRequestStatus = (
  context: ChatSystemMessageContext,
  mode: ReservationRequestMode | null,
): ReservationRequestStatus => {
  if (context.requestStatus === 'not_advanced') {
    return 'not_advanced';
  }

  if (context.requestStatus === 'accepted') {
    return 'accepted';
  }

  if (mode === 'protected' && context.bookingStatus === 'confirmed') {
    return 'accepted';
  }

  return 'pending';
};

const getRequestStartDate = (context: ChatSystemMessageContext) => (
  context.requestStartDate ?? context.bookingStartDate ?? null
);

const getRequestEndDate = (context: ChatSystemMessageContext) => (
  context.requestEndDate ?? context.bookingEndDate ?? null
);

const getBookingStartDate = (context: ChatSystemMessageContext) => (
  context.bookingStartDate ?? context.requestStartDate ?? null
);

const isDateReached = (targetDate?: string | null, today?: string | null) => (
  Boolean(targetDate && today && targetDate <= today)
);

export const getRequestSentMessage = (mode: ReservationRequestMode) => (
  mode === 'protected'
    ? 'Tu solicitud ya quedó registrada. El anfitrión puede responder por acá.'
    : 'Tu propuesta fue enviada por chat. El anfitrión puede responder por acá.'
);

export const getRequestAcceptedMessage = (mode: ReservationRequestMode, depositType?: ReservationDepositType | null) => {
  if (mode === 'protected' && depositType !== 'protected') {
    return 'Ya pueden avanzar con la seña y dejarlo confirmado. Podés resolverla acá para dejar todo claro entre ambos o coordinarla por fuera si preferís.';
  }

  if (mode === 'protected') {
    return 'Ya pueden avanzar con la seña dentro de la app y dejarlo confirmado. Queda registrada y se libera cuando se confirme la llegada.';
  }

  return 'Ya pueden avanzar con la seña y dejarlo confirmado.';
};

export const getRequestNotAdvancedMessage = () => CHAT_SYSTEM_MESSAGE_COPY['request-not-advanced'];

const getDirectAfterPaymentMessage = (depositStatus: ReservationDepositStatus | null) => {
  if (depositStatus === 'reported') {
    return 'El huésped informó la seña. Falta confirmar la recepción para dejar la reserva confirmada.';
  }

  return 'La seña ya quedó confirmada. La reserva está registrada y pueden seguir por chat con la llegada.';
};

const getProtectedAfterPaymentMessage = (depositStatus: ReservationDepositStatus | null) => {
  switch (depositStatus) {
    case 'held':
      return 'La seña quedó en custodia. Se libera cuando se confirme la llegada.';
    case 'review':
      return 'La llegada quedó en revisión y la seña sigue en pausa mientras la plataforma analiza qué pasó.';
    case 'pending_confirmation':
      return 'La llegada quedó en revisión y la seña sigue en pausa mientras se revisa el no show informado.';
    case 'released':
      return 'La llegada ya quedó confirmada y la seña salió de custodia.';
    case 'refunded':
      return 'La reserva se cerró y la seña ya fue devuelta.';
    default:
      return CHAT_SYSTEM_MESSAGE_COPY['protected-after-payment'];
  }
};

export const getChatSystemMessages = (context: ChatSystemMessageContext): ChatSystemMessage[] => {
  const messages: ChatSystemMessage[] = [
    {
      key: 'conversation-start',
      content: CHAT_SYSTEM_MESSAGE_COPY['conversation-start'],
    },
  ];

  const mode = getEffectiveRequestMode(context);
  const depositType = getEffectiveDepositType(context, mode);
  const requestStatus = getEffectiveRequestStatus(context, mode);
  const depositStatus = context.depositStatus ?? null;
  const requestStartDate = getRequestStartDate(context);
  const requestEndDate = getRequestEndDate(context);
  const bookingStartDate = getBookingStartDate(context);
  const hasRequest = Boolean(mode && requestStartDate && requestEndDate);
  const directAfterPayment = (mode === 'direct' || depositType === 'external') && depositStatus !== null && DIRECT_AFTER_PAYMENT_STATUSES.has(depositStatus);
  const protectedAfterPayment = depositType === 'protected' && depositStatus !== null && PROTECTED_AFTER_PAYMENT_STATUSES.has(depositStatus);
  const externalDepositCoordination = depositType === 'external' && depositStatus !== null && EXTERNAL_COORDINATION_STATUSES.has(depositStatus);
  const hasDirectArrivalCoordinationStage = mode === 'direct' && depositStatus === 'confirmed' && context.bookingStatus === 'confirmed';
  const hasProtectedArrivalCoordinationStage = depositType === 'protected' && depositStatus === 'held' && context.bookingStatus === 'confirmed';
  const hasDepositChoiceStage = mode === 'protected'
    && requestStatus === 'accepted'
    && context.bookingStatus === 'confirmed'
    && depositType === null
    && depositStatus === null;
  const isBeforePaymentStage = requestStatus === 'accepted'
    && context.bookingStatus !== 'cancelled'
    && context.bookingStatus !== 'completed'
    && !directAfterPayment
    && !externalDepositCoordination
    && !protectedAfterPayment;
  const hasArrivalCoordinationStage = hasDirectArrivalCoordinationStage || hasProtectedArrivalCoordinationStage;
  const hasProtectedArrivalConfirmationStage = depositType === 'protected'
    && depositStatus === 'held'
    && hasArrivalCoordinationStage
    && isDateReached(bookingStartDate, context.today ?? null);

  if (hasRequest && mode) {
    messages.push({
      key: 'request-sent',
      content: getRequestSentMessage(mode),
    });
  }

  if (requestStatus === 'not_advanced') {
    messages.push({
      key: 'request-not-advanced',
      content: getRequestNotAdvancedMessage(),
    });
  }

  if (requestStatus === 'accepted' && mode) {
    messages.push({
      key: 'request-accepted',
      content: getRequestAcceptedMessage(mode, depositType),
    });
  }

  if (isBeforePaymentStage) {
    messages.push({
      key: 'before-payment',
      content: CHAT_SYSTEM_MESSAGE_COPY['before-payment'],
    });

    if (hasDepositChoiceStage) {
      messages.push({
        key: 'deposit-choice',
        content: CHAT_SYSTEM_MESSAGE_COPY['deposit-choice'],
      });
    } else if (depositType === 'protected') {
      messages.push({
        key: 'protected-payment',
        content: CHAT_SYSTEM_MESSAGE_COPY['protected-payment'],
      });
    }
  }

  if (externalDepositCoordination) {
    messages.push({
      key: 'external-deposit',
      content: CHAT_SYSTEM_MESSAGE_COPY['external-deposit'],
    });
  }

  if (directAfterPayment) {
    messages.push({
      key: 'direct-after-payment',
      content: getDirectAfterPaymentMessage(depositStatus),
    });
  }

  if (protectedAfterPayment) {
    messages.push({
      key: 'protected-after-payment',
      content: getProtectedAfterPaymentMessage(depositStatus),
    });
  }

  if (hasArrivalCoordinationStage) {
    messages.push({
      key: 'before-arrival',
      content: CHAT_SYSTEM_MESSAGE_COPY['before-arrival'],
    });
  }

  if (hasProtectedArrivalConfirmationStage) {
    messages.push({
      key: 'protected-arrival',
      content: CHAT_SYSTEM_MESSAGE_COPY['protected-arrival'],
    });
    messages.push({
      key: 'problem',
      content: CHAT_SYSTEM_MESSAGE_COPY.problem,
    });
  }

  if (context.bookingStatus === 'completed') {
    messages.push({
      key: 'review-prompt',
      content: CHAT_SYSTEM_MESSAGE_COPY['review-prompt'],
    });
  }

  return messages;
};