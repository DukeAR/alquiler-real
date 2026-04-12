import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { showToast } from '../lib/toast';
import { LoadingState } from './LoadingState';
import { cn } from '../lib/utils';
import { 
  acceptConversationRequest, confirmArrival, confirmDirectDeposit, fetchConversations, fetchMessages, notAdvanceConversationRequest, payProtectedDeposit, reportArrivalProblem, reportDirectDeposit, selectExternalDeposit, selectProtectedDeposit, sendMessage, 
  Conversation, Message 
} from '../services/geminiService';
import { useAuth } from '../hooks/useAuth';
import { type ReservationRequestContext } from '../types';
import { formatBookingDateShort, getBookingDateOnlyValue, isBookingCheckInReached } from '../lib/bookingDates';
import { PLATFORM_DIRECT_FLOW_NOTE, PLATFORM_PROTECTED_FLOW_NOTE } from '../lib/platformTerms';
import { getProtectedDepositPricingFromBooking } from '../lib/protectedDeposit';
import { getReservationFlowCopy, getReservationVisibleStatus } from '../lib/reservationFlow';
import { trackFrontendFunnelEvent } from '../lib/funnelTracking';
import { ChatContextBar } from './ui/ChatContextBar';
import { DepositChoiceBlock } from './ui/DepositChoiceBlock';
import { ReservationConfirmedState } from './ui/ReservationConfirmedState';
import { SystemEventMessage } from './ui/SystemEventMessage';

type InlineThreadNoticeTone = 'neutral' | 'warning' | 'brand';

type InlineThreadNotice = {
  key: string;
  body: string;
  title?: string;
  tone?: InlineThreadNoticeTone;
};

type SystemMessageActionKind = 'report-direct-deposit' | 'pay-protected-deposit' | 'confirm-direct-deposit' | 'select-protected-deposit';

type ThreadSystemMessagePresentation = {
  content: string;
  emphasis: 'pill' | 'card';
  tone?: 'neutral' | 'brand' | 'warning' | 'success';
  hidden?: boolean;
  supplementaryContent?: string;
  action?: {
    kind: SystemMessageActionKind;
    label: string;
    loading: boolean;
    onClick: () => void;
  };
};

type CompactReservationStatusTone = 'neutral' | 'brand' | 'success' | 'warning';

type CompactReservationStatus = {
  key: string;
  label: string;
  tone: CompactReservationStatusTone;
};

const compactReservationStatusToneClasses: Record<CompactReservationStatusTone, string> = {
  neutral: 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  brand: 'border-brand/15 bg-brand/8 text-brand dark:border-brand/20 dark:bg-brand/10 dark:text-brand-light',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300',
};

const normalizeSafetyText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const containsTransferKeywords = (value?: string) => {
  if (!value) {
    return false;
  }

  return /\b(transferencia|transferir|cbu|alias)\b/.test(normalizeSafetyText(value));
};

const sortThreadTimeline = (items: Message[]) => items
  .map((message, index) => ({
    message,
    index,
    timestamp: parseTimestampValue(message.created_at)?.getTime() ?? Number.MAX_SAFE_INTEGER,
  }))
  .sort((left, right) => left.timestamp - right.timestamp || left.index - right.index)
  .map(({ message }) => message);

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const formatRequestDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const normalizedDate = getBookingDateOnlyValue(value);
  return normalizedDate ? formatBookingDateShort(normalizedDate) : value;
};

const formatCompactDateRange = (startDate?: string, endDate?: string) => {
  const startLabel = formatRequestDate(startDate);
  const endLabel = formatRequestDate(endDate);

  if (!startLabel || !endLabel) {
    return startLabel || endLabel || null;
  }

  return `${startLabel}–${endLabel}`;
};

type HostCloseIntent = 'advance-deposit' | 'confirm-reservation';

type HostClosingChip = {
  key: HostCloseIntent;
  label: string;
  message: string;
  intent: HostCloseIntent;
};

const buildHostClosingChips = (requestContext: ReservationRequestContext | null) => {
  const advanceWithDepositMessage = requestContext?.mode === 'protected'
    ? 'Si te parece bien, podemos avanzar con la seña y dejarlo confirmado.'
    : 'Si te parece bien, podemos avanzar con la seña y dejarlo confirmado.';

  return [
    {
      key: 'advance-deposit',
      label: 'Avanzar con la seña',
      message: advanceWithDepositMessage,
      intent: 'advance-deposit',
    },
  ] as const satisfies HostClosingChip[];
};

const detectHostCloseIntent = (value: string): HostCloseIntent | null => {
  const normalizedValue = normalizeSafetyText(value);
  const mentionsDeposit = normalizedValue.includes('sena');
  const mentionsClose = /(avanz|confirm|cerr)/.test(normalizedValue);

  if (mentionsDeposit && mentionsClose) {
    return 'advance-deposit';
  }

  if (normalizedValue.includes('dejarlo confirmado') || normalizedValue.includes('dejar la reserva confirmada')) {
    return 'confirm-reservation';
  }

  return null;
};

const formatSuggestedMessageDateRange = (requestContext: ReservationRequestContext | null) => {
  const startLabel = formatRequestDate(requestContext?.startDate);
  const endLabel = formatRequestDate(requestContext?.endDate);

  if (startLabel && endLabel) {
    return `del ${startLabel} al ${endLabel}`;
  }

  if (startLabel) {
    return `para el ${startLabel}`;
  }

  if (endLabel) {
    return `hasta ${endLabel}`;
  }

  return null;
};

const formatSuggestedMessageGuestCount = (requestContext: ReservationRequestContext | null) => {
  if (!requestContext?.guests || requestContext.guests < 1) {
    return null;
  }

  return `para ${requestContext.guests} ${requestContext.guests === 1 ? 'persona' : 'personas'}`;
};

const buildSuggestedFirstMessage = (_counterpartyName: string, requestContext: ReservationRequestContext | null) => {
  const messageParts = ['Hola, ¿cómo estás? Estoy viendo el lugar'];
  const dateRange = formatSuggestedMessageDateRange(requestContext);
  const guestCount = formatSuggestedMessageGuestCount(requestContext);

  if (dateRange) {
    messageParts.push(dateRange);
  }

  if (guestCount) {
    messageParts.push(guestCount);
  }

  return `${messageParts.join(' ')} y me interesa avanzar si está todo bien.`;
};

const NOT_ADVANCE_REASON_OPTIONS = [
  'no disponible en esas fechas',
  'no coincide con la dinámica del lugar',
  'prefiero otra coordinación',
  'otro',
] as const;

const getCompactReservationStatus = (
  input: Parameters<typeof getReservationVisibleStatus>[0],
  options?: Parameters<typeof getReservationVisibleStatus>[1],
) : CompactReservationStatus | null => {
  const visibleStatus = getReservationVisibleStatus(input, options);

  return visibleStatus
    ? {
        key: visibleStatus.key,
        label: visibleStatus.label,
        tone: visibleStatus.tone,
      }
    : null;
};

const getConversationListPreview = (
  conversation: Conversation,
  viewerRole: 'guest' | 'host',
  initialConversationId?: string,
  initialRequestContext?: ReservationRequestContext | null,
) => {
  const requestContext = getActiveRequestContext(conversation, initialConversationId, initialRequestContext);
  const flowCopy = getReservationFlowCopy({
    mode: requestContext?.mode,
    depositType: requestContext?.depositType,
    requestStatus: requestContext?.requestStatus,
    bookingStatus: requestContext?.bookingStatus,
    depositStatus: requestContext?.depositStatus,
    cancellationActor: requestContext?.cancellationActor,
    viewerRole,
  });
  const requestDeadline = flowCopy.stage === 'request-pending'
    ? getRequestDeadline(requestContext?.requestCreatedAt)
    : null;
  const isExpiredPendingRequest = Boolean(
    requestDeadline
    && flowCopy.stage === 'request-pending'
    && Date.now() > requestDeadline.getTime(),
  );

  return {
    dateRange: requestContext ? formatCompactDateRange(requestContext.startDate, requestContext.endDate) : null,
    guestsLabel: requestContext?.guests
      ? `${requestContext.guests} ${requestContext.guests === 1 ? 'persona' : 'personas'}`
      : null,
    status: getCompactReservationStatus({
      mode: requestContext?.mode,
      depositType: requestContext?.depositType,
      requestStatus: requestContext?.requestStatus,
      bookingStatus: requestContext?.bookingStatus,
      depositStatus: requestContext?.depositStatus,
      cancellationActor: requestContext?.cancellationActor,
      viewerRole,
    }, {
      isExpiredPendingRequest,
    }) ?? {
      key: 'chat-abierto',
      label: 'Chat abierto',
      tone: 'neutral' as const,
    },
  };
};

