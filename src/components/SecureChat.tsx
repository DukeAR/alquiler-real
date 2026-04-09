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
import { formatGuestMemberSinceYear, resolveGuestRequestProfile } from '../lib/guestRequestProfile';
import { getHostTrust } from '../lib/hostTrust';
import { getReservationFlowCopy } from '../lib/reservationFlow';
import { getVerificationSummaryItems, getVerificationSummaryLabel } from './ui/VerificationMeter';

type InlineThreadNoticeTone = 'neutral' | 'warning' | 'brand';

type InlineThreadNotice = {
  key: string;
  body: string;
  title?: string;
  tone?: InlineThreadNoticeTone;
};

type SystemMessageActionKind = 'report-direct-deposit' | 'pay-protected-deposit' | 'confirm-direct-deposit';

type ThreadSystemMessagePresentation = {
  content: string;
  emphasis: 'pill' | 'card';
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

const getHostTrustItemShortLabel = (label: string) => {
  if (/identidad/i.test(label)) {
    return 'Identidad verificada';
  }

  if (/reservas/i.test(label)) {
    return 'Historial';
  }

  if (/reseñas/i.test(label)) {
    return 'Reseñas';
  }

  if (/antigüedad/i.test(label)) {
    return 'Antigüedad';
  }

  return label;
};

const getHostVerificationLine = (completedLabels: string[]) => {
  if (completedLabels.length === 0) {
    return null;
  }

  const visibleLabels = completedLabels.slice(0, 3);
  const remainingCount = Math.max(0, completedLabels.length - visibleLabels.length);

  return `${visibleLabels.map((label) => `✔ ${label}`).join(' · ')}${remainingCount > 0 ? ` · +${remainingCount}` : ''}`;
};

const getGuestVerificationItemShortLabel = (label: string) => {
  if (/historial/i.test(label)) {
    return 'Historial en la plataforma';
  }

  if (/identidad/i.test(label)) {
    return 'Identidad verificada';
  }

  return label;
};

const formatCountLabel = (count: number, singular: string, plural: string) => (
  `${count} ${count === 1 ? singular : plural}`
);

const buildHostGuestQuestionSuggestions = (requestContext: ReservationRequestContext | null) => {
  if (!requestContext) {
    return [] as string[];
  }

  const multipleGuests = requestContext.guests !== 1;

  return [
    multipleGuests ? '¿Vienen por descanso o trabajo?' : '¿Venís por descanso o trabajo?',
    multipleGuests ? '¿En qué horario estiman llegar?' : '¿En qué horario estimás llegar?',
    multipleGuests ? '¿Ya conocen la zona?' : '¿Ya conocés la zona?',
    multipleGuests ? '¿Necesitan algo puntual?' : '¿Necesitás algo puntual?',
  ];
};

const getCompactReservationStatus = (
  stage: ReturnType<typeof getReservationFlowCopy>['stage'],
  isExpiredPendingRequest: boolean,
) : CompactReservationStatus | null => {
  if (isExpiredPendingRequest) {
    return {
      key: 'vencida',
      label: 'Vencida',
      tone: 'warning',
    };
  }

  switch (stage) {
    case 'request-pending':
      return {
        key: 'esperando_respuesta',
        label: 'Esperando respuesta',
        tone: 'warning',
      };
    case 'request-accepted':
    case 'direct-deposit-reported':
      return {
        key: 'pendiente_seña',
        label: 'Pendiente seña',
        tone: 'brand',
      };
    case 'protected-deposit-held':
      return {
        key: 'seña_en_custodia',
        label: 'Seña en custodia',
        tone: 'brand',
      };
    case 'reservation-confirmed':
    case 'protected-deposit-released':
      return {
        key: 'confirmada',
        label: 'Confirmada',
        tone: 'success',
      };
    case 'protected-deposit-review':
    case 'protected-no-show-pending':
      return {
        key: 'en_revision',
        label: 'En revisión',
        tone: 'warning',
      };
    case 'guest-cancelled':
    case 'host-cancelled':
      return {
        key: 'cancelada',
        label: 'Cancelada',
        tone: 'neutral',
      };
    default:
      return null;
  }
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
          'Cuando la envíe, informo la seña por acá.',
          '¿Hay algo más que convenga dejar cerrado ahora?',
        ]
      : [
          'Quedo atento a que el huésped informe la seña.',
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
          'Voy a pagar la seña desde la app.',
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
          ? 'La solicitud ya quedó aceptada. El siguiente paso es que el huésped pague la seña desde la app.'
          : 'La propuesta ya quedó aceptada. El siguiente paso es que el huésped informe la seña por chat.',
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
      showToast('Reserva confirmada', 'La seña ya quedó confirmada y la reserva sigue por chat con los últimos detalles.', 'success');
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
  const suggestionTexts = getSuggestionTexts(activeRequestContext, isTenantConversation);
  const counterpartyName = user && activeConv
    ? user.id === activeConv.tenant_id
      ? activeConv.hostName || 'Anfitrión'
      : activeConv.tenantName || 'Huésped'
    : 'Conversación';
  const hostTrustSummary = activeConv ? getHostTrust(activeConv) : null;
  const completedHostTrustLabels = hostTrustSummary
    ? hostTrustSummary.items
        .filter((item) => item.status === 'complete')
        .map((item) => getHostTrustItemShortLabel(item.label))
    : [];
  const hostVerificationLine = hostTrustSummary
    ? getHostVerificationLine(completedHostTrustLabels)
    : null;
  const shouldShowGuestContext = Boolean(
    isHostConversation
    && activeConv
    && (activeConv.guestProfile || typeof activeConv.guestPositiveReviewsCount === 'number'),
  );
  const guestContextProfile = shouldShowGuestContext && activeConv
    ? resolveGuestRequestProfile({
        id: activeConv.tenant_id,
        userName: activeConv.tenantName,
        guestProfile: activeConv.guestProfile ?? null,
      })
    : null;
  const guestVerificationLabel = guestContextProfile
    ? getVerificationSummaryLabel(guestContextProfile.verificationSummary)
    : null;
  const guestCompletedChecks = guestContextProfile
    ? getVerificationSummaryItems(guestContextProfile.verificationSummary, { status: 'complete', limit: 3 })
        .map((item) => getGuestVerificationItemShortLabel(item.label))
    : [];
  const guestContextStats = guestContextProfile
    ? [
        guestContextProfile.dataAvailability.platformHistory && guestContextProfile.platformHistory.completedStays > 0
          ? formatCountLabel(guestContextProfile.platformHistory.completedStays, 'estadía completada', 'estadías completadas')
          : null,
        typeof activeConv?.guestPositiveReviewsCount === 'number' && activeConv.guestPositiveReviewsCount > 0
          ? formatCountLabel(activeConv.guestPositiveReviewsCount, 'reseña positiva', 'reseñas positivas')
          : null,
        guestContextProfile.dataAvailability.memberSince && guestContextProfile.memberSince.trim()
          ? `Usuario desde ${formatGuestMemberSinceYear(guestContextProfile.memberSince)}`
          : null,
      ].filter((value): value is string => Boolean(value))
    : [];
  const hostGuestQuestionSuggestions = isHostConversation
    && activeRequestContext
    && (flowCopy?.stage === 'request-pending' || flowCopy?.stage === 'request-accepted')
    ? buildHostGuestQuestionSuggestions(activeRequestContext)
    : [];
  const hasAuthoredConversationMessage = Boolean(
    user && messages.some((message) => !message.is_system && message.sender_id === user.id),
  );
  const guestIntroPrompt = isTenantConversation && !hasAuthoredConversationMessage && flowCopy?.stage === 'request-pending'
    ? 'Podés contar brevemente el motivo de tu estadía para coordinar mejor.'
    : null;
  const visibleSuggestionTexts = isHostConversation && hostGuestQuestionSuggestions.length > 0
    ? []
    : suggestionTexts;
  const contextSummaryLine = activeRequestContext
    ? [
        activeRequestContext.propertyTitle,
        formatCompactDateRange(activeRequestContext.startDate, activeRequestContext.endDate),
        `${activeRequestContext.guests} ${activeRequestContext.guests === 1 ? 'huésped' : 'huéspedes'}`,
        currencyFormatter.format(activeRequestContext.totalPrice || 0),
      ].filter(Boolean).join(' · ')
    : activeConv?.propertyTitle || null;
  const requestDeadline = flowCopy?.stage === 'request-pending'
    ? getRequestDeadline(activeRequestContext?.requestCreatedAt ?? activeConv?.requestCreatedAt)
    : null;
  const isRequestExpired = Boolean(requestDeadline && Date.now() > requestDeadline.getTime());
  const isExpiredPendingRequest = Boolean(flowCopy?.stage === 'request-pending' && isRequestExpired);
  const compactReservationStatus = getCompactReservationStatus(flowCopy?.stage ?? null, isExpiredPendingRequest);
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
    && (flowCopy?.stage === 'protected-deposit-held'
      || flowCopy?.stage === 'protected-deposit-released'
      || flowCopy?.stage === 'reservation-confirmed'),
  );
  const arrivalActionsHint = flowCopy?.stage === 'protected-deposit-held' && !arrivalActionsAvailable
    ? flowCopy.pendingActionHint
    : null;
  const arrivalCoordinationDraft = isTenantConversation
    ? '¿Qué horario de llegada te queda mejor?'
    : 'Si querés, definimos ahora el horario de llegada.';
  const activeReservationSystemKey = isExpiredPendingRequest
    ? null
    : flowCopy?.stage === 'request-pending'
      ? 'request-sent'
      : flowCopy?.stage === 'request-accepted'
        ? 'request-accepted'
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
  const hasStatusSystemStep = Boolean(activeReservationSystemKey);
  const hasSystemMessages = messages.some((message) => message.is_system);
  const requestSupportMessage = isExpiredPendingRequest ? requestGuidance : flowCopy?.supportText ?? null;
  const inlineThreadNotices: InlineThreadNotice[] = (() => {
    const notices: InlineThreadNotice[] = [];

    if (!hasSystemMessages && !hasStatusSystemStep && requestHeading && requestDescription) {
      notices.push({
        key: 'flow-status',
        title: requestHeading,
        body: requestDescription,
        tone: isRequestExpired ? 'warning' : 'brand',
      });
    }

    if (!hasSystemMessages && !hasStatusSystemStep && requestSupportMessage) {
      notices.push({
        key: 'flow-support',
        body: requestSupportMessage,
        tone: 'neutral',
      });
    }

    if (!hasSystemMessages && flowCopy?.trackingHint) {
      notices.push({
        key: 'flow-tracking',
        body: flowCopy.trackingHint,
        tone: 'neutral',
      });
    }

    if (requestDeadlineMessage) {
      notices.push({
        key: 'request-deadline',
        body: requestDeadlineMessage,
        tone: isRequestExpired ? 'warning' : 'neutral',
      });
    }

    if (noResponseMessage) {
      notices.push({
        key: 'request-no-response',
        body: noResponseMessage,
        tone: 'warning',
      });
    }

    if (arrivalActionsHint) {
      notices.push({
        key: 'arrival-actions',
        body: arrivalActionsHint,
        tone: 'neutral',
      });
    }

    return notices;
  })();
  const derivedSafetyMessages: Message[] = (() => {
    const reminders: Message[] = [];
    const saferChatStartText = 'Podés coordinar todo por acá. Evitá compartir datos sensibles o pagos por fuera hasta tener claro el acuerdo.';
    const beforeDepositReminderText = 'Antes de avanzar con la seña, confirmá que los datos coincidan con el anfitrión del aviso.';
    const protectedClarityText = 'Estás usando la reserva protegida para mayor claridad.';
    const keywordReminderText = 'Verificá que la cuenta esté a nombre del anfitrión antes de transferir.';
    const directProofReminderText = 'Guardá el comprobante de la seña por si necesitás revisarlo.';
    const currentMessages = [...messages, ...fallbackSystemMessages];
    const existingSystemTexts = new Set(
      currentMessages
        .filter((message) => message.is_system)
        .map((message) => message.content.trim()),
    );

    if (messages.length === 0 && !existingSystemTexts.has(saferChatStartText) && activeConv) {
      reminders.push({
        id: `assist-safer-chat-${activeConv.id}`,
        conversation_id: activeConv.id,
        sender_id: activeConv.host_id,
        receiver_id: activeConv.tenant_id,
        content: saferChatStartText,
        is_system: true,
        system_key: 'assist-safer-chat',
        created_at: new Date(Date.now() - 3).toISOString(),
      });
    }

    if (flowCopy?.stage === 'request-accepted' && !existingSystemTexts.has(beforeDepositReminderText) && activeConv) {
      const baseDate = parseTimestampValue(currentMessages.at(-1)?.created_at) ?? new Date();
      reminders.push({
        id: `assist-before-payment-${activeConv.id}`,
        conversation_id: activeConv.id,
        sender_id: activeConv.host_id,
        receiver_id: activeConv.tenant_id,
        content: beforeDepositReminderText,
        is_system: true,
        system_key: 'assist-before-payment',
        created_at: new Date(baseDate.getTime() + 1).toISOString(),
      });
    }

    if (flowCopy?.stage === 'request-accepted' && activeRequestContext?.mode === 'protected' && !existingSystemTexts.has(protectedClarityText) && activeConv) {
      const baseDate = parseTimestampValue(currentMessages.at(-1)?.created_at) ?? new Date();
      reminders.push({
        id: `assist-protected-clarity-${activeConv.id}`,
        conversation_id: activeConv.id,
        sender_id: activeConv.host_id,
        receiver_id: activeConv.tenant_id,
        content: protectedClarityText,
        is_system: true,
        system_key: 'assist-protected-clarity',
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

    if (isTenantConversation && flowCopy?.stage === 'direct-deposit-reported' && !existingSystemTexts.has(directProofReminderText)) {
      const baseDate = parseTimestampValue(currentMessages.at(-1)?.created_at) ?? new Date();
      reminders.push({
        id: `assist-direct-proof-${activeConv?.id ?? 'chat'}`,
        conversation_id: activeConv?.id ?? 'chat',
        sender_id: activeConv?.host_id ?? 'system',
        receiver_id: activeConv?.tenant_id ?? 'system',
        content: directProofReminderText,
        is_system: true,
        system_key: 'assist-direct-proof',
        created_at: new Date(baseDate.getTime() + 4).toISOString(),
      });
    }

    return reminders;
  })();
  const threadMessages = sortThreadTimeline([...messages, ...fallbackSystemMessages, ...derivedSafetyMessages]);
  const getSystemMessagePresentation = (message: Message): ThreadSystemMessagePresentation => {
    if (message.system_key === 'protected-payment') {
      return {
        content: message.content,
        emphasis: 'pill',
      };
    }

    if (message.system_key === 'request-sent' && activeRequestContext?.mode) {
      return {
        content: activeRequestContext.mode === 'protected'
          ? 'Solicitud enviada. Falta la respuesta del anfitrión.'
          : 'Propuesta enviada. Falta la respuesta del anfitrión.',
        emphasis: 'pill',
      };
    }

    if (message.system_key === 'request-accepted' && flowCopy?.stage === 'request-accepted') {
      const content = activeRequestContext?.mode === 'protected'
        ? isHostConversation
          ? 'Aceptaste la solicitud.'
          : 'El anfitrión aceptó la solicitud.'
        : isHostConversation
          ? 'Aceptaste la propuesta.'
          : 'El anfitrión aceptó la propuesta.';
      const supplementaryContent = activeRequestContext?.mode === 'protected'
        ? canPayProtectedDeposit
          ? 'Ya podés avanzar con la seña.'
          : 'Ahora falta que el huésped pague la seña.'
        : canReportDirectDeposit
          ? 'Ya podés avanzar con la seña.'
          : 'Ahora falta que el huésped informe la seña.';

      return {
        content,
        emphasis: 'card',
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
                label: 'Informar seña',
                loading: processingFlowAction === 'report-direct-deposit',
                onClick: handleReportDirectDeposit,
              }
            : undefined,
      };
    }

    if (message.system_key === 'before-payment' && flowCopy?.stage === 'request-accepted') {
      return {
        content: message.content,
        emphasis: 'pill',
      };
    }

    if (message.system_key === 'direct-after-payment' && flowCopy?.stage === 'direct-deposit-reported') {
      return {
        content: 'La seña fue informada.',
        emphasis: 'card',
        supplementaryContent: 'Falta confirmar la recepción.',
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
        supplementaryContent: 'Ya pueden seguir por chat con los detalles finales.',
      };
    }

    if (message.system_key === 'protected-after-payment' && flowCopy?.stage === 'protected-deposit-held') {
      return {
        content: isTenantConversation
          ? 'La seña quedó registrada y se libera cuando confirmás la llegada.'
          : 'La seña quedó registrada y se libera cuando el huésped confirma la llegada.',
        emphasis: 'card',
      };
    }

    if (message.system_key === 'protected-after-payment' && flowCopy?.stage === 'protected-deposit-review') {
      return {
        content: 'La seña quedó en revisión.',
        emphasis: 'pill',
        supplementaryContent: 'La plataforma está revisando qué pasó.',
      };
    }

    if (message.system_key === 'protected-after-payment' && flowCopy?.stage === 'protected-no-show-pending') {
      return {
        content: 'La llegada quedó en revisión.',
        emphasis: 'pill',
        supplementaryContent: 'La seña sigue en pausa hasta cerrar la revisión.',
      };
    }

    if (message.system_key === 'protected-after-payment' && flowCopy?.stage === 'protected-deposit-released') {
      return {
        content: 'Reserva confirmada',
        emphasis: 'pill',
        supplementaryContent: 'La llegada ya quedó confirmada y la seña salió de custodia.',
      };
    }

    if (
      message.system_key === 'assist-safer-chat'
      || message.system_key === 'assist-before-payment'
      || message.system_key === 'assist-protected-clarity'
      || message.system_key === 'assist-account-check'
      || message.system_key === 'assist-direct-proof'
    ) {
      return {
        content: message.content,
        emphasis: 'pill',
      };
    }

    return {
      content: message.content,
      emphasis: 'pill',
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
              <button
                key={c.id}
                onClick={() => setActiveConv(c)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-[24px] border border-transparent p-3 text-left transition-all sm:rounded-3xl sm:p-4",
                  activeConv?.id === c.id 
                    ? "border-brand/15 bg-brand/8 text-slate-900 shadow-[0_18px_36px_-32px_rgba(67,56,202,0.35)] dark:border-brand/20 dark:bg-brand/10 dark:text-white"
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
                    activeConv?.id === c.id ? "text-brand dark:text-brand-light" : "text-slate-400"
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
            <div className="flex items-center justify-between border-b border-slate-100 bg-white/92 p-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/92 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <button onClick={() => setActiveConv(null)} className="rounded-full p-2 md:hidden">
                  <Icons.ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white sm:text-lg">
                    {counterpartyName}
                  </h3>
                  {hostVerificationLine ? (
                    <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500 dark:text-slate-300">
                      {isTenantConversation ? hostVerificationLine : `Perfil anfitrión · ${hostVerificationLine}`}
                    </p>
                  ) : null}
                </div>
              </div>
              <button onClick={() => setShowReportModal(true)} className="rounded-full p-2.5 text-slate-400 transition-colors hover:text-red-500">
                <Icons.AlertTriangle className="w-5 h-5" />
              </button>
            </div>

            {contextSummaryLine ? (
              <div className="border-b border-slate-100 bg-slate-50/75 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/40 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-1 overflow-x-auto no-scrollbar">
                  <p className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
                    {contextSummaryLine}
                  </p>
                  {compactReservationStatus ? (
                    <p className="inline-flex items-center gap-2 whitespace-nowrap text-[11px] font-medium text-slate-500 dark:text-slate-300">
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        compactReservationStatus.tone === 'success'
                          ? 'bg-emerald-500'
                          : compactReservationStatus.tone === 'brand'
                            ? 'bg-brand'
                            : compactReservationStatus.tone === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                      )} />
                      <span>Estado: {compactReservationStatus.label}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {guestContextProfile ? (
              <div className="border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
                <div className="mx-auto max-w-4xl rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Perfil del huésped
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        Lo que ya figura en la cuenta para coordinar mejor.
                      </p>
                    </div>
                    {guestVerificationLabel ? (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {guestVerificationLabel}
                      </p>
                    ) : null}
                  </div>

                  {guestCompletedChecks.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guestCompletedChecks.map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium leading-none text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                          <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-300">✔</span>
                          <span>{label}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {guestContextStats.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guestContextStats.map((stat) => (
                        <span
                          key={stat}
                          className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-[12px] font-medium leading-none text-slate-600 dark:bg-slate-950 dark:text-slate-300"
                        >
                          {stat}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

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

                    const ActionIcon = systemMessage.action?.kind === 'pay-protected-deposit'
                      ? Icons.ShieldCheck
                      : systemMessage.action?.kind === 'confirm-direct-deposit'
                        ? Icons.CheckCircle2
                        : Icons.MessageSquare;

                    return systemMessage.emphasis === 'card' ? (
                      <div key={msg.id} className="mx-auto w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-center dark:border-slate-800 dark:bg-slate-900">
                        <p className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-700 dark:text-slate-100">
                          {systemMessage.content}
                        </p>
                        {systemMessage.supplementaryContent ? (
                          <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500 dark:text-slate-300">
                            {systemMessage.supplementaryContent}
                          </p>
                        ) : null}
                        {systemMessage.action ? (
                          <div className="mt-2.5 flex justify-center">
                            <button
                              type="button"
                              onClick={systemMessage.action.onClick}
                              disabled={systemMessage.action.loading}
                              className="inline-flex items-center gap-2 rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-[0_18px_34px_-28px_rgba(67,56,202,0.4)] transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {systemMessage.action.loading ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ActionIcon className="h-3.5 w-3.5" />}
                              <span>{systemMessage.action.loading ? 'Procesando...' : systemMessage.action.label}</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div key={msg.id} className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        <div className="max-w-md rounded-full border border-slate-200/80 bg-white px-4 py-2 text-center text-[11px] font-medium leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
                          {systemMessage.supplementaryContent ? `${systemMessage.content} · ${systemMessage.supplementaryContent}` : systemMessage.content}
                        </div>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      </div>
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
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 bg-white/96 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/96 sm:px-6">
              <div className="mx-auto max-w-4xl space-y-3">
                <div className="flex items-end gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribí un mensaje..."
                    className="flex-1 rounded-[22px] border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-900 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] outline-none transition-all placeholder:text-slate-400 focus:border-brand/30 focus:ring-2 focus:ring-brand/12 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <button
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

                {canAcceptRequest || canConfirmArrival || canReportArrivalProblem || canCoordinateArrival ? (
                  <div className="flex flex-wrap gap-2">
                    {canAcceptRequest ? (
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
                ) : null}

                {guestIntroPrompt ? (
                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {guestIntroPrompt}
                  </p>
                ) : null}

                {hostGuestQuestionSuggestions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      Preguntas opcionales
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hostGuestQuestionSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setInputText(suggestion)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand/30 hover:bg-white hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {visibleSuggestionTexts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {visibleSuggestionTexts.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInputText(suggestion)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand/30 hover:bg-white hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
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
