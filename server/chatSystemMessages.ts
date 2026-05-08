type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

type ReservationDepositType = 'external' | 'protected';

type ReservationDepositStatus = 'external_pending' | 'reported' | 'confirmed' | 'checkout_pending' | 'held' | 'review' | 'pending_confirmation' | 'released' | 'refunded';

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
  'conversation-start': 'Podés hablar y coordinar todo por acá sin salir de Alquiler Real.',
  'request-sent': 'La propuesta ya quedó enviada en el chat.',
  'request-not-advanced': 'No se pudo avanzar con esta reserva.',
  'request-accepted': 'Ya están de acuerdo. Falta resolver la seña.',
  'before-payment': 'Antes de transferir, verificá que el titular coincida.',
  'deposit-choice': 'Cómo querés avanzar con la seña.',
  'protected-payment': 'La reserva quedó marcada con seña protegida. Por ahora no procesamos pagos dentro de la app.',
  'external-deposit': 'Esta reserva quedó en operación libre. Toda la coordinación sigue por chat y la app no interviene en pagos externos.',
  'direct-after-payment': 'Seña registrada. Falta confirmar la recepción.',
  'protected-after-payment': 'Seña registrada. Ya pueden coordinar la llegada por el chat.',
  'before-arrival': 'Ya pueden coordinar horario y llegada por acá.',
  'protected-arrival': 'Cuando llegues, podés confirmar la llegada desde acá.',
  problem: 'Si hace falta intervención, podés reportar un problema desde acá.',
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

  if (
    mode === 'protected'
    && (
      context.depositStatus === 'checkout_pending'
      || (context.depositStatus ? PROTECTED_AFTER_PAYMENT_STATUSES.has(context.depositStatus) : false)
    )
  ) {
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
    ? 'Solicitud enviada. Ahora le toca responder al anfitrión.'
    : 'Propuesta enviada. Ahora le toca responder al anfitrión.'
);

export const getRequestAcceptedMessage = (mode: ReservationRequestMode, depositType?: ReservationDepositType | null) => {
  if (mode === 'protected' && depositType === 'external') {
    return 'Ya están de acuerdo. La coordinación sigue como operación libre por este chat.';
  }

  if (mode === 'protected') {
    return 'Ya están de acuerdo. La reserva quedó marcada con seña protegida.';
  }

  return 'Ya están de acuerdo. Siguen coordinando por este chat.';
};

export const getRequestNotAdvancedMessage = () => CHAT_SYSTEM_MESSAGE_COPY['request-not-advanced'];

const getDirectAfterPaymentMessage = (depositStatus: ReservationDepositStatus | null) => {
  if (depositStatus === 'reported') {
    return 'Seña registrada. Ahora falta confirmar la recepción.';
  }

  return 'Reserva confirmada. Ya pueden coordinar la llegada por el chat.';
};

const getProtectedAfterPaymentMessage = (depositStatus: ReservationDepositStatus | null) => {
  switch (depositStatus) {
    case 'held':
      return 'Seña registrada. Ya pueden coordinar la llegada por el chat.';
    case 'review':
      return 'Problema reportado. La plataforma está revisando qué pasó.';
    case 'pending_confirmation':
      return 'Problema reportado. La plataforma está revisando la llegada.';
    case 'released':
      return 'Reserva confirmada. Todo listo para esas fechas.';
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
  const hasProtectedSetupStage = mode === 'protected'
    && requestStatus === 'accepted'
    && context.bookingStatus === 'confirmed'
    && depositType !== 'external'
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

  if (hasProtectedSetupStage) {
    messages.push({
      key: 'protected-payment',
      content: CHAT_SYSTEM_MESSAGE_COPY['protected-payment'],
    });
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