const getNightCount = (startDate?: string, endDate?: string) => {
  const normalizedStartDate = getBookingDateOnlyValue(startDate);
  const normalizedEndDate = getBookingDateOnlyValue(endDate);

  if (!normalizedStartDate || !normalizedEndDate) {
    return 0;
  }

  const [startYear, startMonth, startDay] = normalizedStartDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = normalizedEndDate.split('-').map(Number);
  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
};

const REQUEST_RESPONSE_WINDOW_MS = 24 * 60 * 60 * 1000;

const parseTimestampValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getRequestDeadline = (requestCreatedAt?: string) => {
  const requestCreatedAtDate = parseTimestampValue(requestCreatedAt);

  if (!requestCreatedAtDate) {
    return null;
  }

  return new Date(requestCreatedAtDate.getTime() + REQUEST_RESPONSE_WINDOW_MS);
};

const getConversationRequestStatus = (conversation: Conversation | null) => {
  if (!conversation) {
    return 'pending' as const;
  }

  if (conversation.requestStatus === 'not_advanced') {
    return 'not_advanced' as const;
  }

  if (conversation.requestStatus === 'accepted') {
    return 'accepted' as const;
  }

  if (
    conversation.bookingStatus === 'cancelled'
    && conversation.cancellationActor !== 'guest'
    && conversation.cancellationActor !== 'host'
    && !conversation.depositStatus
  ) {
    return 'not_advanced' as const;
  }

  if ((conversation.requestMode === 'protected' || conversation.booking_id) && conversation.bookingStatus === 'confirmed') {
    return 'accepted' as const;
  }

  return 'pending' as const;
};

const getEffectiveDepositType = (input: {
  mode?: ReservationRequestContext['mode'] | null;
  depositType?: ReservationRequestContext['depositType'] | Conversation['depositType'];
  depositStatus?: ReservationRequestContext['depositStatus'] | Conversation['depositStatus'];
}) => {
  if (input.depositType === 'external' || input.depositType === 'protected') {
    return input.depositType;
  }

  if (
    input.depositStatus === 'held'
    || input.depositStatus === 'review'
    || input.depositStatus === 'pending_confirmation'
    || input.depositStatus === 'released'
    || input.depositStatus === 'refunded'
  ) {
    return 'protected' as const;
  }

  if (
    input.depositStatus === 'external_pending'
    || input.depositStatus === 'reported'
    || input.depositStatus === 'confirmed'
  ) {
    return 'external' as const;
  }

  if (input.mode === 'direct') {
    return 'external' as const;
  }

  return undefined;
};

const getActiveRequestContext = (
  activeConversation: Conversation | null,
  initialConversationId?: string,
  initialRequestContext?: ReservationRequestContext | null,
): ReservationRequestContext | null => {
  if (!activeConversation) {
    return null;
  }

  const requestMode = activeConversation.requestMode === 'direct' || activeConversation.requestMode === 'protected'
    ? activeConversation.requestMode
    : activeConversation.booking_id
      ? 'protected'
      : null;
  const requestStatus = getConversationRequestStatus(activeConversation);
  const startDate = activeConversation.requestStartDate || activeConversation.startDate;
  const endDate = activeConversation.requestEndDate || activeConversation.endDate;
  const guests = Number(activeConversation.requestGuests ?? activeConversation.guests) || 1;
  const totalPrice = Number(activeConversation.requestTotalPrice ?? activeConversation.totalPrice) || 0;
  const requestCreatedAt = activeConversation.requestCreatedAt
    || (initialConversationId && activeConversation.id === initialConversationId ? initialRequestContext?.requestCreatedAt : undefined);
  const depositType = getEffectiveDepositType({
    mode: requestMode,
    depositType: activeConversation.depositType,
    depositStatus: activeConversation.depositStatus,
  });

  if (requestMode && startDate && endDate) {
    const nights = getNightCount(startDate, endDate);

    return {
      propertyId: activeConversation.property_id,
      propertyTitle: activeConversation.propertyTitle || 'Propiedad',
      hostName: activeConversation.hostName || 'Anfitrión',
      startDate,
      endDate,
      guests,
      nightly: nights > 0 ? totalPrice / nights : 0,
      nights,
      totalPrice,
      mode: requestMode,
      depositType,
      requestCreatedAt,
      requestStatus,
      depositStatus: activeConversation.depositStatus,
      protectedDepositPricing: activeConversation.protectedDepositPricing,
      depositPaymentReference: activeConversation.depositPaymentReference,
      cancellationActor: activeConversation.cancellationActor,
      bookingId: activeConversation.booking_id,
      bookingStatus: activeConversation.bookingStatus,
    };
  }

  if (initialConversationId && activeConversation.id === initialConversationId && initialRequestContext) {
    return {
      ...initialRequestContext,
      requestCreatedAt: initialRequestContext.requestCreatedAt,
      requestStatus: initialRequestContext.requestStatus ?? 'pending',
      depositStatus: initialRequestContext.depositStatus,
      cancellationActor: initialRequestContext.cancellationActor,
    };
  }

  return null;
};

