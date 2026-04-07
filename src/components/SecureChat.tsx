import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { showToast } from '../lib/toast';
import { LoadingState } from './LoadingState';
import { cn } from '../lib/utils';
import { 
  acceptConversationRequest, confirmArrival, confirmDirectDeposit, fetchConversations, fetchMessages, payProtectedDeposit, reportArrivalProblem, reportDirectDeposit, sendMessage, 
  Conversation, Message 
} from '../services/geminiService';
import { ReportModal } from './ReportModal';
import { useAuth } from '../hooks/useAuth';
import { type ReservationRequestContext } from '../types';
import { formatBookingDateShort, getBookingDateOnlyValue, isBookingCheckInReached } from '../lib/bookingDates';
import { getReservationFlowCopy, getReservationFlowMilestones, type ReservationFlowMilestone, type ReservationFlowMilestoneKey, type ReservationFlowMilestoneState } from '../lib/reservationFlow';

const formatRequestDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const normalizedDate = getBookingDateOnlyValue(value);
  return normalizedDate ? formatBookingDateShort(normalizedDate) : value;
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

const isSameLocalDay = (left: Date, right: Date) => (
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
);

const formatDeadlineLabel = (deadline: Date) => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeLabel = deadline.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameLocalDay(deadline, now)) {
    return `hoy a las ${timeLabel}`;
  }

  if (isSameLocalDay(deadline, tomorrow)) {
    return `mañana a las ${timeLabel}`;
  }

  return `${deadline.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} a las ${timeLabel}`;
};

const getRequestDeadline = (requestCreatedAt?: string) => {
  const requestCreatedAtDate = parseTimestampValue(requestCreatedAt);

  if (!requestCreatedAtDate) {
    return null;
  }

  return new Date(requestCreatedAtDate.getTime() + REQUEST_RESPONSE_WINDOW_MS);
};

const getFlowMilestoneIcon = (key: ReservationFlowMilestoneKey, mode: ReservationRequestContext['mode']) => {
  if (key === 'request') {
    return Icons.MessageSquare;
  }

  if (key === 'accepted') {
    return Icons.Check;
  }

  if (key === 'deposit') {
    return mode === 'protected' ? Icons.ShieldCheck : Icons.Clock;
  }

  return Icons.CheckCircle2;
};

const getFlowMilestoneClasses = (state: ReservationFlowMilestoneState) => {
  if (state === 'completed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300';
  }

  if (state === 'current') {
    return 'border-brand/20 bg-brand/10 text-brand dark:border-brand/25 dark:bg-brand/15 dark:text-brand-light';
  }

  return 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400';
};

const getFlowMilestoneStateLabel = (state: ReservationFlowMilestoneState) => {
  if (state === 'completed') {
    return 'Hecho';
  }

  if (state === 'current') {
    return 'Ahora';
  }

  return 'Sigue';
};

