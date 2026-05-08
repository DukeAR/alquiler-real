import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { showToast } from '../lib/toast';
import { LoadingState } from './LoadingState';
import { cn } from '../lib/utils';
import { 
  acceptConversationRequest, confirmArrival, confirmDirectDeposit, confirmProtectedDepositPayment, fetchConversations, fetchMessages, notAdvanceConversationRequest, reportArrivalProblem, reportDirectDeposit, selectExternalDeposit, selectProtectedDeposit, sendMessage,
  Conversation, Message 
} from '../services/geminiService';
import { useAuth } from '../hooks/useAuth';
import { type ReservationRequestContext } from '../types';
import { formatBookingDateShort, getBookingDateOnlyValue, isBookingCheckInReached } from '../lib/bookingDates';
import { PLATFORM_DIRECT_FLOW_NOTE, PLATFORM_PROTECTED_FLOW_NOTE } from '../lib/platformTerms';
import { getProtectedDepositPricingFromBooking } from '../lib/protectedDeposit';
import { getReservationFlowCopy, getReservationVisibleStatus } from '../lib/reservationFlow';
import { getHostTrust } from '../lib/hostTrust';
import { trackFrontendFunnelEvent } from '../lib/funnelTracking';
import { DepositChoiceBlock } from './ui/DepositChoiceBlock';
import { ReservationConfirmedState } from './ui/ReservationConfirmedState';
import { SystemEventMessage } from './ui/SystemEventMessage';
import type { TrustSignal } from './ui/TrustSignalsInline';

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
const PROTECTED_DEPOSIT_PAYMENT_ENABLED = false;

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

