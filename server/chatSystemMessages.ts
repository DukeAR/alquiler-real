type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

type ReservationDepositStatus = 'reported' | 'confirmed' | 'held' | 'review' | 'pending_confirmation' | 'released' | 'refunded';

type ReservationRequestMode = 'direct' | 'protected';

type ReservationRequestStatus = 'pending' | 'accepted';

export type ChatSystemMessageKey =
  | 'conversation-start'
  | 'request-sent'
  | 'request-accepted'
  | 'before-payment'
  | 'protected-payment'
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
  'conversation-start': 'Podés hacer todas las preguntas necesarias antes de avanzar.',
  'request-sent': 'La solicitud o la propuesta ya quedó enviada en el chat.',
  'request-accepted': 'La otra parte aceptó avanzar.',
  'before-payment': 'La reserva sigue pendiente hasta que se confirme la seña.',
  'protected-payment': 'La reserva sigue pendiente hasta que se confirme la seña.',
  'direct-after-payment': 'La seña ya quedó informada y el siguiente paso depende de la otra parte.',
  'protected-after-payment': 'La reserva protegida sigue avanzando y la seña cambia de estado según la llegada.',
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

const getEffectiveRequestMode = (context: ChatSystemMessageContext): ReservationRequestMode | null => (
  context.requestMode === 'direct' || context.requestMode === 'protected'
    ? context.requestMode
    : null
);

const getEffectiveRequestStatus = (
  context: ChatSystemMessageContext,
  mode: ReservationRequestMode | null,
): ReservationRequestStatus => {
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
    ? 'Tu solicitud protegida fue enviada. El anfitrión puede responder por acá.'
    : 'Tu propuesta fue enviada por chat. El anfitrión puede responder por acá.'
);

export const getRequestAcceptedMessage = (mode: ReservationRequestMode) => (
  mode === 'protected'
    ? 'Ya pueden avanzar con una reserva protegida. La seña queda en custodia y se libera cuando se confirme la llegada.'
    : 'Ya pueden avanzar con la seña de esta reserva.'
);

const getDirectAfterPaymentMessage = (depositStatus: ReservationDepositStatus | null) => {
  if (depositStatus === 'reported') {
    return 'El huésped informó la seña. Falta confirmar la recepción.';
  }

  return 'La seña ya quedó confirmada. La reserva está registrada y pueden seguir por chat con los detalles finales.';
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
  const requestStatus = getEffectiveRequestStatus(context, mode);
  const depositStatus = context.depositStatus ?? null;
  const requestStartDate = getRequestStartDate(context);
  const requestEndDate = getRequestEndDate(context);
  const bookingStartDate = getBookingStartDate(context);
  const hasRequest = Boolean(mode && requestStartDate && requestEndDate);
  const directAfterPayment = mode === 'direct' && depositStatus !== null && DIRECT_AFTER_PAYMENT_STATUSES.has(depositStatus);
  const protectedAfterPayment = mode === 'protected' && depositStatus !== null && PROTECTED_AFTER_PAYMENT_STATUSES.has(depositStatus);
  const hasDirectArrivalCoordinationStage = mode === 'direct' && depositStatus === 'confirmed' && context.bookingStatus === 'confirmed';
  const hasProtectedArrivalCoordinationStage = mode === 'protected' && depositStatus === 'held' && context.bookingStatus === 'confirmed';
  const isBeforePaymentStage = requestStatus === 'accepted'
    && context.bookingStatus !== 'cancelled'
    && context.bookingStatus !== 'completed'
    && !directAfterPayment
    && !protectedAfterPayment;
  const hasArrivalCoordinationStage = hasDirectArrivalCoordinationStage || hasProtectedArrivalCoordinationStage;
  const hasProtectedArrivalConfirmationStage = mode === 'protected'
    && depositStatus === 'held'
    && hasArrivalCoordinationStage
    && isDateReached(bookingStartDate, context.today ?? null);

  if (hasRequest && mode) {
    messages.push({
      key: 'request-sent',
      content: getRequestSentMessage(mode),
    });
  }

  if (requestStatus === 'accepted' && mode) {
    messages.push({
      key: 'request-accepted',
      content: getRequestAcceptedMessage(mode),
    });
  }

  if (isBeforePaymentStage) {
    messages.push({
      key: 'before-payment',
      content: CHAT_SYSTEM_MESSAGE_COPY['before-payment'],
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