const getConversationRequestStatus = (conversation: Conversation | null) => {
  if (!conversation) {
    return 'pending' as const;
  }

  if (conversation.requestStatus === 'accepted') {
    return 'accepted' as const;
  }

  if ((conversation.requestMode === 'protected' || conversation.booking_id) && conversation.bookingStatus === 'confirmed') {
    return 'accepted' as const;
  }

  return 'pending' as const;
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
      requestCreatedAt,
      requestStatus,
      depositStatus: activeConversation.depositStatus,
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

const getSuggestionTexts = (requestContext: ReservationRequestContext | null, isTenant: boolean) => {
  if (!requestContext) {
    return [] as string[];
  }

  const flow = getReservationFlowCopy({
    mode: requestContext.mode,
    requestStatus: requestContext.requestStatus,
    bookingStatus: requestContext.bookingStatus,
    depositStatus: requestContext.depositStatus,
    cancellationActor: requestContext.cancellationActor,
    viewerRole: isTenant ? 'guest' : 'host',
  });

  if (flow.stage === 'request-accepted' && requestContext.mode === 'direct') {
    return isTenant
      ? [
          'Te aviso por acá cuando la seña quede enviada.',
          '¿Hay algo más que convenga dejar cerrado ahora?',
        ]
      : [
          'Quedo atento a la seña.',
          'Si querés, dejamos acordados los detalles finales por acá.',
        ];
  }

  if (flow.stage === 'direct-deposit-reported') {
    return isTenant
      ? [
          'Ya te avisé que la seña está enviada.',
          'Quedo atento a tu confirmación.',
        ]
      : [
          'Estoy revisando la recepción de la seña.',
          'Apenas la vea, te la confirmo por acá.',
        ];
  }

  if (flow.stage === 'request-accepted' && requestContext.mode === 'protected') {
    return isTenant
      ? [
          'Voy con el pago de la seña desde la app.',
          'Mientras tanto, dejamos definidos los detalles de llegada.',
        ]
      : [
          'Cuando se complete el pago, la seña va a quedar en custodia.',
          'Si querés, cerramos los detalles finales por acá.',
        ];
  }

  if (flow.stage === 'protected-deposit-held' || flow.stage === 'protected-deposit-released' || flow.stage === 'reservation-confirmed') {
    return isTenant
      ? [
          'Ya tengo todo listo de mi lado.',
          '¿Qué horario de llegada te queda mejor?',
          'Dejemos por acá cualquier detalle final.',
        ]
      : [
          'Te paso por acá los datos finales.',
          'Si querés, definimos ahora el horario de llegada.',
          'Quedo atento a cualquier detalle que falte.',
        ];
  }

  if (flow.stage === 'protected-deposit-review') {
    return isTenant
      ? [
          'Dejo por acá lo que pasó al llegar.',
          'Quedo atento a la revisión desde la app.',
        ]
      : [
          'Dejo por acá mi versión de lo que pasó al llegar.',
          'Quedo atento a la revisión desde la plataforma.',
        ];
  }

  if (flow.stage === 'protected-no-show-pending') {
    return isTenant
      ? [
          'Quiero dejar asentado por acá lo que pasó con la llegada.',
        ]
      : [
          'Dejo asentado por acá el detalle del no show informado.',
        ];
  }

  if (flow.stage === 'guest-cancelled' || flow.stage === 'host-cancelled') {
    return isTenant
      ? [
          'Dejo por acá cualquier dato final de la cancelación.',
        ]
      : [
          'Dejo asentado por acá cómo seguimos después de la cancelación.',
        ];
  }

  if (requestContext.mode === 'protected') {
    return isTenant
      ? [
          '¿Te sirven estas fechas?',
          '¿Hay algo importante que deba tener en cuenta antes de avanzar?',
          'Si te cierra, seguimos por la reserva protegida.',
        ]
      : [
          'Sí, estas fechas me sirven.',
          'Antes de responder, quiero confirmar estos puntos:',
          'Si te parece, lo seguimos por la reserva protegida.',
        ];
  }

  return isTenant
    ? [
        '¿Te sirven estas fechas?',
        '¿Qué incluye el precio?',
        '¿Hay algo del ingreso o de la estadía que convenga coordinar ahora?',
      ]
    : [
        'Sí, esas fechas están disponibles.',
        'Te cuento qué incluye el precio:',
        'Si querés, coordinamos los detalles por acá.',
      ];
};

export const SecureChat: React.FC<{ initialConversationId?: string; initialRequestContext?: ReservationRequestContext | null }> = ({
  initialConversationId,
  initialRequestContext = null,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState(false);
  const [processingFlowAction, setProcessingFlowAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      loadMessages(activeConv.id);
      const interval = setInterval(() => loadMessages(activeConv.id), 5000);
      return () => clearInterval(interval);
    }
  }, [activeConv]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    } catch (err: any) {
      console.error('[SecureChat] Error loading messages:', err);
      setError(err?.message || 'No pudimos cargar los mensajes.');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeConv || !user) return;

    const receiverId = user.id === activeConv.tenant_id ? activeConv.host_id : activeConv.tenant_id;
    const messageText = inputText;
    const optimisticId = `opt-${Date.now()}`;
    
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
    if (!activeConv) {
      return;
    }

    setAcceptingRequest(true);

    try {
      const updatedConversation = await acceptConversationRequest(activeConv.id);
      const acceptedMode = updatedConversation.requestMode === 'direct' ? 'direct' : 'protected';
      setConversations((current) => current.map((conversation) => (
        conversation.id === updatedConversation.id ? { ...conversation, ...updatedConversation } : conversation
      )));
      setActiveConv((current) => (current && current.id === updatedConversation.id ? { ...current, ...updatedConversation } : current));
      await loadMessages(activeConv.id);
      showToast(
        acceptedMode === 'protected' ? 'Solicitud aceptada' : 'Propuesta aceptada',
        acceptedMode === 'protected'
          ? 'La solicitud ya quedó aceptada y el chat pasó al cierre de detalles.'
          : 'La propuesta ya quedó aceptada y el chat pasó al cierre de detalles.',
        'success',
      );
    } catch (err) {
      showToast('Solicitud', err instanceof Error ? err.message : 'No pudimos aceptar la solicitud. Intentá de nuevo.', 'error');
    } finally {
      setAcceptingRequest(false);
    }
  };

  const applyConversationUpdate = (updatedConversation: Conversation) => {
    setConversations((current) => current.map((conversation) => (
      conversation.id === updatedConversation.id ? { ...conversation, ...updatedConversation } : conversation
    )));
    setActiveConv((current) => (current && current.id === updatedConversation.id ? { ...current, ...updatedConversation } : current));
  };

  const applyBookingUpdate = (booking: { id: string; status?: Conversation['bookingStatus']; depositStatus?: Conversation['depositStatus']; cancellationActor?: Conversation['cancellationActor'] }) => {
    setConversations((current) => current.map((conversation) => (
      conversation.booking_id === booking.id
        ? {
            ...conversation,
            bookingStatus: booking.status ?? conversation.bookingStatus,
            depositStatus: booking.depositStatus ?? conversation.depositStatus,
            cancellationActor: booking.cancellationActor ?? conversation.cancellationActor,
          }
        : conversation
    )));
    setActiveConv((current) => (
      current && current.booking_id === booking.id
        ? {
            ...current,
            bookingStatus: booking.status ?? current.bookingStatus,
            depositStatus: booking.depositStatus ?? current.depositStatus,
            cancellationActor: booking.cancellationActor ?? current.cancellationActor,
          }
        : current
    ));
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
      showToast('Reserva confirmada', 'La reserva ya quedó registrada y el chat sigue disponible para cerrar detalles.', 'success');
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
        depositStatus: booking.depositStatus,
      });
      await loadMessages(activeConv.id);
      showToast('Seña en custodia', 'La seña queda asentada en la plataforma hasta que confirmes la llegada.', 'success');
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
        depositStatus: booking.depositStatus,
      });
      await loadMessages(activeConv.id);
      showToast('Seña liberada', 'La llegada ya quedó confirmada y la seña pasó a liberación.', 'success');
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
        depositStatus: booking.depositStatus,
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

  if (loading) return <LoadingState message="Cargando conversaciones..." description="Estamos trayendo tus mensajes para que retomes la charla desde donde quedó." />;

  const activeRequestContext = getActiveRequestContext(activeConv, initialConversationId, initialRequestContext);
  const isTenantConversation = Boolean(user && activeConv && user.id === activeConv.tenant_id);
  const isHostConversation = Boolean(user && activeConv && user.id === activeConv.host_id);
  const flowCopy = activeRequestContext
    ? getReservationFlowCopy({
        mode: activeRequestContext.mode,
        requestStatus: activeRequestContext.requestStatus,
        bookingStatus: activeRequestContext.bookingStatus,
        depositStatus: activeRequestContext.depositStatus,
        cancellationActor: activeRequestContext.cancellationActor,
        viewerRole: isTenantConversation ? 'guest' : 'host',
      })
    : null;
  const requestAccepted = Boolean(flowCopy && flowCopy.stage && flowCopy.stage !== 'request-pending');
  const suggestionTexts = getSuggestionTexts(activeRequestContext, isTenantConversation);
  const requestDateLabel = activeRequestContext
    ? `${formatRequestDate(activeRequestContext.startDate)} al ${formatRequestDate(activeRequestContext.endDate)}`
    : null;
  const flowMilestonesBase = activeRequestContext
    ? getReservationFlowMilestones({
        mode: activeRequestContext.mode,
        requestStatus: activeRequestContext.requestStatus,
        bookingStatus: activeRequestContext.bookingStatus,
        depositStatus: activeRequestContext.depositStatus,
        cancellationActor: activeRequestContext.cancellationActor,
        viewerRole: isTenantConversation ? 'guest' : 'host',
      })
    : [];
  const requestDeadline = flowCopy?.stage === 'request-pending'
    ? getRequestDeadline(activeRequestContext?.requestCreatedAt ?? activeConv?.requestCreatedAt)
    : null;
  const isRequestExpired = Boolean(requestDeadline && Date.now() > requestDeadline.getTime());
  const isExpiredPendingRequest = Boolean(flowCopy?.stage === 'request-pending' && isRequestExpired);
  const requestHeading = isExpiredPendingRequest ? 'Solicitud vencida' : flowCopy?.statusLabel ?? null;
  const requestDescription = isExpiredPendingRequest
    ? isTenantConversation
      ? 'La solicitud venció porque no hubo respuesta dentro del plazo.'
      : 'La solicitud venció porque no se respondió dentro del plazo.'
    : flowCopy?.description ?? 'Dejá por acá fechas, montos y cambios importantes para que la conversación quede clara.';
  const requestGuidance = isExpiredPendingRequest
    ? isTenantConversation
      ? 'Si todavía querés avanzar, mandá otro mensaje o abrí una nueva solicitud.'
      : 'Si todavía quieren avanzar, el huésped tiene que abrir una nueva solicitud.'
    : flowCopy?.supportText ?? null;
  const flowMilestones: ReservationFlowMilestone[] = isExpiredPendingRequest
    ? flowMilestonesBase.map((milestone, index) => ({
        ...milestone,
        label: index === 0 ? 'Solicitud vencida' : milestone.label,
        state: index === 0 ? 'current' : 'upcoming',
      }))
    : flowMilestonesBase;
  const requestCreatedAtDate = parseTimestampValue(activeRequestContext?.requestCreatedAt ?? activeConv?.requestCreatedAt);
  const counterpartyId = user && activeConv
    ? user.id === activeConv.tenant_id
      ? activeConv.host_id
      : activeConv.tenant_id
    : null;
  const hasCounterpartyReplyAfterRequest = Boolean(
    requestCreatedAtDate
    && counterpartyId
    && messages.some((message) => {
      if (message.is_system || message.sender_id !== counterpartyId) {
        return false;
      }

      const messageCreatedAt = parseTimestampValue(message.created_at);
      return Boolean(messageCreatedAt && messageCreatedAt.getTime() >= requestCreatedAtDate.getTime());
    }),
  );
  const requestDeadlineMessage = flowCopy?.stage === 'request-pending' && requestDeadline
    ? isTenantConversation
      ? isRequestExpired
        ? `El plazo de respuesta terminó ${formatDeadlineLabel(requestDeadline)}.`
        : `El anfitrión tiene hasta ${formatDeadlineLabel(requestDeadline)} para responder.`
      : isRequestExpired
        ? `Esta solicitud venció ${formatDeadlineLabel(requestDeadline)}.`
        : `Respondé antes de ${formatDeadlineLabel(requestDeadline)} para que no se venza.`
    : null;
  const noResponseMessage = isTenantConversation && flowCopy?.stage === 'request-pending' && isRequestExpired && !hasCounterpartyReplyAfterRequest
    ? 'Todavía no hubo respuesta. Podés enviar otro mensaje o ver otras opciones.'
    : null;
  const canAcceptRequest = Boolean(isHostConversation && flowCopy?.stage === 'request-pending' && !isRequestExpired);
  const canReportDirectDeposit = Boolean(isTenantConversation && activeRequestContext?.mode === 'direct' && flowCopy?.stage === 'request-accepted');
  const canConfirmDirectDeposit = Boolean(isHostConversation && activeRequestContext?.mode === 'direct' && flowCopy?.stage === 'direct-deposit-reported');
  const canPayProtectedDeposit = Boolean(isTenantConversation && activeRequestContext?.mode === 'protected' && flowCopy?.stage === 'request-accepted' && activeRequestContext.bookingId);
  const arrivalActionsAvailable = isBookingCheckInReached(activeRequestContext?.startDate);
  const canConfirmArrival = Boolean(isTenantConversation && activeRequestContext?.mode === 'protected' && flowCopy?.stage === 'protected-deposit-held' && activeRequestContext.bookingId && arrivalActionsAvailable);
  const canReportArrivalProblem = Boolean(isTenantConversation && activeRequestContext?.mode === 'protected' && flowCopy?.stage === 'protected-deposit-held' && activeRequestContext.bookingId && arrivalActionsAvailable);
  const canCoordinateArrival = Boolean(
    activeRequestContext
    && (flowCopy?.stage === 'request-accepted'
      || flowCopy?.stage === 'direct-deposit-reported'
      || flowCopy?.stage === 'protected-deposit-held'
      || flowCopy?.stage === 'reservation-confirmed'),
  );
  const arrivalActionsHint = flowCopy?.stage === 'protected-deposit-held' && !arrivalActionsAvailable
    ? 'Confirmar llegada y reportar un problema se habilitan el día del ingreso.'
    : null;
  const arrivalCoordinationDraft = isTenantConversation
    ? '¿Qué horario de llegada te queda mejor?'
    : 'Si querés, definimos ahora el horario de llegada.';
  const requestStatusTone = isRequestExpired
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    : flowCopy?.stage === 'reservation-confirmed' || flowCopy?.stage === 'protected-deposit-released'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : flowCopy?.stage === 'host-cancelled'
      ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
      : flowCopy?.stage === 'guest-cancelled'
        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
        : flowCopy?.stage === 'protected-deposit-review' || flowCopy?.stage === 'protected-no-show-pending' || flowCopy?.stage === 'direct-deposit-reported'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
    : flowCopy?.stage === 'request-accepted' || flowCopy?.stage === 'protected-deposit-held'
      ? 'bg-brand/10 text-brand'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  const requestStatusIcon = isRequestExpired
    ? <Icons.Clock className="h-3.5 w-3.5" />
    : flowCopy?.stage === 'reservation-confirmed' || flowCopy?.stage === 'protected-deposit-released'
    ? <Icons.CheckCircle2 className="h-3.5 w-3.5" />
    : flowCopy?.stage === 'host-cancelled' || flowCopy?.stage === 'guest-cancelled'
      ? <Icons.AlertTriangle className="h-3.5 w-3.5" />
      : flowCopy?.stage === 'protected-deposit-review' || flowCopy?.stage === 'protected-no-show-pending'
        ? <Icons.ShieldAlert className="h-3.5 w-3.5" />
    : activeRequestContext?.mode === 'protected'
      ? <Icons.ShieldCheck className="h-3.5 w-3.5" />
      : flowCopy?.stage === 'direct-deposit-reported'
        ? <Icons.Clock className="h-3.5 w-3.5" />
        : <Icons.MessageSquare className="h-3.5 w-3.5" />;
  const chatContextMessage = flowCopy?.stage === 'host-cancelled' || flowCopy?.stage === 'guest-cancelled'
    ? 'El chat sigue disponible por si necesitás dejar asentado cómo cierran esta cancelación.'
    : flowCopy?.stage === 'protected-deposit-review' || flowCopy?.stage === 'protected-no-show-pending'
      ? 'El chat sigue activo para dejar contexto mientras la plataforma revisa este punto.'
      : flowCopy?.stage === 'protected-deposit-held' || flowCopy?.stage === 'reservation-confirmed'
        ? isTenantConversation
          ? 'Próximo paso: coordiná horario de llegada con el anfitrión.'
          : 'Próximo paso: coordiná horario de llegada con el huésped.'
      : requestAccepted
        ? 'Usá este chat para cerrar horarios, ingreso y cualquier ajuste final sin perder el contexto de la solicitud.'
        : 'Dejá por acá fechas, montos y cambios importantes. Si después necesitás revisar algo, queda todo mucho más claro.';

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
              <button
                key={c.id}
                onClick={() => setActiveConv(c)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-[24px] p-3 text-left transition-all sm:rounded-3xl sm:p-4",
                  activeConv?.id === c.id 
                    ? "bg-brand text-white shadow-xl shadow-brand/20" 
                    : "hover:bg-slate-50 dark:hover:bg-slate-900"
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                  <img src={c.propertyImage} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate text-sm">
                    {user?.id === c.tenant_id ? c.hostName : c.tenantName}
                  </p>
                  <p className={cn(
                    "text-[10px] truncate uppercase font-black tracking-widest leading-tight",
                    activeConv?.id === c.id ? "text-white/70" : "text-slate-400"
                  )}>
                    {c.propertyTitle}
                  </p>
                </div>
              </button>
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
            <div className="glass flex items-center justify-between border-b border-slate-100 p-3.5 dark:border-slate-800 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => setActiveConv(null)} className="rounded-full p-2 md:hidden">
                  <Icons.ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                   <h3 className="font-black text-sm uppercase tracking-tight">
                     {user?.id === activeConv.tenant_id ? activeConv.hostName : activeConv.tenantName}
                   </h3>
                   <p className="text-[10px] font-bold text-brand uppercase tracking-widest">{activeConv.propertyTitle || 'Disponible en la app'}</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(true)} className="rounded-full p-2.5 text-slate-400 transition-colors hover:text-red-500">
                <Icons.AlertTriangle className="w-5 h-5" />
              </button>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mx-auto max-w-3xl space-y-3">
                {activeRequestContext ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <span className={cn(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                              requestStatusTone,
                            )}>
                              {requestStatusIcon}
                              <span>{requestHeading}</span>
                            </span>
                            <span className={cn(
                              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                              activeRequestContext.mode === 'protected'
                                ? 'bg-brand/10 text-brand'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                            )}>
                              {activeRequestContext.mode === 'protected' ? <Icons.ShieldCheck className="h-3.5 w-3.5" /> : <Icons.MessageSquare className="h-3.5 w-3.5" />}
                              <span>{activeRequestContext.mode === 'protected' ? 'Reserva protegida' : 'Acuerdo directo'}</span>
                            </span>
                          </div>
                          <div>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{requestDescription}</p>
                            {requestGuidance ? <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{requestGuidance}</p> : null}
                            {flowCopy?.trackingHint ? <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{flowCopy.trackingHint}</p> : null}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                          {canAcceptRequest ? (
                            <button
                              type="button"
                              onClick={handleAcceptRequest}
                              disabled={acceptingRequest || processingFlowAction !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_-28px_rgba(67,56,202,0.5)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {acceptingRequest ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.CheckCircle2 className="h-4 w-4" />}
                              <span>{acceptingRequest ? 'Aceptando...' : activeRequestContext.mode === 'protected' ? 'Aceptar solicitud' : 'Aceptar propuesta'}</span>
                            </button>
                          ) : null}
                          {canReportDirectDeposit ? (
                            <button
                              type="button"
                              onClick={handleReportDirectDeposit}
                              disabled={processingFlowAction !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_-28px_rgba(67,56,202,0.5)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingFlowAction === 'report-direct-deposit' ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.MessageSquare className="h-4 w-4" />}
                              <span>{processingFlowAction === 'report-direct-deposit' ? 'Confirmando...' : 'Confirmar seña'}</span>
                            </button>
                          ) : null}
                          {canConfirmDirectDeposit ? (
                            <button
                              type="button"
                              onClick={handleConfirmDirectDeposit}
                              disabled={processingFlowAction !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_-28px_rgba(67,56,202,0.5)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingFlowAction === 'confirm-direct-deposit' ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.CheckCircle2 className="h-4 w-4" />}
                              <span>{processingFlowAction === 'confirm-direct-deposit' ? 'Confirmando...' : 'Confirmar recepción'}</span>
                            </button>
                          ) : null}
                          {canPayProtectedDeposit ? (
                            <button
                              type="button"
                              onClick={() => activeRequestContext.bookingId && void handlePayProtectedDeposit(activeRequestContext.bookingId)}
                              disabled={processingFlowAction !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_-28px_rgba(67,56,202,0.5)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingFlowAction === 'pay-protected-deposit' ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.ShieldCheck className="h-4 w-4" />}
                              <span>{processingFlowAction === 'pay-protected-deposit' ? 'Registrando...' : 'Pagar seña'}</span>
                            </button>
                          ) : null}
                          {canConfirmArrival ? (
                            <button
                              type="button"
                              onClick={() => activeRequestContext.bookingId && void handleConfirmArrival(activeRequestContext.bookingId)}
                              disabled={processingFlowAction !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_-28px_rgba(67,56,202,0.5)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingFlowAction === 'confirm-arrival' ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.CheckCircle2 className="h-4 w-4" />}
                              <span>{processingFlowAction === 'confirm-arrival' ? 'Confirmando...' : 'Confirmar llegada'}</span>
                            </button>
                          ) : null}
                          {canReportArrivalProblem ? (
                            <button
                              type="button"
                              onClick={() => activeRequestContext.bookingId && void handleReportArrivalProblem(activeRequestContext.bookingId)}
                              disabled={processingFlowAction !== null}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-transform hover:-translate-y-px hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {processingFlowAction === 'report-arrival-problem' ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.AlertTriangle className="h-4 w-4" />}
                              <span>{processingFlowAction === 'report-arrival-problem' ? 'Informando...' : 'Reportar problema'}</span>
                            </button>
                          ) : null}
                          {canCoordinateArrival ? (
                            <button
                              type="button"
                              onClick={() => setInputText(arrivalCoordinationDraft)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-transform hover:-translate-y-px hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                              <Icons.Calendar className="h-4 w-4" />
                              <span>Coordinar llegada</span>
                            </button>
                          ) : null}
                        </div>

                        {arrivalActionsHint ? (
                          <p className="rounded-2xl bg-white/70 px-4 py-3 text-xs font-medium text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
                            {arrivalActionsHint}
                          </p>
                        ) : null}
                      </div>

                      {flowMilestones.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {flowMilestones.map((milestone) => {
                            const MilestoneIcon = getFlowMilestoneIcon(milestone.key, activeRequestContext.mode);

                            return (
                              <div key={milestone.key} className={cn('rounded-2xl border px-3 py-3 text-sm', getFlowMilestoneClasses(milestone.state))}>
                                <div className="flex items-center gap-2">
                                  <MilestoneIcon className="h-4 w-4" />
                                  <p className="text-[10px] font-black uppercase tracking-[0.14em]">{getFlowMilestoneStateLabel(milestone.state)}</p>
                                </div>
                                <p className="mt-2 font-semibold">{milestone.label}</p>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      <div className="grid gap-2 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Estado actual</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{requestHeading ?? 'Sin estado'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Actúa ahora</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{isExpiredPendingRequest ? 'Huésped' : flowCopy?.nextActorLabel ?? 'Nadie'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Próximo paso</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{isExpiredPendingRequest ? (isTenantConversation ? 'Enviar nueva solicitud' : 'Esperar nueva solicitud') : flowCopy?.nextStepLabel ?? 'Solo coordinar por chat'}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Propiedad</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{activeRequestContext.propertyTitle}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Fechas</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{requestDateLabel}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Huéspedes</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{activeRequestContext.guests} {activeRequestContext.guests === 1 ? 'huésped' : 'huéspedes'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Total estimado</p>
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(activeRequestContext.totalPrice || 0)}
                          </p>
                        </div>
                      </div>

                      {flowCopy?.directDepositHint ? (
                        <div className="flex gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          <Icons.Info className="h-4 w-4 shrink-0 text-brand" />
                          <p className="leading-5">{flowCopy.directDepositHint}</p>
                        </div>
                      ) : null}

                      {requestDeadlineMessage ? (
                        <div className="flex gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                          <Icons.Clock className="h-4 w-4 shrink-0 text-brand" />
                          <p className="leading-5">{requestDeadlineMessage}</p>
                        </div>
                      ) : null}

                      {noResponseMessage ? (
                        <div className="flex gap-3 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300">
                          <Icons.AlertTriangle className="h-4 w-4 shrink-0" />
                          <p className="leading-5">{noResponseMessage}</p>
                        </div>
                      ) : null}

                      {suggestionTexts.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {suggestionTexts.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setInputText(suggestion)}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-3 rounded-[24px] border border-slate-200/80 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <Icons.ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
                  <p className="leading-5">{chatContextMessage}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-slate-50/30 dark:bg-transparent">
              {error && activeConv && (
                <div className="flex items-start gap-3 max-w-2xl mx-auto p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl">
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

              {messages.length === 0 && !error && (
                <div className="text-center py-12 text-slate-400">
                  <Icons.MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Todavía no hay mensajes</p>
                  <p className="text-xs opacity-70">Escribí el primero</p>
                </div>
              )}

              {messages.map((msg) => (
                msg.is_system ? (
                  <div key={msg.id} className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    <div className="max-w-md rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-2 text-center text-[11px] font-medium leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                      {msg.content}
                    </div>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>
                ) : (
                  <div key={msg.id} className={cn(
                    "flex flex-col gap-1 max-w-[80%]",
                    msg.sender_id === user?.id ? "self-end" : "self-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-[28px] text-sm font-medium leading-relaxed shadow-sm relative",
                      msg.sender_id === user?.id
                        ? "bg-brand text-white rounded-tr-none shadow-brand/10"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-800"
                    )}>
                      {msg.content}
                      {sendingMessageId === msg.id && (
                        <Icons.Loader2 className="w-3 h-3 animate-spin absolute -right-6 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest text-slate-400 px-2",
                      msg.sender_id === user?.id ? "text-right" : "text-left",
                      sendingMessageId === msg.id && "opacity-50"
                    )}>
                      {(msg as any).is_optimistic ? 'Enviando...' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              ))}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="max-w-4xl mx-auto flex items-center gap-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribí un mensaje..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 ring-brand/20 transition-all shadow-inner"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sendingMessageId !== null}
                  className="bg-brand text-white p-4 rounded-2xl shadow-xl shadow-brand/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessageId !== null ? (
                    <Icons.Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Icons.Send className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showReportModal && (
        <ReportModal 
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            setShowReportModal(false);
            showToast('Reporte recibido', 'Gracias. Ya recibimos tu reporte.', 'success');
          }}
        />
      )}
    </div>
  );
};