export const SecureChat: React.FC<{ initialConversationId?: string; initialRequestContext?: ReservationRequestContext | null }> = ({
  initialConversationId,
  initialRequestContext = null,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState(false);
  const [pendingHostCloseIntent, setPendingHostCloseIntent] = useState<HostCloseIntent | null>(null);
  const [processingFlowAction, setProcessingFlowAction] = useState<string | null>(null);
  const [showNotAdvanceComposer, setShowNotAdvanceComposer] = useState(false);
  const [selectedNotAdvanceReason, setSelectedNotAdvanceReason] = useState<(typeof NOT_ADVANCE_REASON_OPTIONS)[number] | null>(null);
  const [otherNotAdvanceReason, setOtherNotAdvanceReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackedGuestChatOpenIdsRef = useRef(new Set<string>());
  const autoLoadedSuggestionIdsRef = useRef(new Set<string>());
  const [loadedMessagesConversationId, setLoadedMessagesConversationId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      const conv = conversations.find((conversation) => (
        conversation.id === initialConversationId
        || conversation.booking_id === initialConversationId
      ));

      if (conv) {
        setActiveConv(conv);
        return;
      }

      if (conversations.length === 1) {
        setActiveConv(conversations[0]);
      }

      return;
    }

    if (conversations.length === 1) {
      setActiveConv(conversations[0]);
    }
  }, [initialConversationId, conversations]);

  useEffect(() => {
    if (activeConv) {
      autoLoadedSuggestionIdsRef.current.delete(activeConv.id);
      setPendingHostCloseIntent(null);
      setInputText('');
      setLoadedMessagesConversationId(null);
      loadMessages(activeConv.id);
      const interval = setInterval(() => loadMessages(activeConv.id), 5000);
      return () => clearInterval(interval);
    }
  }, [activeConv?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const resetNotAdvanceDraft = () => {
    setShowNotAdvanceComposer(false);
    setSelectedNotAdvanceReason(null);
    setOtherNotAdvanceReason('');
  };

  useEffect(() => {
    resetNotAdvanceDraft();
  }, [activeConv?.id]);

  const loadConversations = async () => {
    try {
      setError(null);
      const data = await fetchConversations();
      setConversations(data || []);
    } catch (err: any) {
      const errorMsg = err?.message || 'No pudimos cargar los mensajes. Probá de nuevo más tarde.';
      console.error('[SecureChat] Error loading conversations:', err);
      setError(errorMsg);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (id: string) => {
    try {
      setError(null);
      const data = await fetchMessages(id);
      setMessages(data || []);
      setLoadedMessagesConversationId(id);
    } catch (err: any) {
      console.error('[SecureChat] Error loading messages:', err);
      setError(err?.message || 'No pudimos cargar los mensajes.');
    }
  };

  const acceptActiveRequest = async ({
    successTitle,
    successDescription,
  }: {
    successTitle?: string;
    successDescription?: string;
  } = {}) => {
    if (!activeConv) {
      return null;
    }

    setAcceptingRequest(true);

    try {
      const updatedConversation = await acceptConversationRequest(activeConv.id);
      const acceptedMode = updatedConversation.requestMode === 'direct' ? 'direct' : 'protected';
      applyConversationUpdate(updatedConversation);
      await loadMessages(activeConv.id);
      showToast(
        successTitle ?? (acceptedMode === 'protected' ? 'Solicitud aceptada' : 'Propuesta aceptada'),
        successDescription ?? (
          acceptedMode === 'protected'
            ? 'Ya quedó acordado. Ahora el huésped puede definir la seña desde este chat.'
            : 'Ya quedó acordado. Ahora falta registrar la seña para dejarlo confirmado.'
        ),
        'success',
      );

      return updatedConversation;
    } catch (err) {
      showToast('Solicitud', err instanceof Error ? err.message : 'No pudimos aceptar la solicitud. Intentá de nuevo.', 'error');
      return null;
    } finally {
      setAcceptingRequest(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeConv || !user) return;

    const receiverId = user.id === activeConv.tenant_id ? activeConv.host_id : activeConv.tenant_id;
    const messageText = inputText;
    const optimisticId = `opt-${Date.now()}`;
    const detectedHostCloseIntent = user.id === activeConv.host_id && flowCopy?.stage === 'request-pending'
      ? detectHostCloseIntent(messageText)
      : null;
    const shouldAdvanceReservationAfterSend = user.id === activeConv.host_id && (pendingHostCloseIntent !== null || detectedHostCloseIntent !== null);
    
    // Optimistic update - show message immediately
    const optimisticMessage: Message = {
      id: optimisticId,
      conversation_id: activeConv.id,
      sender_id: user.id,
      receiver_id: receiverId,
      content: messageText,
      created_at: new Date().toISOString(),
      is_optimistic: true
    };
    
    setInputText('');
    setMessages(prev => [...prev, optimisticMessage]);
    setSendingMessageId(optimisticId);

    try {
      setError(null);
      const newMsg = await sendMessage(activeConv.id, messageText, receiverId);
      // Replace optimistic message with real one from server
      setMessages(prev => prev.map(msg => msg.id === optimisticId ? newMsg : msg));
      setPendingHostCloseIntent(null);

      if (shouldAdvanceReservationAfterSend) {
        await acceptActiveRequest({
          successTitle: 'Cierre enviado',
          successDescription: 'El chat ya quedó listo para definir la seña y seguir con la reserva.',
        });
      }
    } catch (err: any) {
      setError(err?.message || 'No pudimos enviar el mensaje. Intentá de nuevo.');
      setInputText(messageText); // Restore input on error
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      console.error('[SecureChat] Error sending message:', err);
    } finally {
      setSendingMessageId(null);
    }
  };

  const handleAcceptRequest = async () => {
    await acceptActiveRequest();
  };

  const handleNotAdvanceRequest = async () => {
    if (!activeConv) {
      return;
    }

    setProcessingFlowAction('not-advance-request');

    const reason = selectedNotAdvanceReason === 'otro'
      ? otherNotAdvanceReason.trim() || 'otro'
      : selectedNotAdvanceReason ?? undefined;

    try {
      const updatedConversation = await notAdvanceConversationRequest(activeConv.id, reason);
      applyConversationUpdate(updatedConversation);
      await loadMessages(activeConv.id);
      resetNotAdvanceDraft();
      showToast(
        'Estado actualizado',
        'Quedó marcado que no se pudo avanzar. El chat sigue abierto por si quieren recoordinar.',
        'success',
      );
    } catch (err) {
      showToast('Reserva', err instanceof Error ? err.message : 'No pudimos actualizar este estado. Intentá de nuevo.', 'error');
    } finally {
      setProcessingFlowAction(null);
    }
  };

  const applyConversationUpdate = (updatedConversation: Conversation) => {
    setConversations((current) => current.map((conversation) => (
      conversation.id === updatedConversation.id ? { ...conversation, ...updatedConversation } : conversation
    )));
    setActiveConv((current) => (current && current.id === updatedConversation.id ? { ...current, ...updatedConversation } : current));
  };

  const applyBookingUpdate = (booking: {
    id: string;
    status?: Conversation['bookingStatus'];
    depositType?: Conversation['depositType'];
    depositStatus?: Conversation['depositStatus'];
    protectedDepositPricing?: Conversation['protectedDepositPricing'];
    depositPaymentReference?: Conversation['depositPaymentReference'];
    cancellationActor?: Conversation['cancellationActor'];
  }) => {
    setConversations((current) => current.map((conversation) => (
      conversation.booking_id === booking.id
        ? {
            ...conversation,
            bookingStatus: booking.status ?? conversation.bookingStatus,
            depositType: booking.depositType ?? conversation.depositType,
            depositStatus: booking.depositStatus ?? conversation.depositStatus,
            protectedDepositPricing: booking.protectedDepositPricing ?? conversation.protectedDepositPricing,
            depositPaymentReference: booking.depositPaymentReference ?? conversation.depositPaymentReference,
            cancellationActor: booking.cancellationActor ?? conversation.cancellationActor,
          }
        : conversation
    )));
    setActiveConv((current) => (
      current && current.booking_id === booking.id
        ? {
            ...current,
            bookingStatus: booking.status ?? current.bookingStatus,
            depositType: booking.depositType ?? current.depositType,
            depositStatus: booking.depositStatus ?? current.depositStatus,
            protectedDepositPricing: booking.protectedDepositPricing ?? current.protectedDepositPricing,
            depositPaymentReference: booking.depositPaymentReference ?? current.depositPaymentReference,
            cancellationActor: booking.cancellationActor ?? current.cancellationActor,
          }
        : current
    ));
  };

  const handleSelectExternalDeposit = async (bookingId: string) => {
    if (!activeConv) {
      return;
    }

    setProcessingFlowAction('select-external-deposit');

    try {
      const booking = await selectExternalDeposit(bookingId);
      applyBookingUpdate({
        id: booking.id,
        status: booking.status,
        depositType: booking.depositType,
        depositStatus: booking.depositStatus,
        protectedDepositPricing: booking.protectedDepositPricing,
        depositPaymentReference: booking.depositPaymentReference,
      });
      await loadMessages(activeConv.id);
      showToast('Seña externa', 'Quedó como coordinación por fuera. Si cambiás de idea antes de informarla, podés dejarla registrada desde esta conversación.', 'success');
    } catch (err) {
      showToast('Seña', err instanceof Error ? err.message : 'No pudimos registrar esta elección.', 'error');
    } finally {
      setProcessingFlowAction(null);
    }
  };

  const handleSelectProtectedDeposit = async (bookingId: string) => {
    if (!activeConv) {
      return;
    }

    setProcessingFlowAction('select-protected-deposit');

    try {
      const booking = await selectProtectedDeposit(bookingId);
      applyBookingUpdate({
        id: booking.id,
        status: booking.status,
        depositType: booking.depositType,
        depositStatus: booking.depositStatus,
        protectedDepositPricing: booking.protectedDepositPricing,
        depositPaymentReference: booking.depositPaymentReference,
      });
      await loadMessages(activeConv.id);
      showToast('Seña en la app', 'La seña quedó lista para registrarse acá. Vas a ver el fee antes de pagar.', 'success');
    } catch (err) {
      showToast('Seña', err instanceof Error ? err.message : 'No pudimos registrar esta elección.', 'error');
    } finally {
      setProcessingFlowAction(null);
    }
  };

  const handleReportDirectDeposit = async () => {
    if (!activeConv) {
      return;
    }

    setProcessingFlowAction('report-direct-deposit');

    try {
      const updatedConversation = await reportDirectDeposit(activeConv.id);
      applyConversationUpdate(updatedConversation);
      await loadMessages(activeConv.id);
      showToast('Seña informada', 'El anfitrión ya ve que informaste la seña y puede confirmar la recepción.', 'success');
    } catch (err) {
      showToast('Seña', err instanceof Error ? err.message : 'No pudimos informar la seña. Intentá de nuevo.', 'error');
    } finally {
      setProcessingFlowAction(null);
    }
  };

  const handleConfirmDirectDeposit = async () => {
    if (!activeConv) {
      return;
    }

    setProcessingFlowAction('confirm-direct-deposit');

    try {
      const updatedConversation = await confirmDirectDeposit(activeConv.id);
      applyConversationUpdate(updatedConversation);
      await loadMessages(activeConv.id);
      showToast('Reserva confirmada', 'La reserva ya quedó confirmada. Ahora solo falta coordinar la llegada.', 'success');
    } catch (err) {
      showToast('Reserva', err instanceof Error ? err.message : 'No pudimos confirmar la recepción de la seña.', 'error');
    } finally {
      setProcessingFlowAction(null);
    }
  };

  const handlePayProtectedDeposit = async (bookingId: string) => {
    if (!activeConv) {
      return;
    }

    setProcessingFlowAction('pay-protected-deposit');

    try {
      const booking = await payProtectedDeposit(bookingId);
      applyBookingUpdate({
        id: booking.id,
        status: booking.status,
        depositType: booking.depositType,
        depositStatus: booking.depositStatus,
        protectedDepositPricing: booking.protectedDepositPricing,
        depositPaymentReference: booking.depositPaymentReference,
      });
      await loadMessages(activeConv.id);
      showToast('Seña en custodia', 'La seña ya quedó registrada hasta que confirmes la llegada.', 'success');
    } catch (err) {
      showToast('Seña', err instanceof Error ? err.message : 'No pudimos registrar el pago de la seña.', 'error');
    } finally {
      setProcessingFlowAction(null);
    }
  };

  const handleConfirmArrival = async (bookingId: string) => {
    if (!activeConv) {
      return;
    }

    setProcessingFlowAction('confirm-arrival');

    try {
      const booking = await confirmArrival(bookingId);
      applyBookingUpdate({
        id: booking.id,
        status: booking.status,
        depositType: booking.depositType,
        depositStatus: booking.depositStatus,
        protectedDepositPricing: booking.protectedDepositPricing,
        depositPaymentReference: booking.depositPaymentReference,
      });
      await loadMessages(activeConv.id);
      showToast('Seña liberada', 'La llegada ya quedó confirmada y la seña salió de custodia.', 'success');
    } catch (err) {
      showToast('Llegada', err instanceof Error ? err.message : 'No pudimos confirmar la llegada.', 'error');
    } finally {
      setProcessingFlowAction(null);
    }
  };

  const handleReportArrivalProblem = async (bookingId: string) => {
    if (!activeConv) {
      return;
    }

    setProcessingFlowAction('report-arrival-problem');

    try {
      const booking = await reportArrivalProblem(bookingId);
      applyBookingUpdate({
        id: booking.id,
        status: booking.status,
        depositType: booking.depositType,
        depositStatus: booking.depositStatus,
        protectedDepositPricing: booking.protectedDepositPricing,
        depositPaymentReference: booking.depositPaymentReference,
        cancellationActor: booking.cancellationActor,
      });
      await loadMessages(activeConv.id);
      showToast('Seña en revisión', 'El problema quedó informado y la seña pasó a revisión.', 'success');
    } catch (err) {
      showToast('Problema', err instanceof Error ? err.message : 'No pudimos registrar el problema. Intentá de nuevo.', 'error');
    } finally {
      setProcessingFlowAction(null);
    }
  };

  const activeRequestContext = getActiveRequestContext(activeConv, initialConversationId, initialRequestContext);
  const isTenantConversation = Boolean(user && activeConv && user.id === activeConv.tenant_id);
  const isHostConversation = Boolean(user && activeConv && user.id === activeConv.host_id);
  const flowCopy = activeRequestContext
    ? getReservationFlowCopy({
        mode: activeRequestContext.mode,
        depositType: activeRequestContext.depositType,
        requestStatus: activeRequestContext.requestStatus,
        bookingStatus: activeRequestContext.bookingStatus,
        depositStatus: activeRequestContext.depositStatus,
        cancellationActor: activeRequestContext.cancellationActor,
        viewerRole: isTenantConversation ? 'guest' : 'host',
      })
    : null;
  const counterpartyName = user && activeConv
    ? user.id === activeConv.tenant_id
      ? activeConv.hostName || 'Anfitrión'
      : activeConv.tenantName || 'Huésped'
    : 'Conversación';
  const hasAuthoredConversationMessage = Boolean(
    user && messages.some((message) => !message.is_system && message.sender_id === user.id),
  );
  const hasNonSystemConversationMessages = messages.some((message) => !message.is_system);
  const suggestedFirstMessage = isTenantConversation && !hasAuthoredConversationMessage && !hasNonSystemConversationMessages
    ? buildSuggestedFirstMessage(counterpartyName, activeRequestContext)
    : null;
  const guestIntroPrompt = null;
  const contextSummaryLine = activeRequestContext
    ? [
        activeRequestContext.propertyTitle,
        formatCompactDateRange(activeRequestContext.startDate, activeRequestContext.endDate),
        `${activeRequestContext.guests} ${activeRequestContext.guests === 1 ? 'huésped' : 'huéspedes'}`,
      ].filter(Boolean).join(' · ')
    : activeConv?.propertyTitle || null;
  const requestDeadline = flowCopy?.stage === 'request-pending'
    ? getRequestDeadline(activeRequestContext?.requestCreatedAt ?? activeConv?.requestCreatedAt)
    : null;
  const isRequestExpired = Boolean(requestDeadline && Date.now() > requestDeadline.getTime());
  const isExpiredPendingRequest = Boolean(flowCopy?.stage === 'request-pending' && isRequestExpired);
  const counterpartyId = user && activeConv
    ? user.id === activeConv.tenant_id
      ? activeConv.host_id
      : activeConv.tenant_id
    : null;
  const canAcceptRequest = Boolean(isHostConversation && flowCopy?.stage === 'request-pending' && !isRequestExpired);
  const counterpartyHasConversationMessage = Boolean(
    counterpartyId && messages.some((message) => !message.is_system && message.sender_id === counterpartyId),
  );
  const hasBackAndForthConversation = Boolean(hasAuthoredConversationMessage && counterpartyHasConversationMessage);
  const compactReservationStatus = getCompactReservationStatus(
    {
      mode: activeRequestContext?.mode,
      depositType: activeRequestContext?.depositType,
      requestStatus: activeRequestContext?.requestStatus,
      bookingStatus: activeRequestContext?.bookingStatus,
      depositStatus: activeRequestContext?.depositStatus,
      cancellationActor: activeRequestContext?.cancellationActor,
      viewerRole: isTenantConversation ? 'guest' : 'host',
    },
    {
      hasConversation: flowCopy?.stage === 'request-pending' && hasBackAndForthConversation,
      isExpiredPendingRequest,
    },
  );
  const shouldShowHostClosingChips = Boolean(
    isHostConversation
    && canAcceptRequest
    && activeRequestContext?.startDate
    && activeRequestContext?.endDate
    && activeRequestContext?.guests
    && hasAuthoredConversationMessage
    && counterpartyHasConversationMessage,
  );
  const hostAdvanceAction = shouldShowHostClosingChips
    ? buildHostClosingChips(activeRequestContext)[0]
    : null;
  const canNotAdvanceRequest = Boolean(
    isHostConversation
    && (
      flowCopy?.stage === 'request-pending'
      || flowCopy?.stage === 'deposit-choice'
      || flowCopy?.stage === 'request-accepted'
      || flowCopy?.stage === 'external-deposit-pending'
    )
    && !isRequestExpired,
  );
  const protectedDepositPreview = activeRequestContext
    ? activeRequestContext.protectedDepositPricing ?? getProtectedDepositPricingFromBooking(activeRequestContext)
    : null;
  const canChooseExternalDeposit = Boolean(isTenantConversation && flowCopy?.stage === 'deposit-choice' && activeRequestContext?.bookingId);
  const canChooseProtectedDeposit = Boolean(isTenantConversation && flowCopy?.stage === 'deposit-choice' && activeRequestContext?.bookingId);
  const showHostDepositChoicePreview = Boolean(isHostConversation && flowCopy?.stage === 'deposit-choice');
  const showDepositChoiceComposer = Boolean(canChooseExternalDeposit || canChooseProtectedDeposit);
  const showDepositChoiceBlock = Boolean(showDepositChoiceComposer || showHostDepositChoicePreview);
  const canReturnToProtectedDeposit = Boolean(
    isTenantConversation
    && activeRequestContext?.bookingId
    && activeRequestContext.depositType === 'external'
    && flowCopy?.stage === 'external-deposit-pending',
  );
  const canReportDirectDeposit = Boolean(
    isTenantConversation
    && (
      (activeRequestContext?.mode === 'direct' && flowCopy?.stage === 'request-accepted')
      || (activeRequestContext?.depositType === 'external' && flowCopy?.stage === 'external-deposit-pending')
    ),
  );
  const canConfirmDirectDeposit = Boolean(isHostConversation && flowCopy?.stage === 'direct-deposit-reported');
  const canPayProtectedDeposit = Boolean(
    isTenantConversation
    && activeRequestContext?.bookingId
    && activeRequestContext.depositType === 'protected'
    && flowCopy?.stage === 'request-accepted',
  );
  const arrivalActionsAvailable = isBookingCheckInReached(activeRequestContext?.startDate);
  const canConfirmArrival = Boolean(isTenantConversation && activeRequestContext?.depositType === 'protected' && flowCopy?.stage === 'protected-deposit-held' && activeRequestContext.bookingId && arrivalActionsAvailable);
  const canReportArrivalProblem = Boolean(isTenantConversation && activeRequestContext?.depositType === 'protected' && flowCopy?.stage === 'protected-deposit-held' && activeRequestContext.bookingId && arrivalActionsAvailable);
  const canCoordinateArrival = Boolean(
    activeRequestContext
    && (flowCopy?.stage === 'protected-deposit-held'
      || flowCopy?.stage === 'protected-deposit-released'
      || flowCopy?.stage === 'reservation-confirmed'),
  );
  const showGuestNoAdvanceActions = Boolean(
    isTenantConversation
    && flowCopy?.stage === 'request-not-advanced'
    && activeRequestContext,
  );
  const noAdvanceRescheduleDraft = 'Si te parece, puedo acomodar otras fechas.';
  const noAdvanceNewProposalDraft = activeRequestContext?.mode === 'protected'
    ? 'Si te parece, puedo mandarte una nueva solicitud con otras fechas.'
    : 'Si te parece, te mando una nueva propuesta con otras fechas.';
  const arrivalActionsHint = flowCopy?.stage === 'protected-deposit-held' && !arrivalActionsAvailable
    ? flowCopy.pendingActionHint
    : null;
  const reservationProgressHint = isTenantConversation
    ? arrivalActionsHint ?? flowCopy?.trackingHint ?? null
    : flowCopy?.trackingHint ?? arrivalActionsHint ?? null;
  const arrivalCoordinationDraft = isTenantConversation
    ? '¿Qué horario de llegada te queda mejor?'
    : 'Si querés, definimos ahora el horario de llegada.';
  const hasInlineComposerActions = Boolean(
    hostAdvanceAction
    || canAcceptRequest
    || canNotAdvanceRequest
    || canConfirmArrival
    || canReportArrivalProblem
    || canCoordinateArrival,
  );

  useEffect(() => {
    if (!activeConv || !suggestedFirstMessage || loadedMessagesConversationId !== activeConv.id) {
      return;
    }

    if (autoLoadedSuggestionIdsRef.current.has(activeConv.id)) {
      return;
    }

    autoLoadedSuggestionIdsRef.current.add(activeConv.id);
    setInputText((currentValue) => currentValue.trim() ? currentValue : suggestedFirstMessage);
  }, [activeConv?.id, loadedMessagesConversationId, suggestedFirstMessage]);

  useEffect(() => {
    if (!activeConv || !isTenantConversation || loadedMessagesConversationId !== activeConv.id || hasNonSystemConversationMessages) {
      return;
    }

    if (trackedGuestChatOpenIdsRef.current.has(activeConv.id)) {
      return;
    }

    trackedGuestChatOpenIdsRef.current.add(activeConv.id);
    trackFrontendFunnelEvent('chat_composer_opened', {
      conversationId: activeConv.id,
      propertyId: activeConv.property_id,
      hostId: activeConv.host_id,
      viewerRole: 'guest',
    });
  }, [activeConv?.host_id, activeConv?.id, activeConv?.property_id, hasNonSystemConversationMessages, isTenantConversation, loadedMessagesConversationId]);

  if (loading) return <LoadingState message="Cargando conversaciones..." description="Estamos trayendo tus mensajes para que retomes la charla desde donde quedó." />;

  const activeReservationSystemKey = isExpiredPendingRequest
    ? 'request-not-advanced'
    : flowCopy?.stage === 'request-pending'
      ? 'request-sent'
      : flowCopy?.stage === 'request-not-advanced'
        ? 'request-not-advanced'
        : flowCopy?.stage === 'deposit-choice'
          || flowCopy?.stage === 'request-accepted'
          ? 'request-accepted'
      : flowCopy?.stage === 'external-deposit-pending'
        ? 'external-deposit'
      : flowCopy?.stage === 'direct-deposit-reported' || flowCopy?.stage === 'reservation-confirmed'
        ? 'direct-after-payment'
        : flowCopy?.stage === 'protected-deposit-held'
          || flowCopy?.stage === 'protected-deposit-review'
          || flowCopy?.stage === 'protected-no-show-pending'
          || flowCopy?.stage === 'protected-deposit-released'
          ? 'protected-after-payment'
          : null;
  const hasActiveReservationSystemMessage = Boolean(
    activeReservationSystemKey
    && messages.some((message) => message.is_system && message.system_key === activeReservationSystemKey),
  );
  const fallbackSystemMessages: Message[] = activeConv && activeReservationSystemKey && !hasActiveReservationSystemMessage
    ? [
        {
          id: `fallback-${activeReservationSystemKey}`,
          conversation_id: activeConv.id,
          sender_id: activeConv.host_id,
          receiver_id: activeConv.tenant_id,
          content: '',
          is_system: true,
          system_key: activeReservationSystemKey,
          created_at: new Date().toISOString(),
        },
      ]
    : [];
  const keywordReminderText = 'Antes de transferir, verificá que el titular coincida.';
  const noAdvanceReactivationText = 'Cuando lo tengan definido, pueden dejar la reserva confirmada.';
  const derivedSafetyMessages: Message[] = (() => {
    const reminders: Message[] = [];
    const softerChatStartText = 'Podés hablar y cerrar todo por acá. Cuando lo acuerden, después pueden avanzar con la seña.';
    const currentMessages = [...messages, ...fallbackSystemMessages];
    const existingSystemTexts = new Set(
      currentMessages
        .filter((message) => message.is_system)
        .map((message) => message.content.trim()),
    );

    if (messages.length === 0 && !existingSystemTexts.has(softerChatStartText) && activeConv) {
      reminders.push({
        id: `assist-safer-chat-${activeConv.id}`,
        conversation_id: activeConv.id,
        sender_id: activeConv.host_id,
        receiver_id: activeConv.tenant_id,
        content: softerChatStartText,
        is_system: true,
        system_key: 'assist-safer-chat',
        created_at: new Date(Date.now() - 3).toISOString(),
      });
    }

    if ((flowCopy?.stage === 'request-not-advanced' || isExpiredPendingRequest) && !existingSystemTexts.has(noAdvanceReactivationText) && activeConv) {
      const baseDate = parseTimestampValue(currentMessages.at(-1)?.created_at) ?? new Date();
      reminders.push({
        id: `assist-no-advance-reactivation-${activeConv.id}`,
        conversation_id: activeConv.id,
        sender_id: activeConv.host_id,
        receiver_id: activeConv.tenant_id,
        content: noAdvanceReactivationText,
        is_system: true,
        system_key: 'assist-no-advance-reactivation',
        created_at: new Date(baseDate.getTime() + 2).toISOString(),
      });
    }

    const lastKeywordMessage = [...messages].reverse().find((message) => !message.is_system && (message.is_suspicious || containsTransferKeywords(message.content)));

    if (lastKeywordMessage && !existingSystemTexts.has(keywordReminderText)) {
      const reminderDate = parseTimestampValue(lastKeywordMessage.created_at) ?? new Date();
      reminders.push({
        id: `assist-account-check-${lastKeywordMessage.id}`,
        conversation_id: lastKeywordMessage.conversation_id,
        sender_id: lastKeywordMessage.sender_id,
        receiver_id: lastKeywordMessage.receiver_id,
        content: keywordReminderText,
        is_system: true,
        system_key: 'assist-account-check',
        created_at: new Date(reminderDate.getTime() + 3).toISOString(),
      });
    }

    return reminders;
  })();
  const threadMessages = sortThreadTimeline([...messages, ...fallbackSystemMessages, ...derivedSafetyMessages]);
  const inlineThreadNotices: InlineThreadNotice[] = [];
  const showReservationConfirmedState = Boolean(
    flowCopy?.stage === 'reservation-confirmed' || flowCopy?.stage === 'protected-deposit-released',
  );
  const getSystemMessagePresentation = (message: Message): ThreadSystemMessagePresentation => {
    if (
      flowCopy?.stage === 'request-not-advanced'
      && (
        message.system_key === 'request-sent'
        || message.system_key === 'request-accepted'
        || message.system_key === 'before-payment'
        || message.system_key === 'protected-payment'
      )
    ) {
      return {
        content: message.content,
        emphasis: 'pill',
        hidden: true,
      };
    }

    if (message.system_key === 'protected-payment' || message.system_key === 'before-payment' || message.system_key === 'deposit-choice') {
      return {
        content: message.content,
        emphasis: 'pill',
        hidden: true,
      };
    }

    if (message.system_key === 'request-sent' && activeRequestContext?.mode) {
      return {
        content: activeRequestContext.mode === 'protected'
          ? 'Solicitud enviada'
          : 'Propuesta enviada',
        emphasis: 'pill',
        tone: 'brand',
        supplementaryContent: isHostConversation
          ? 'Respondé por acá cuando lo tengas claro.'
          : 'Ahora le toca responder al anfitrión.',
      };
    }

    if (message.system_key === 'request-not-advanced' && (flowCopy?.stage === 'request-not-advanced' || isExpiredPendingRequest)) {
      return {
        content: 'No se pudo avanzar con esta reserva.',
        emphasis: 'card',
        tone: 'warning',
        supplementaryContent: isExpiredPendingRequest
          ? isHostConversation
            ? 'La solicitud se venció. Si quieren retomarla, hace falta una nueva propuesta.'
            : 'Se venció el tiempo de respuesta. Podés seguir conversando o buscar otras opciones.'
          : isHostConversation
            ? 'El chat sigue abierto por si quieren recoordinar por acá.'
            : 'Podés seguir conversando o buscar otras opciones.',
      };
    }

    if (
      message.system_key === 'request-accepted'
      && (
        flowCopy?.stage === 'request-accepted'
        || flowCopy?.stage === 'deposit-choice'
        || flowCopy?.stage === 'external-deposit-pending'
      )
    ) {
      const supplementaryContent = flowCopy?.stage === 'deposit-choice'
        ? isHostConversation
          ? 'Ahora el huésped define cómo avanzar con la seña.'
          : 'Ahora elegí cómo querés avanzar con la seña.'
        : activeRequestContext?.mode === 'protected'
          ? canPayProtectedDeposit
            ? protectedDepositPreview
              ? `Podés dejar la seña registrada acá: ${currencyFormatter.format(protectedDepositPreview.depositAmount)} + fee ${currencyFormatter.format(protectedDepositPreview.serviceFee)} = ${currencyFormatter.format(protectedDepositPreview.totalCharge)}.`
              : 'Podés dejar la seña registrada acá cuando quieran cerrarlo.'
            : 'Podés avanzar con la seña cuando lo acuerden.'
          : canReportDirectDeposit
            ? 'Cuando registres la seña, avisalo por acá para dejarlo confirmado.'
            : 'Podés avanzar con la seña cuando lo acuerden.';

      return {
        content: 'Ya están de acuerdo.',
        emphasis: 'card',
        tone: 'brand',
        supplementaryContent,
        action: canPayProtectedDeposit
          ? {
              kind: 'pay-protected-deposit',
              label: 'Pagar seña',
              loading: processingFlowAction === 'pay-protected-deposit',
              onClick: () => {
                if (activeRequestContext?.bookingId) {
                  void handlePayProtectedDeposit(activeRequestContext.bookingId);
                }
              },
            }
          : canReportDirectDeposit
            ? {
                kind: 'report-direct-deposit',
                label: 'Registrar seña',
                loading: processingFlowAction === 'report-direct-deposit',
                onClick: handleReportDirectDeposit,
              }
            : undefined,
      };
    }

    if (message.system_key === 'external-deposit' && flowCopy?.stage === 'external-deposit-pending') {
      return {
        content: 'Seña por fuera',
        emphasis: 'card',
        tone: 'neutral',
        supplementaryContent: isHostConversation
          ? 'Si cambian de idea antes de informarla, el huésped puede dejarla registrada acá.'
          : 'La coordinan por chat. Si cambiás de idea, todavía podés dejarla registrada acá.',
        action: canReturnToProtectedDeposit
          ? {
              kind: 'select-protected-deposit',
              label: 'Dejarla registrada acá',
              loading: processingFlowAction === 'select-protected-deposit',
              onClick: () => {
                if (activeRequestContext?.bookingId) {
                  void handleSelectProtectedDeposit(activeRequestContext.bookingId);
                }
              },
            }
          : undefined,
      };
    }

    if (message.system_key === 'direct-after-payment' && flowCopy?.stage === 'direct-deposit-reported') {
      return {
        content: 'Seña registrada',
        emphasis: 'card',
        tone: 'brand',
        supplementaryContent: canConfirmDirectDeposit
          ? 'Ahora falta confirmar la recepción para cerrar la reserva.'
          : 'Ahora el anfitrión tiene que confirmar la recepción.',
        action: canConfirmDirectDeposit
          ? {
              kind: 'confirm-direct-deposit',
              label: 'Confirmar recepción',
              loading: processingFlowAction === 'confirm-direct-deposit',
              onClick: handleConfirmDirectDeposit,
            }
          : undefined,
      };
    }

    if (message.system_key === 'direct-after-payment' && flowCopy?.stage === 'reservation-confirmed') {
      return {
        content: 'Reserva confirmada',
        emphasis: 'pill',
        hidden: true,
      };
    }

    if (message.system_key === 'protected-after-payment' && flowCopy?.stage === 'protected-deposit-held') {
      return {
        content: 'Seña registrada',
        emphasis: 'card',
        tone: 'brand',
        supplementaryContent: 'Ya pueden coordinar la llegada por este chat.',
      };
    }

    if (message.system_key === 'protected-after-payment' && flowCopy?.stage === 'protected-deposit-review') {
      return {
        content: 'Problema reportado',
        emphasis: 'card',
        tone: 'warning',
        supplementaryContent: 'La plataforma está revisando qué pasó antes de definir cómo sigue.',
      };
    }

    if (message.system_key === 'protected-after-payment' && flowCopy?.stage === 'protected-no-show-pending') {
      return {
        content: 'Problema reportado',
        emphasis: 'card',
        tone: 'warning',
        supplementaryContent: 'La plataforma está revisando el problema informado antes de cerrar la reserva.',
      };
    }

    if (message.system_key === 'protected-after-payment' && flowCopy?.stage === 'protected-deposit-released') {
      return {
        content: 'Reserva confirmada',
        emphasis: 'pill',
        hidden: true,
      };
    }

    if (
      message.system_key === 'before-arrival'
      || message.system_key === 'protected-arrival'
      || message.system_key === 'problem'
    ) {
      return {
        content: message.content,
        emphasis: 'pill',
        hidden: true,
      };
    }

    if (
      message.system_key === 'assist-safer-chat'
      || message.system_key === 'assist-no-advance-reactivation'
      || message.system_key === 'assist-account-check'
    ) {
      return {
        content: message.content,
        emphasis: 'pill',
        tone: 'neutral',
      };
    }

    return {
      content: message.content,
      emphasis: 'pill',
      tone: 'neutral',
    };
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white pt-2 dark:bg-slate-950 sm:pt-4 md:pt-0">
      {/* Sidebar List */}
      <div className={cn(
        "w-full md:w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all",
        activeConv ? "hidden md:flex" : "flex"
      )}>
        <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Mensajes</h2>
        </div>

        {error && !activeConv && (
          <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-2">
            <Icons.AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        <div className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
          {conversations.length === 0 && !error ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">Todavía no tenés conversaciones</div>
          ) : (
            conversations.map((c) => (
              (() => {
                const previewCounterpartyName = user?.id === c.tenant_id ? c.hostName : c.tenantName;
                const preview = getConversationListPreview(
                  c,
                  user?.id === c.host_id ? 'host' : 'guest',
                  initialConversationId,
                  initialRequestContext,
                );
                const previewMeta = [preview.dateRange, preview.guestsLabel].filter(Boolean).join(' · ') || 'Sin fechas definidas';
                const previewLabel = [
                  `Abrir conversacion con ${previewCounterpartyName || 'esta persona'}`,
                  preview.dateRange,
                  preview.guestsLabel,
                  preview.status.label,
                ].filter(Boolean).join(' · ');

                return (
                  <button
                    key={c.id}
                    aria-label={previewLabel}
                    onClick={() => setActiveConv(c)}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-[24px] border border-transparent p-3 text-left transition-all sm:rounded-3xl sm:p-4",
                      activeConv?.id === c.id
                        ? "border-brand/15 bg-brand/8 text-slate-900 shadow-[0_18px_36px_-32px_rgba(67,56,202,0.35)] dark:border-brand/20 dark:bg-brand/10 dark:text-white"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900"
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                      <img src={c.propertyImage} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold truncate text-sm">
                            {previewCounterpartyName}
                          </p>
                          <p className={cn(
                            "text-[10px] truncate uppercase font-black tracking-widest leading-tight",
                            activeConv?.id === c.id ? "text-brand dark:text-brand-light" : "text-slate-400"
                          )}>
                            {c.propertyTitle}
                          </p>
                        </div>
                        <span className={cn(
                          'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                          compactReservationStatusToneClasses[preview.status.tone],
                        )}>
                          {preview.status.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{previewMeta}</p>
                    </div>
                  </button>
                );
              })()
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all",
        !activeConv ? "hidden md:flex bg-slate-50 dark:bg-slate-900/10 items-center justify-center" : "flex"
      )}>
        {!activeConv ? (
          <div className="text-center space-y-4 opacity-30 select-none">
            <Icons.MessageSquare className="w-20 h-20 mx-auto text-slate-400" />
            <p className="text-sm font-black uppercase tracking-widest">Elegí una conversación para ver el historial</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center border-b border-slate-100 bg-white/92 p-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/92 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => setActiveConv(null)} className="rounded-full p-2 md:hidden">
                  <Icons.ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white sm:text-lg">
                    {counterpartyName}
                  </h3>
                </div>
              </div>
            </div>

            <ChatContextBar
              summary={contextSummaryLine}
              status={compactReservationStatus ? { label: compactReservationStatus.label, tone: compactReservationStatus.tone } : null}
            />

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,1))] px-4 py-5 no-scrollbar dark:bg-slate-950 sm:px-6 sm:py-6">
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
                {error && activeConv && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/20">
                    <Icons.AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                      <button
                        onClick={() => activeConv && loadMessages(activeConv.id)}
                        className="mt-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                      >
                        Reintentar
                      </button>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Icons.X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {inlineThreadNotices.map((notice) => (
                  <div
                    key={notice.key}
                    className={cn(
                      'mx-auto w-full max-w-lg rounded-2xl border px-4 py-2.5 text-center',
                      notice.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200'
                        : notice.tone === 'brand'
                          ? 'border-brand/15 bg-brand/6 text-slate-700 dark:border-brand/20 dark:bg-brand/12 dark:text-slate-100'
                          : 'border-slate-200/80 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                    )}
                  >
                    {notice.title ? (
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand dark:text-brand-light">
                        {notice.title}
                      </p>
                    ) : null}
                    <p className={cn('leading-5', notice.title ? 'mt-1 text-xs font-medium' : 'text-xs font-medium')}>
                      {notice.body}
                    </p>
                  </div>
                ))}

                {threadMessages.length === 0 && !error && inlineThreadNotices.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Icons.MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">Todavía no hay mensajes</p>
                    <p className="text-xs opacity-70">Escribí el primero</p>
                  </div>
                ) : null}

                {threadMessages.map((msg) => {
                  if (msg.is_system) {
                    const systemMessage = getSystemMessagePresentation(msg);

                    if (systemMessage.hidden) {
                      return null;
                    }

                    const ActionIcon = systemMessage.action?.kind === 'pay-protected-deposit' || systemMessage.action?.kind === 'select-protected-deposit'
                      ? Icons.ShieldCheck
                      : systemMessage.action?.kind === 'confirm-direct-deposit'
                        ? Icons.CheckCircle2
                        : Icons.MessageSquare;

                    return (
                      <SystemEventMessage
                        key={msg.id}
                        title={systemMessage.content}
                        description={systemMessage.supplementaryContent}
                        compact={systemMessage.emphasis === 'pill'}
                        tone={systemMessage.tone ?? (systemMessage.emphasis === 'card' ? 'brand' : 'neutral')}
                        action={systemMessage.action ? {
                          label: systemMessage.action.label,
                          onClick: systemMessage.action.onClick,
                          loading: systemMessage.action.loading,
                          loadingLabel: 'Procesando...',
                          icon: systemMessage.action.loading ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ActionIcon className="h-3.5 w-3.5" />,
                        } : undefined}
                      />
                    );
                  }

                  return (
                    <div key={msg.id} className={cn(
                      'flex max-w-[82%] flex-col gap-1',
                      msg.sender_id === user?.id ? 'self-end' : 'self-start'
                    )}>
                      <div className={cn(
                        'relative rounded-[26px] px-4 py-3.5 text-sm font-medium leading-7 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]',
                        msg.sender_id === user?.id
                          ? 'rounded-br-md bg-brand text-white'
                          : 'rounded-bl-md border border-slate-200/80 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white'
                      )}>
                        {msg.content}
                        {sendingMessageId === msg.id ? (
                          <Icons.Loader2 className="absolute -right-6 top-1/2 w-3 h-3 -translate-y-1/2 animate-spin" />
                        ) : null}
                      </div>
                      <span className={cn(
                        'px-2 text-[8px] font-black uppercase tracking-widest text-slate-400',
                        msg.sender_id === user?.id ? 'text-right' : 'text-left',
                        sendingMessageId === msg.id && 'opacity-50'
                      )}>
                        {(msg as any).is_optimistic ? 'Enviando...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}

                {showReservationConfirmedState ? (
                  <ReservationConfirmedState
                    eyebrow="Reserva confirmada"
                    title="Todo listo para esas fechas"
                    description="Ya podés coordinar tranquilo la llegada por el chat"
                  />
                ) : null}
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 bg-white/96 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/96 sm:px-6">
              <div className="mx-auto max-w-4xl space-y-3">
                <div className="flex items-end gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setInputText(nextValue);

                      if (!nextValue.trim()) {
                        setPendingHostCloseIntent(null);
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribí un mensaje..."
                    className="flex-1 rounded-[22px] border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-900 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] outline-none transition-all placeholder:text-slate-400 focus:border-brand/30 focus:ring-2 focus:ring-brand/12 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    aria-label="Enviar mensaje"
                    onClick={handleSend}
                    disabled={!inputText.trim() || sendingMessageId !== null}
                    className="rounded-[20px] bg-brand p-3.5 text-white shadow-[0_18px_38px_-24px_rgba(67,56,202,0.42)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingMessageId !== null ? (
                      <Icons.Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icons.Send className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {showDepositChoiceBlock || hasInlineComposerActions ? (
                  <div className="space-y-3">
                    {showDepositChoiceBlock ? (
                      <DepositChoiceBlock
                        eyebrow="Seña"
                        title={showDepositChoiceComposer ? 'Cómo querés avanzar con la seña' : 'Cómo sigue la seña'}
                        description={showDepositChoiceComposer
                          ? 'Elegí la opción que mejor les cierre. La diferencia importante es qué queda registrado dentro de la app.'
                          : 'La elección del huésped queda visible dentro de este chat.'}
                        options={[
                          {
                            key: 'protected',
                            eyebrow: '1. Resolverla acá con claridad',
                            title: showDepositChoiceComposer ? 'Dejarla registrada acá' : 'Registrada acá',
                            description: PLATFORM_PROTECTED_FLOW_NOTE,
                            icon: <Icons.ShieldCheck className="h-5 w-5" />,
                            tone: 'brand',
                            priceLines: protectedDepositPreview ? [
                              { label: 'Seña', value: currencyFormatter.format(protectedDepositPreview.depositAmount) },
                              { label: 'Fee', value: currencyFormatter.format(protectedDepositPreview.serviceFee) },
                              { label: 'Total', value: currencyFormatter.format(protectedDepositPreview.totalCharge), emphasize: true },
                            ] : undefined,
                            action: showDepositChoiceComposer
                              ? {
                                  label: 'Dejarla registrada acá',
                                  onClick: () => activeRequestContext?.bookingId && void handleSelectProtectedDeposit(activeRequestContext.bookingId),
                                  loading: processingFlowAction === 'select-protected-deposit',
                                  loadingLabel: 'Guardando...',
                                  icon: <Icons.ShieldCheck className="h-4 w-4" />,
                                }
                              : undefined,
                          },
                          {
                            key: 'external',
                            eyebrow: '2. Coordinarla por fuera',
                            title: showDepositChoiceComposer ? 'Coordinarla por fuera (más manual)' : 'Por fuera (más manual)',
                            description: PLATFORM_DIRECT_FLOW_NOTE,
                            icon: <Icons.MessageSquare className="h-5 w-5" />,
                            tone: 'neutral',
                            helper: showDepositChoiceComposer ? undefined : 'Esta elección también queda registrada en el chat.',
                            action: showDepositChoiceComposer
                              ? {
                                  label: 'Coordinarla por fuera',
                                  onClick: () => activeRequestContext?.bookingId && void handleSelectExternalDeposit(activeRequestContext.bookingId),
                                  loading: processingFlowAction === 'select-external-deposit',
                                  loadingLabel: 'Guardando...',
                                  icon: <Icons.MessageSquare className="h-4 w-4" />,
                                  variant: 'outline',
                                }
                              : undefined,
                          },
                        ]}
                      />
                    ) : null}

                    {hasInlineComposerActions ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {hostAdvanceAction ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPendingHostCloseIntent(hostAdvanceAction.intent);
                                setInputText(hostAdvanceAction.message);
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-[0_18px_34px_-28px_rgba(67,56,202,0.4)] transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              <Icons.ArrowRight className="h-3.5 w-3.5" />
                              <span>{hostAdvanceAction.label}</span>
                            </button>
                          ) : null}
                          {!hostAdvanceAction && canAcceptRequest ? (
                            <button
                              type="button"
                              onClick={handleAcceptRequest}
                              disabled={acceptingRequest || processingFlowAction !== null}
                              className="inline-flex items-center gap-2 rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-[0_18px_34px_-28px_rgba(67,56,202,0.4)] transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {acceptingRequest ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.CheckCircle2 className="h-3.5 w-3.5" />}
                              <span>{activeRequestContext?.mode === 'protected' ? 'Aceptar solicitud' : 'Aceptar propuesta'}</span>
                            </button>
                          ) : null}
                          {canNotAdvanceRequest ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (showNotAdvanceComposer) {
                                  resetNotAdvanceDraft();
                                  return;
                                }

                                setShowNotAdvanceComposer(true);
                              }}
                              disabled={acceptingRequest || processingFlowAction !== null}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingFlowAction === 'not-advance-request' ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.X className="h-3.5 w-3.5" />}
                              <span>{showNotAdvanceComposer ? 'Cerrar' : 'No avanzar con esta reserva'}</span>
                            </button>
                          ) : null}
                          {canConfirmArrival ? (
                            <button
                              type="button"
                              onClick={() => activeRequestContext?.bookingId && void handleConfirmArrival(activeRequestContext.bookingId)}
                              disabled={processingFlowAction !== null}
                              className="inline-flex items-center gap-2 rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-[0_18px_34px_-28px_rgba(67,56,202,0.4)] transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingFlowAction === 'confirm-arrival' ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.CheckCircle2 className="h-3.5 w-3.5" />}
                              <span>{processingFlowAction === 'confirm-arrival' ? 'Confirmando...' : flowCopy?.primaryActionLabel}</span>
                            </button>
                          ) : null}
                          {canReportArrivalProblem ? (
                            <button
                              type="button"
                              onClick={() => activeRequestContext?.bookingId && void handleReportArrivalProblem(activeRequestContext.bookingId)}
                              disabled={processingFlowAction !== null}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingFlowAction === 'report-arrival-problem' ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.AlertTriangle className="h-3.5 w-3.5" />}
                              <span>{processingFlowAction === 'report-arrival-problem' ? 'Informando...' : flowCopy?.secondaryActionLabel}</span>
                            </button>
                          ) : null}
                          {canCoordinateArrival ? (
                            <button
                              type="button"
                              onClick={() => setInputText(arrivalCoordinationDraft)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                              <Icons.Calendar className="h-3.5 w-3.5" />
                              <span>Coordinar llegada</span>
                            </button>
                          ) : null}
                        </div>

                        {reservationProgressHint ? (
                          <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                            {reservationProgressHint}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {canNotAdvanceRequest && showNotAdvanceComposer ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                          No avanzar
                        </p>
                        <p className="text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                          Podés dejar un motivo opcional para tu registro. El chat sigue abierto.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {NOT_ADVANCE_REASON_OPTIONS.map((reason) => {
                          const selected = selectedNotAdvanceReason === reason;

                          return (
                            <button
                              key={reason}
                              type="button"
                              onClick={() => {
                                setSelectedNotAdvanceReason((current) => current === reason ? null : reason);

                                if (reason !== 'otro') {
                                  setOtherNotAdvanceReason('');
                                }
                              }}
                              disabled={processingFlowAction !== null}
                              className={cn(
                                'rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70',
                                selected
                                  ? 'border-brand/30 bg-brand/10 text-brand dark:border-brand/40 dark:bg-brand/15 dark:text-brand-light'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
                              )}
                            >
                              {reason}
                            </button>
                          );
                        })}
                      </div>

                      {selectedNotAdvanceReason === 'otro' ? (
                        <input
                          type="text"
                          value={otherNotAdvanceReason}
                          onChange={(event) => setOtherNotAdvanceReason(event.target.value)}
                          placeholder="Si querés, dejá un detalle breve"
                          className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand/30 focus:ring-2 focus:ring-brand/12 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        />
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={resetNotAdvanceDraft}
                          disabled={processingFlowAction !== null}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Icons.X className="h-3.5 w-3.5" />
                          <span>Seguir por chat</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNotAdvanceRequest}
                          disabled={processingFlowAction !== null}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {processingFlowAction === 'not-advance-request' ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.CheckCircle2 className="h-3.5 w-3.5" />}
                          <span>{processingFlowAction === 'not-advance-request' ? 'Actualizando...' : 'Confirmar estado'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {guestIntroPrompt ? (
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {guestIntroPrompt}
                  </p>
                ) : null}

                {showGuestNoAdvanceActions ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      Cómo seguir
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate('/explore')}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <Icons.Search className="h-3.5 w-3.5" />
                        <span>Ver otras opciones</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/detail/${activeConv.property_id}`)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <Icons.Calendar className="h-3.5 w-3.5" />
                        <span>Modificar fechas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputText(noAdvanceNewProposalDraft)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <Icons.Send className="h-3.5 w-3.5" />
                        <span>Enviar nueva propuesta</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInputText(noAdvanceRescheduleDraft)}
                      className="text-left text-xs font-medium leading-5 text-slate-500 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
                    >
                      Si preferís, también podés seguir por este chat y recoordinar fechas primero.
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