const containsExternalContactData = (value?: string) => {
  if (!value) {
    return false;
  }

  const normalizedValue = normalizeSafetyText(value);
  const phoneRegex = /(?:\+?\d{1,4}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}\b/;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const linkRegex = /\b(?:https?:\/\/|www\.)\S+/i;

  return phoneRegex.test(value)
    || emailRegex.test(value)
    || linkRegex.test(value)
    || /\b(instagram|insta|ig)\b/.test(normalizedValue)
    || /\b(whatsapp|whats|wsp|wpp|wa\.me)\b/.test(normalizedValue);
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

type ChatStarterQuestionKey = 'availability' | 'pets' | 'includes' | 'area';

type HostClosingChip = {
  key: HostCloseIntent;
  label: string;
  message: string;
  intent: HostCloseIntent;
};

type SecureChatProps = {
  initialConversationId?: string;
  initialRequestContext?: ReservationRequestContext | null;
  initialConversations?: Conversation[];
  disableAutoLoad?: boolean;
};

const CHAT_MESSAGE_POLL_MS = 15_000;
const CHAT_SECURITY_REMINDER = 'Por seguridad, mantené la conversación dentro de Alquiler Real hasta confirmar la reserva.';
const EXTERNAL_CONTACT_WARNING = 'Parece que este mensaje incluye datos de contacto externos. Te recomendamos mantener la conversación dentro de la plataforma.';
const EXTERNAL_CONTACT_EDIT_HINT = 'Podés editarlo antes de enviarlo.';
const CHAT_STARTER_QUESTIONS = [
  { key: 'availability', label: '¿Está disponible?' },
  { key: 'pets', label: '¿Aceptan mascotas?' },
  { key: 'includes', label: '¿Qué incluye?' },
  { key: 'area', label: '¿Cómo es la zona?' },
] as const satisfies ReadonlyArray<{ key: ChatStarterQuestionKey; label: string }>;
const SPANISH_MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

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

const buildStarterQuestionMessage = (key: ChatStarterQuestionKey, requestContext: ReservationRequestContext | null) => {
  if (key === 'availability') {
    const messageParts = ['¿Está disponible'];
    const dateRange = formatSuggestedMessageDateRange(requestContext);
    const guestCount = formatSuggestedMessageGuestCount(requestContext);

    if (dateRange) {
      messageParts.push(dateRange);
    }

    if (guestCount) {
      messageParts.push(guestCount);
    }

    return `${messageParts.join(' ')}?`;
  }

  if (key === 'pets') {
    return '¿Aceptan mascotas?';
  }

  if (key === 'includes') {
    return '¿Qué incluye?';
  }

  return '¿Cómo es la zona?';
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
    previewText: getConversationPreviewText(conversation, viewerRole),
    readState: getConversationReadState(conversation),
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

const formatHostResponseTimeLabel = (minutes?: number | null) => {
  if (!minutes || minutes <= 0) {
    return null;
  }

  if (minutes < 60) {
    return `Responde en ~${Math.max(1, Math.round(minutes))} min`;
  }

  if (minutes < 24 * 60) {
    return `Responde en ~${Math.max(1, Math.round(minutes / 60))} h`;
  }

  const dayCount = Math.max(1, Math.round(minutes / (24 * 60)));
  return `Responde en ~${dayCount} día${dayCount === 1 ? '' : 's'}`;
};

const formatHostMemberSinceLabel = (value?: string | null) => {
  const parsed = parseTimestampValue(value);

  if (!parsed) {
    return null;
  }

  return `En la plataforma desde ${SPANISH_MONTH_LABELS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
};

const formatNightlyPriceLabel = (value?: number | null) => {
  if (!value || value <= 0) {
    return null;
  }

  return `${currencyFormatter.format(value)}/noche`;
};

type HostVerificationSummary = {
  level: 'low' | 'medium' | 'high';
  label: string;
  tone: NonNullable<TrustSignal['tone']>;
};

const getHostVerificationSummary = (conversation: Conversation | null): HostVerificationSummary | null => {
  if (!conversation || (!conversation.hostTrust && typeof conversation.hostTrustScore !== 'number')) {
    return null;
  }

  const hostTrust = getHostTrust({
    hostTrust: conversation.hostTrust,
    hostTrustScore: conversation.hostTrustScore,
  });

  if (!(hostTrust.score > 0 || (conversation.hostTrust?.items?.length ?? 0) > 0)) {
    return null;
  }

  const levelLabel = hostTrust.level === 'high' ? 'alta' : hostTrust.level === 'medium' ? 'media' : 'baja';

  return {
    level: hostTrust.level,
    label: `Verificación ${levelLabel}`,
    tone: hostTrust.level === 'high' ? 'success' : hostTrust.level === 'medium' ? 'brand' : 'neutral',
  };
};

const buildHostContextSignals = (conversation: Conversation | null) => {
  if (!conversation) {
    return [] as TrustSignal[];
  }

  const signals: TrustSignal[] = [];
  const hostVerificationSummary = getHostVerificationSummary(conversation);

  if (hostVerificationSummary) {
    signals.push({
      key: 'host-verification-level',
      label: `Nivel de verificación: ${hostVerificationSummary.label.replace('Verificación ', '')}`,
      tone: hostVerificationSummary.tone,
      icon: <Icons.BadgeCheck className="h-3.5 w-3.5" />,
    });
  }

  const responseTimeLabel = formatHostResponseTimeLabel(conversation.hostInteractionHistory?.avgResponseTimeMinutes);
  if (responseTimeLabel) {
    signals.push({
      key: 'host-response-time',
      label: responseTimeLabel,
      tone: 'neutral',
      icon: <Icons.Clock className="h-3.5 w-3.5" />,
    });
  }

  const memberSinceLabel = formatHostMemberSinceLabel(conversation.hostMemberSince);
  if (memberSinceLabel) {
    signals.push({
      key: 'host-member-since',
      label: memberSinceLabel,
      tone: 'neutral',
      icon: <Icons.Calendar className="h-3.5 w-3.5" />,
    });
  }

  return signals;
};

const getConversationPreviewText = (conversation: Conversation, viewerRole: 'guest' | 'host') => {
  const normalizedLastMessage = typeof conversation.last_message === 'string'
    ? conversation.last_message.replace(/\s+/g, ' ').trim()
    : '';

  if (normalizedLastMessage) {
    return normalizedLastMessage;
  }

  return viewerRole === 'guest'
    ? 'Consultá disponibilidad o hacé preguntas antes de decidir.'
    : 'Respondé por acá para cerrar la consulta dentro de la plataforma.';
};

const getConversationReadState = (conversation: Conversation) => {
  const hasLastMessage = Boolean(typeof conversation.last_message === 'string' && conversation.last_message.trim());

  if (!hasLastMessage) {
    return {
      label: 'Sin mensajes',
      unread: false,
    };
  }

  return {
    label: conversation.lastMessageReadAt ? 'Leído' : 'No leído',
    unread: !conversation.lastMessageReadAt,
  };
};

const inferConversationMode = (conversation: Conversation | null) => {
  if (!conversation) {
    return null;
  }

  if (conversation.requestMode === 'direct' || conversation.requestMode === 'protected') {
    return conversation.requestMode;
  }

  const effectiveDepositType = getEffectiveDepositType({
    depositType: conversation.depositType,
    depositStatus: conversation.depositStatus,
  });

  if (effectiveDepositType === 'protected') {
    return 'protected' as const;
  }

  if (effectiveDepositType === 'external') {
    return 'direct' as const;
  }

  if (conversation.bookingStatus === 'confirmed' || conversation.bookingStatus === 'completed' || conversation.bookingStatus === 'pending') {
    return 'direct' as const;
  }

  return null;
};

const getConversationRequestStatus = (conversation: Conversation | null) => {
  if (!conversation) {
    return 'pending' as const;
  }

  const inferredMode = inferConversationMode(conversation);

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

  if (inferredMode === 'protected' && conversation.bookingStatus === 'confirmed') {
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
    input.depositStatus === 'checkout_pending'
    || input.depositStatus === 'held'
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

  const requestMode = inferConversationMode(activeConversation);
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

export const SecureChat: React.FC<SecureChatProps> = ({
  initialConversationId,
  initialRequestContext = null,
  initialConversations = [],
  disableAutoLoad = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(() => !disableAutoLoad && initialConversations.length === 0);
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const [acceptingRequest, setAcceptingRequest] = useState(false);
  const [pendingHostCloseIntent, setPendingHostCloseIntent] = useState<HostCloseIntent | null>(null);
  const [processingFlowAction, setProcessingFlowAction] = useState<string | null>(null);
  const [showNotAdvanceComposer, setShowNotAdvanceComposer] = useState(false);
  const [selectedNotAdvanceReason, setSelectedNotAdvanceReason] = useState<(typeof NOT_ADVANCE_REASON_OPTIONS)[number] | null>(null);
  const [otherNotAdvanceReason, setOtherNotAdvanceReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [composerWarning, setComposerWarning] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackedGuestChatOpenIdsRef = useRef(new Set<string>());
  const handledDepositCheckoutRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const messageRequestTokenRef = useRef(0);
  const messageRequestsInFlightRef = useRef(0);
  const [loadedMessagesConversationId, setLoadedMessagesConversationId] = useState<string | null>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);

  const isChatPollingAllowed = () => {
    if (typeof document !== 'undefined') {
      if (document.hidden) {
        return false;
      }

      if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
        return false;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return false;
    }

    return true;
  };

  useEffect(() => {
    activeConversationIdRef.current = activeConv?.id ?? null;
  }, [activeConv?.id]);

  useEffect(() => {
    if (disableAutoLoad) {
      setLoading(false);
      return;
    }

    void loadConversations();
  }, [disableAutoLoad]);

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
      setPendingHostCloseIntent(null);
      setInputText('');
      setComposerWarning(null);
      setLoadedMessagesConversationId(null);

      if (disableAutoLoad) {
        setMessages([]);
        setLoadedMessagesConversationId(activeConv.id);
        return;
      }

      const refreshMessages = () => {
        if (!isChatPollingAllowed()) {
          return;
        }

        void loadMessages(activeConv.id, { skipIfInFlight: true });
      };

      void loadMessages(activeConv.id);

      const handleWindowFocus = () => {
        refreshMessages();
      };

      const handleVisibilityChange = () => {
        if (typeof document !== 'undefined' && !document.hidden) {
          refreshMessages();
        }
      };

      window.addEventListener('focus', handleWindowFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      const interval = window.setInterval(refreshMessages, CHAT_MESSAGE_POLL_MS);
      return () => {
        window.clearInterval(interval);
        window.removeEventListener('focus', handleWindowFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [activeConv?.id, disableAutoLoad]);

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

  const loadMessages = async (id: string, options: { skipIfInFlight?: boolean } = {}) => {
    if (options.skipIfInFlight && messageRequestsInFlightRef.current > 0) {
      return;
    }

    const requestToken = ++messageRequestTokenRef.current;
    messageRequestsInFlightRef.current += 1;

    try {
      setError(null);
      const data = await fetchMessages(id);

      if (activeConversationIdRef.current !== id || requestToken !== messageRequestTokenRef.current) {
        return;
      }

      const nextMessages = data || [];
      setMessages(nextMessages);
      setLoadedMessagesConversationId(id);
      syncConversationListPreviewFromMessages(id, nextMessages);
    } catch (err: any) {
      console.error('[SecureChat] Error loading messages:', err);
      setError(err?.message || 'No pudimos cargar los mensajes.');
    } finally {
      messageRequestsInFlightRef.current = Math.max(0, messageRequestsInFlightRef.current - 1);
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
        successTitle ?? (acceptedMode === 'protected' ? 'Seña protegida aceptada' : 'Operación libre aceptada'),
        successDescription ?? (
          acceptedMode === 'protected'
            ? 'Ya quedó acordado. La reserva quedó marcada con seña protegida y el seguimiento sigue por este chat.'
            : 'Ya quedó acordado. Siguen coordinando por este chat y la app no interviene en pagos externos.'
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
    const messageText = inputText.trim();

    if (!messageText || !activeConv || !user) return;

    if (containsExternalContactData(messageText)) {
      setComposerWarning(EXTERNAL_CONTACT_WARNING);
      setError(null);
      return;
    }

    const receiverId = user.id === activeConv.tenant_id ? activeConv.host_id : activeConv.tenant_id;
    const optimisticId = `opt-${Date.now()}`;
    const previousConversationPreview = {
      last_message: activeConv.last_message,
      lastMessageSenderId: activeConv.lastMessageSenderId,
      lastMessageReadAt: activeConv.lastMessageReadAt ?? null,
      lastMessageCreatedAt: activeConv.lastMessageCreatedAt ?? null,
      updated_at: activeConv.updated_at,
    };
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
    setComposerWarning(null);
    setMessages(prev => [...prev, optimisticMessage]);
    setSendingMessageId(optimisticId);
    syncConversationListPreview(activeConv.id, {
      last_message: messageText,
      lastMessageSenderId: user.id,
      lastMessageReadAt: null,
      lastMessageCreatedAt: optimisticMessage.created_at,
      updated_at: optimisticMessage.created_at,
    });

    try {
      setError(null);
      const newMsg = await sendMessage(activeConv.id, messageText, receiverId);
      // Replace optimistic message with real one from server
      setMessages(prev => prev.map(msg => msg.id === optimisticId ? newMsg : msg));
      syncConversationListPreview(activeConv.id, {
        last_message: newMsg.content,
        lastMessageSenderId: newMsg.sender_id,
        lastMessageReadAt: newMsg.readAt ?? null,
        lastMessageCreatedAt: newMsg.created_at,
        updated_at: newMsg.created_at,
      });
      setPendingHostCloseIntent(null);

      if (shouldAdvanceReservationAfterSend) {
        await acceptActiveRequest({ successTitle: 'Cierre enviado' });
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'No pudimos enviar el mensaje. Intentá de nuevo.';

      if (errorMessage === EXTERNAL_CONTACT_WARNING) {
        setComposerWarning(errorMessage);
        setError(null);
      } else {
        setError(errorMessage);
      }

      setInputText(messageText); // Restore input on error
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      syncConversationListPreview(activeConv.id, previousConversationPreview);
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

  const syncConversationListPreview = (conversationId: string, preview: Partial<Conversation>) => {
    setConversations((current) => current.map((conversation) => (
      conversation.id === conversationId ? { ...conversation, ...preview } : conversation
    )));
    setActiveConv((current) => (current && current.id === conversationId ? { ...current, ...preview } : current));
  };

  const syncConversationListPreviewFromMessages = (conversationId: string, nextMessages: Message[]) => {
    const latestMessage = [...nextMessages].reverse().find((message) => !message.is_system && Boolean(message.content?.trim()));

    if (!latestMessage) {
      syncConversationListPreview(conversationId, {
        last_message: '',
        lastMessageSenderId: undefined,
        lastMessageReadAt: null,
        lastMessageCreatedAt: null,
      });
      return;
    }

    syncConversationListPreview(conversationId, {
      last_message: latestMessage.content,
      lastMessageSenderId: latestMessage.sender_id,
      lastMessageReadAt: latestMessage.readAt ?? null,
      lastMessageCreatedAt: latestMessage.created_at,
      updated_at: latestMessage.created_at,
    });
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

  const clearDepositCheckoutSearch = () => {
    const nextSearchParams = new URLSearchParams(location.search);

    nextSearchParams.delete('depositCheckout');
    nextSearchParams.delete('bookingId');
    nextSearchParams.delete('payment_id');
    nextSearchParams.delete('payment_type');
    nextSearchParams.delete('collection_id');
    nextSearchParams.delete('collection_status');
    nextSearchParams.delete('status');
    nextSearchParams.delete('external_reference');
    nextSearchParams.delete('merchant_order_id');
    nextSearchParams.delete('preference_id');

    const nextSearch = nextSearchParams.toString();
    navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
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
      showToast('Seña protegida', 'La reserva volvió a quedar marcada con seña protegida. Por ahora no procesamos pagos dentro de la app.', 'success');
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const checkoutResult = searchParams.get('depositCheckout');
    const bookingId = searchParams.get('bookingId');
    const paymentId = searchParams.get('payment_id');
    const checkoutToken = `${checkoutResult || ''}:${bookingId || ''}:${paymentId || ''}:${location.pathname}`;

    if (!checkoutResult || !bookingId) {
      handledDepositCheckoutRef.current = null;
      return;
    }

    if (handledDepositCheckoutRef.current === checkoutToken) {
      return;
    }

    handledDepositCheckoutRef.current = checkoutToken;

    const handleCheckoutReturn = async () => {
      try {
        if (checkoutResult === 'failure') {
          showToast('Pago no confirmado', 'La seña no quedó registrada. Si todavía quieren cerrarlo, podés volver a abrir el pago desde este chat.', 'warning');
          clearDepositCheckoutSearch();
          return;
        }

        if (!paymentId) {
          showToast('Pago pendiente', 'Todavía estamos esperando la confirmación de Mercado Pago para esta seña.', 'info');
          clearDepositCheckoutSearch();
          return;
        }

        const confirmation = await confirmProtectedDepositPayment(bookingId, paymentId);

        applyBookingUpdate({
          id: confirmation.booking.id,
          status: confirmation.booking.status,
          depositType: confirmation.booking.depositType,
          depositStatus: confirmation.booking.depositStatus,
          protectedDepositPricing: confirmation.booking.protectedDepositPricing,
          depositPaymentReference: confirmation.booking.depositPaymentReference,
          cancellationActor: confirmation.booking.cancellationActor,
        });

        await loadConversations();

        if (activeConv?.id) {
          await loadMessages(activeConv.id);
        }

        if (confirmation.confirmed) {
          showToast('Seña registrada', 'La seña quedó registrada y ya pueden seguir por este chat.', 'success');
        } else {
          showToast('Pago pendiente', 'Mercado Pago todavía no terminó de confirmar la seña. Si hace falta, podés reabrir el pago desde este chat.', 'info');
        }
      } catch (error) {
        showToast('Seña', error instanceof Error ? error.message : 'No pudimos confirmar la seña registrada.', 'error');
      } finally {
        clearDepositCheckoutSearch();
      }
    };

    void handleCheckoutReturn();
  }, [activeConv?.id, location.pathname, location.search, navigate]);

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
  const showInitialGuestStarter = Boolean(
    activeConv
    && isTenantConversation
    && loadedMessagesConversationId === activeConv.id
    && !hasNonSystemConversationMessages,
  );
  const starterQuickQuestions = showInitialGuestStarter
    ? CHAT_STARTER_QUESTIONS.map((question) => ({
        ...question,
        message: buildStarterQuestionMessage(question.key, activeRequestContext),
      }))
    : [];
  const hostVerificationSummary = isTenantConversation ? getHostVerificationSummary(activeConv) : null;
  const hostContextSignals = isTenantConversation ? buildHostContextSignals(activeConv) : [];
  const headerNightlyPrice = formatNightlyPriceLabel(activeConv?.propertyPrice ?? activeRequestContext?.nightly ?? null);
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
      || flowCopy?.stage === 'protected-checkout-pending'
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
    && activeRequestContext?.bookingId
    && (
      (activeRequestContext?.mode === 'direct' && flowCopy?.stage === 'request-accepted')
      || (activeRequestContext?.depositType === 'external' && flowCopy?.stage === 'external-deposit-pending')
    ),
  );
  const canConfirmDirectDeposit = Boolean(isHostConversation && flowCopy?.stage === 'direct-deposit-reported');
  const canPayProtectedDeposit = Boolean(
    PROTECTED_DEPOSIT_PAYMENT_ENABLED
    && isTenantConversation
    && activeRequestContext?.bookingId
    && activeRequestContext.depositType === 'protected'
    && flowCopy?.stage === 'protected-checkout-pending',
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
  const isReservationConfirmedStage = Boolean(
    flowCopy?.stage === 'reservation-confirmed' || flowCopy?.stage === 'protected-deposit-released',
  );
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
  const chatContextHelper = isReservationConfirmedStage || canCoordinateArrival
    ? 'La reserva ya está cerrada. Usá este chat para coordinar llegada, acceso y últimos detalles.'
    : canConfirmArrival || canReportArrivalProblem
      ? 'Hoy ya podés confirmar cómo salió el ingreso o avisar si hubo un problema.'
      : canPayProtectedDeposit
        ? 'Si quieren cerrarlo ahora, la seña queda registrada desde esta conversación.'
        : showDepositChoiceBlock
          ? 'Acá definen cómo sigue la seña y qué parte queda registrada dentro de la app.'
          : canAcceptRequest
            ? 'Ya tenés el contexto para decidir si avanzan o no con esta reserva.'
            : flowCopy?.stage === 'request-pending'
              ? isTenantConversation
                ? 'Tu propuesta ya está enviada. Cuando respondan, el siguiente paso aparece acá.'
                : null
              : flowCopy?.stage === 'request-not-advanced'
                ? 'La reserva no avanzó, pero el chat sigue abierto si quieren recoordinar.'
                : reservationProgressHint;

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
          || flowCopy?.stage === 'protected-checkout-pending'
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
    const softerChatStartText = 'Podés hablar y coordinar todo por acá sin salir de Alquiler Real.';
    const currentMessages = [...messages, ...fallbackSystemMessages];
    const existingSystemTexts = new Set(
      currentMessages
        .filter((message) => message.is_system)
        .map((message) => message.content.trim()),
    );

    if (messages.length === 0 && !showInitialGuestStarter && !existingSystemTexts.has(softerChatStartText) && activeConv) {
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
  const showReservationConfirmedState = isReservationConfirmedStage;
  const getSystemMessagePresentation = (message: Message): ThreadSystemMessagePresentation => {
    if (message.system_key === 'conversation-start' && flowCopy?.stage && flowCopy.stage !== 'request-pending') {
      return {
        content: message.content,
        emphasis: 'pill',
        hidden: true,
      };
    }

    if (message.system_key === 'request-sent' && flowCopy?.stage && flowCopy.stage !== 'request-pending') {
      return {
        content: message.content,
        emphasis: 'pill',
        hidden: true,
      };
    }

    if (
      message.system_key === 'request-accepted'
      && flowCopy?.stage
      && flowCopy.stage !== 'request-accepted'
      && flowCopy.stage !== 'deposit-choice'
      && flowCopy.stage !== 'protected-checkout-pending'
      && flowCopy.stage !== 'external-deposit-pending'
    ) {
      return {
        content: message.content,
        emphasis: 'pill',
        hidden: true,
      };
    }

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
        || flowCopy?.stage === 'protected-checkout-pending'
        || flowCopy?.stage === 'external-deposit-pending'
      )
    ) {
      const supplementaryContent = flowCopy?.stage === 'deposit-choice'
        ? isHostConversation
          ? 'Ahora el huésped define cómo avanzar con la seña.'
          : 'Ahora elegí cómo querés avanzar con la seña.'
        : activeRequestContext?.mode === 'protected'
            ? protectedDepositPreview
              ? `La reserva ya quedó marcada con seña protegida. Costo estimado: ${currencyFormatter.format(protectedDepositPreview.depositAmount)} + fee ${currencyFormatter.format(protectedDepositPreview.serviceFee)} = ${currencyFormatter.format(protectedDepositPreview.totalCharge)}. Por ahora no procesamos el cobro dentro de la app.`
              : 'La reserva ya quedó marcada con seña protegida. Por ahora solo mostramos el estado base, sin procesar pagos dentro de la app.'
          : canReportDirectDeposit
              ? 'Si ya resolvieron algo por fuera dentro de un flujo viejo, podés dejarlo asentado por acá.'
              : 'Siguen coordinando por este chat. La app no retiene dinero ni interviene en pagos externos.';

      return {
        content: 'Ya están de acuerdo.',
        emphasis: 'card',
        tone: 'brand',
        supplementaryContent,
          action: canReportDirectDeposit
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
        content: 'Operación libre',
        emphasis: 'card',
        tone: 'neutral',
        supplementaryContent: isHostConversation
          ? 'La coordinación sigue por chat y la app no interviene en pagos externos.'
          : 'La coordinación sigue por chat y la app no interviene en pagos externos.',
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
    <div className="flex h-screen overflow-hidden bg-slate-50/80 pt-2 dark:bg-slate-950 sm:pt-4 md:pt-0">
      {/* Sidebar List */}
      <div className={cn(
        "flex w-full flex-col border-r border-slate-200/80 bg-white/94 transition-all dark:border-slate-800 dark:bg-slate-950/92 md:w-[22rem] xl:w-[24rem]",
        activeConv ? "hidden md:flex" : "flex"
      )}>
        <div className="border-b border-slate-100/90 p-4 dark:border-slate-800 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Chat interno</p>
          <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-950 dark:text-white">Mensajes</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Seguí la consulta, verificá el contexto y cerrá todo sin salir de Alquiler Real.</p>
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
                const previewMeta = [preview.dateRange, preview.guestsLabel].filter(Boolean).join(' · ') || 'Chat dentro de Alquiler Real';
                const previewLabel = [
                  `Abrir conversacion sobre ${c.propertyTitle || 'esta propiedad'}`,
                  previewCounterpartyName ? `Con ${previewCounterpartyName}` : null,
                  preview.previewText,
                  preview.readState.label,
                  preview.status.label,
                ].filter(Boolean).join(' · ');

                return (
                  <button
                    key={c.id}
                    aria-label={previewLabel}
                    onClick={() => setActiveConv(c)}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-[28px] border p-3.5 text-left transition-all sm:p-4",
                      activeConv?.id === c.id
                        ? "border-brand/15 bg-brand/8 text-slate-900 shadow-[0_22px_46px_-36px_rgba(67,56,202,0.38)] dark:border-brand/20 dark:bg-brand/10 dark:text-white"
                        : "border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                    )}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[22px] bg-slate-100 dark:bg-slate-800">
                      {c.propertyImage ? (
                        <img src={c.propertyImage} alt={c.propertyTitle || 'Propiedad'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icons.Home className="h-4 w-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold tracking-tight text-slate-950 dark:text-white">
                            {c.propertyTitle || 'Propiedad'}
                          </p>
                          <p className={cn(
                            "truncate text-[10px] font-black uppercase tracking-[0.16em] leading-tight",
                            activeConv?.id === c.id ? "text-brand dark:text-brand-light" : "text-slate-400 dark:text-slate-500"
                          )}>
                            {previewCounterpartyName ? `Con ${previewCounterpartyName}` : 'Conversación abierta'}
                          </p>
                        </div>
                        <span className={cn(
                          'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                          compactReservationStatusToneClasses[preview.status.tone],
                        )}>
                          {preview.status.label}
                        </span>
                      </div>
                      <p className={cn(
                        'truncate text-sm leading-6',
                        preview.readState.unread
                          ? 'font-semibold text-slate-900 dark:text-white'
                          : 'text-slate-500 dark:text-slate-300',
                      )}>
                        {preview.previewText}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-[11px] leading-5 text-slate-400 dark:text-slate-500">{previewMeta}</p>
                        <span className={cn(
                          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
                          preview.readState.unread
                            ? 'border-brand/15 bg-brand/8 text-brand dark:border-brand/20 dark:bg-brand/10 dark:text-brand-light'
                            : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', preview.readState.unread ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600')} />
                          <span>{preview.readState.label}</span>
                        </span>
                      </div>
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
        !activeConv ? "hidden items-center justify-center bg-slate-50 dark:bg-slate-900/10 md:flex" : "flex"
      )}>
        {!activeConv ? (
          <div className="text-center space-y-4 opacity-30 select-none">
            <Icons.MessageSquare className="w-20 h-20 mx-auto text-slate-400" />
            <p className="text-sm font-black uppercase tracking-widest">Elegí una conversación para ver el historial</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-slate-200/80 bg-white/92 px-4 py-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/92 sm:px-6 sm:py-4">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <button onClick={() => setActiveConv(null)} className="rounded-full p-2 md:hidden">
                  <Icons.ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[22px] bg-slate-100 dark:bg-slate-800">
                    {activeConv.propertyImage ? (
                      <img src={activeConv.propertyImage} alt={activeConv.propertyTitle || 'Propiedad'} className="h-full w-full object-cover" />
                    ) : (
                      <Icons.Home className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                      Conversación con {counterpartyName}
                    </p>
                    <h3 className="truncate text-base font-semibold tracking-tight text-slate-950 dark:text-white sm:text-lg">
                      {activeConv.propertyTitle || 'Propiedad'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {headerNightlyPrice ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                          {headerNightlyPrice}
                        </span>
                      ) : null}
                      {hostVerificationSummary ? (
                        <span className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold',
                          hostVerificationSummary.tone === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : hostVerificationSummary.tone === 'brand'
                              ? 'border-brand/15 bg-brand/8 text-brand dark:border-brand/20 dark:bg-brand/10 dark:text-brand-light'
                              : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
                        )}>
                          {hostVerificationSummary.label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
                <button
                  type="button"
                  onClick={() => navigate(`/detail/${activeConv.property_id}`)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  <Icons.Home className="h-3.5 w-3.5" />
                  <span>Ver propiedad</span>
                </button>
              </div>
            </div>

            <div className="border-b border-slate-200/80 bg-white/88 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
              <div className="mx-auto grid max-w-6xl gap-3 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
                <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-900/60 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Contexto de la consulta</p>
                      {contextSummaryLine ? (
                        <p className="text-sm font-medium leading-6 text-slate-800 dark:text-slate-100">{contextSummaryLine}</p>
                      ) : null}
                      {chatContextHelper ? (
                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{chatContextHelper}</p>
                      ) : null}
                    </div>
                    {compactReservationStatus ? (
                      <p className={cn('inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[11px] font-semibold', compactReservationStatusToneClasses[compactReservationStatus.tone])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', compactReservationStatus.tone === 'brand' ? 'bg-brand' : compactReservationStatus.tone === 'success' ? 'bg-emerald-500' : compactReservationStatus.tone === 'warning' ? 'bg-amber-500' : 'bg-slate-400')} />
                        <span>Estado: {compactReservationStatus.label}</span>
                      </p>
                    ) : null}
                  </div>

                  {hostContextSignals.length > 0 ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {hostContextSignals.map((signal) => (
                        <div
                          key={signal.key}
                          className={cn(
                            'flex items-start gap-3 rounded-[22px] border px-3.5 py-3 text-sm leading-5',
                            signal.tone === 'success'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-200'
                              : signal.tone === 'brand'
                                ? 'border-brand/15 bg-brand/8 text-slate-800 dark:border-brand/20 dark:bg-brand/10 dark:text-slate-100'
                                : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200',
                          )}
                        >
                          <span className="mt-0.5 shrink-0">{signal.icon}</span>
                          <p className="font-medium">{signal.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/85 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Seguridad</p>
                  <div className="mt-3 flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                      <Icons.ShieldCheck className="h-4 w-4" />
                    </span>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{CHAT_SECURITY_REMINDER}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.72),rgba(255,255,255,1))] px-4 py-5 no-scrollbar dark:bg-slate-950 sm:px-6 sm:py-6">
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
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

                {showInitialGuestStarter ? (
                  <div className="mx-auto w-full max-w-2xl rounded-[28px] border border-slate-200/80 bg-white/96 p-4 shadow-[0_24px_48px_-40px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900/92 sm:p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                        {activeConv.propertyImage ? (
                          <img src={activeConv.propertyImage} alt={activeConv.propertyTitle || 'Propiedad'} className="h-full w-full object-cover" />
                        ) : (
                          <Icons.Home className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          Primer mensaje
                        </p>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                          {activeConv.propertyTitle || 'Propiedad'}
                        </h4>
                        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                          Consultá disponibilidad o hacé preguntas antes de decidir.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {starterQuickQuestions.map((question) => (
                        <button
                          key={question.key}
                          type="button"
                          onClick={() => {
                            setInputText(question.message);
                            setComposerWarning(null);
                            composerInputRef.current?.focus();
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-brand/30 hover:text-brand dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                        >
                          <Icons.MessageSquare className="h-3.5 w-3.5" />
                          <span>{question.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {threadMessages.length === 0 && !error && inlineThreadNotices.length === 0 && !showInitialGuestStarter ? (
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
                      'flex max-w-[82%] flex-col gap-1 sm:max-w-[76%]',
                      msg.sender_id === user?.id ? 'self-end' : 'self-start'
                    )}>
                      <div className={cn(
                        'relative rounded-[26px] px-4 py-3.5 text-sm font-medium leading-7 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)]',
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
                        {(msg as any).is_optimistic
                          ? 'Enviando...'
                          : `${new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${msg.sender_id === user?.id ? ` · ${msg.readAt ? 'Leído' : 'No leído'}` : ''}`}
                      </span>
                    </div>
                  );
                })}

                {showReservationConfirmedState ? (
                  <ReservationConfirmedState
                    eyebrow="Reserva confirmada"
                    title="Todo listo para esas fechas"
                    description="Ya podés coordinar tranquilo la llegada por el chat"
                    nextStep="Seguí por este chat para coordinar horario, llegada y acceso."
                  />
                ) : null}
              </div>
            </div>

            {/* Input */}
            <div className="sticky bottom-0 z-10 border-t border-slate-200/80 bg-white/96 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/96 sm:px-6">
              <div className="mx-auto max-w-6xl space-y-3">
                <div className="flex items-end gap-3">
                  <input
                    ref={composerInputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setInputText(nextValue);

                      if (!nextValue.trim()) {
                        setPendingHostCloseIntent(null);
                        setComposerWarning(null);
                        return;
                      }

                      if (composerWarning && !containsExternalContactData(nextValue)) {
                        setComposerWarning(null);
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Escribí tu consulta..."
                    className="flex-1 rounded-[22px] border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-900 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] outline-none transition-all placeholder:text-slate-400 focus:border-brand/30 focus:ring-2 focus:ring-brand/12 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    aria-label="Enviar mensaje"
                    onClick={handleSend}
                    disabled={!inputText.trim() || sendingMessageId !== null}
                    className="inline-flex items-center gap-2 rounded-[20px] bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_38px_-24px_rgba(67,56,202,0.42)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingMessageId !== null ? (
                      <>
                        <Icons.Loader2 className="h-5 w-5 animate-spin" />
                        <span>Enviando</span>
                      </>
                    ) : (
                      <>
                        <Icons.Send className="h-5 w-5" />
                        <span>Enviar</span>
                      </>
                    )}
                  </button>
                </div>

                {composerWarning ? (
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200">
                    <p className="font-medium">{composerWarning}</p>
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">{EXTERNAL_CONTACT_EDIT_HINT}</p>
                  </div>
                ) : null}

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
