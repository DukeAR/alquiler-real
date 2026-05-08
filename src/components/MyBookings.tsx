import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/apiConfig';
import {
  formatBookingDateOnly,
  formatBookingDateShort,
  formatBookingDateTime,
  getBookingDateOnlyValue,
  getCancellationDeadlineFromStartDate,
  isBookingCheckInReached,
  parseBookingDateOnly,
} from '../lib/bookingDates';
import { navigateToExternalUrl } from '../lib/browserNavigation';
import {
  BOOKING_CONTRACT_PLATFORM_TERMS,
  type BookingContractPlatformTerm,
} from '../lib/platformTerms';
import { getPropertyVerificationDetails, sortPropertiesByCatalogOrder } from '../lib/propertyVerification';
import { getProtectedDepositPricingFromBooking } from '../lib/protectedDeposit';
import { getReservationFlowCopy, getReservationNextActorDisplayLabel, getReservationNextStepDisplayLabel } from '../lib/reservationFlow';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useUserReservations } from '../hooks/useUserReservations';
import {
  acceptContract,
  cancelBooking,
  confirmProtectedDepositPayment,
  confirmArrival,
  payProtectedDeposit,
  reportArrivalProblem,
  selectExternalDeposit,
  selectProtectedDeposit,
} from '../services/geminiService';
import type { Booking, Conversation, Property } from '../types';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Icons } from './Icons';
import { LoadingState } from './LoadingState';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PropertyVerificationChecklist } from './ui/PropertyVerificationChecklist';
import { VerificationSeal } from './ui/VerificationSeal';
import { DepositChoiceBlock } from './ui/DepositChoiceBlock';
import { PlatformTermsQuickGuide } from './ui/PlatformTermsQuickGuide';
import { ReservationConfirmedState } from './ui/ReservationConfirmedState';
import { ReviewModal } from './ReviewModal';
import { SectionTitle } from './ui/SectionTitle';
import { AccountModeSwitch } from './ui/AccountModeSwitch';

const UPCOMING_STAY_WINDOW_DAYS = 21;
const RECENT_CONVERSATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PROTECTED_DEPOSIT_PAYMENT_ENABLED = false;

const RESERVATIONS_SECTION_ID = 'guest-dashboard-reservations';
const SAVED_SECTION_ID = 'guest-dashboard-saved';
const CONVERSATIONS_SECTION_ID = 'guest-dashboard-conversations';

type BookingGroupKey = 'requests' | 'accepted' | 'upcoming' | 'closed';

type ContractState = {
  id: string;
  accepted?: boolean;
  guestName?: string;
  hostName?: string;
  propertyTitle?: string;
  location?: string;
  rules?: string[];
  platformTerms?: BookingContractPlatformTerm[];
};

type PriorityAction = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  icon: React.ReactNode;
  onAction: () => void;
};

type SummaryMetricProps = {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
};

type PriorityActionRowProps = PriorityAction;

type BookingGroupProps = {
  title: string;
  description: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
};

const getContractPlatformTerms = (contract: ContractState) => (
  Array.isArray(contract.platformTerms) && contract.platformTerms.length > 0
    ? contract.platformTerms
    : BOOKING_CONTRACT_PLATFORM_TERMS
);

const SummaryMetric = ({ label, value, helper, icon }: SummaryMetricProps) => (
  <div className="rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.26)] dark:border-slate-800 dark:bg-slate-900/92">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light">
        {icon}
      </div>
    </div>
    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{value}</p>
    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{helper}</p>
  </div>
);

const PriorityActionRow = ({ eyebrow, title, description, actionLabel, icon, onAction }: PriorityActionRowProps) => (
  <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900/92 md:flex-row md:items-center md:justify-between">
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light">
        {icon}
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
        <p className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </div>
    </div>
    <Button type="button" variant="secondary" size="sm" onClick={onAction} className="shrink-0 rounded-full">
      <>
        {actionLabel}
        <Icons.ArrowRight className="h-4 w-4" />
      </>
    </Button>
  </div>
);

const BookingGroup = ({ title, description, count, emptyText, children }: BookingGroupProps) => (
  <Card padding="none" className="overflow-hidden">
    <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {count}
        </span>
      </div>
    </div>
    {count > 0 ? children : <p className="px-6 py-6 text-sm leading-6 text-slate-500 dark:text-slate-400">{emptyText}</p>}
  </Card>
);

const formatCurrency = (value?: number) => (
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0)
);

const getBookingElementId = (bookingId: string) => `guest-booking-${bookingId}`;

const scrollToTarget = (targetId: string) => {
  if (typeof document === 'undefined') {
    return false;
  }

  const target = document.getElementById(targetId);
  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
};

const getTodayDate = () => parseBookingDateOnly(getBookingDateOnlyValue(new Date()));

const getDaysUntilDate = (value?: string | null) => {
  const parsedDate = parseBookingDateOnly(value);
  const today = getTodayDate();

  if (!parsedDate || !today) {
    return null;
  }

  return Math.round((parsedDate.getTime() - today.getTime()) / DAY_MS);
};

const isWithinUpcomingWindow = (value?: string | null) => {
  const daysUntilDate = getDaysUntilDate(value);
  return daysUntilDate !== null && daysUntilDate >= 0 && daysUntilDate <= UPCOMING_STAY_WINDOW_DAYS;
};

const isFutureBookingDate = (value?: string | null) => {
  const daysUntilDate = getDaysUntilDate(value);
  return daysUntilDate !== null && daysUntilDate >= 0;
};

const parseInstant = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatConversationUpdatedAt = (value?: string | null) => {
  const parsedDate = parseInstant(value);
  if (!parsedDate) {
    return 'Sin actualización reciente';
  }

  const differenceInDays = Math.floor((Date.now() - parsedDate.getTime()) / DAY_MS);

  if (differenceInDays <= 0) {
    return 'Hoy';
  }

  if (differenceInDays === 1) {
    return 'Ayer';
  }

  if (differenceInDays < 7) {
    return `Hace ${differenceInDays} días`;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  }).format(parsedDate);
};

const compareBookingsByStartDate = (left: Booking, right: Booking) => {
  const leftDays = getDaysUntilDate(left.startDate);
  const rightDays = getDaysUntilDate(right.startDate);

  if (leftDays === null && rightDays === null) {
    return String(left.propertyTitle || '').localeCompare(String(right.propertyTitle || ''), 'es');
  }

  if (leftDays === null) {
    return 1;
  }

  if (rightDays === null) {
    return -1;
  }

  return leftDays - rightDays;
};

const isResolvedProperty = (value: unknown): value is Property => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Property>;
  return typeof candidate.id === 'string'
    && typeof candidate.title === 'string'
    && candidate.title.trim().length > 0
    && typeof candidate.location === 'string';
};

const isResolvedConversation = (value: unknown): value is Conversation => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Conversation>;
  return typeof candidate.id === 'string'
    && typeof candidate.property_id === 'string'
    && typeof candidate.updated_at === 'string';
};

const getBookingRequestStatus = (booking: Booking) => {
  if (booking.requestStatus) {
    return booking.requestStatus;
  }

  if (booking.requestMode !== 'protected') {
    return undefined;
  }

  return booking.depositStatus === 'held' || booking.depositStatus === 'released' || booking.status === 'confirmed'
    ? 'accepted'
    : 'pending';
};

const getBookingFlow = (booking: Booking) => getReservationFlowCopy({
  mode: booking.requestMode,
  requestStatus: getBookingRequestStatus(booking),
  depositType: booking.depositType,
  bookingStatus: booking.status,
  depositStatus: booking.depositStatus,
  cancellationActor: booking.cancellationActor,
  startDate: booking.startDate,
  guestCheckinConfirmed: booking.guestCheckinConfirmed,
  hostAccessConfirmed: booking.hostAccessConfirmed,
  viewerRole: 'guest',
});

const getConversationFlow = (conversation: Conversation, relatedBooking?: Booking) => getReservationFlowCopy({
  mode: relatedBooking?.requestMode ?? conversation.requestMode,
  depositType: relatedBooking?.depositType ?? conversation.depositType,
  requestStatus: relatedBooking ? getBookingRequestStatus(relatedBooking) : conversation.requestStatus,
  bookingStatus: relatedBooking?.status ?? conversation.bookingStatus,
  depositStatus: relatedBooking?.depositStatus ?? conversation.depositStatus,
  cancellationActor: relatedBooking?.cancellationActor ?? conversation.cancellationActor,
  startDate: relatedBooking?.startDate ?? conversation.startDate,
  guestCheckinConfirmed: relatedBooking?.guestCheckinConfirmed ?? conversation.guestCheckinConfirmed,
  hostAccessConfirmed: relatedBooking?.hostAccessConfirmed ?? conversation.hostAccessConfirmed,
  viewerRole: 'guest',
});

const getBookingStatusVariant = (booking: Booking): 'neutral' | 'brand' | 'success' | 'warning' | 'danger' => {
  const flow = getBookingFlow(booking);

  if (flow.stage === 'host-cancelled') {
    return 'danger';
  }

  if (flow.stage === 'guest-cancelled' || flow.stage === 'protected-deposit-review' || flow.stage === 'protected-no-show-pending') {
    return 'warning';
  }

  if (flow.stage === 'request-accepted' || flow.stage === 'protected-checkout-pending' || flow.stage === 'protected-deposit-held') {
    return 'brand';
  }

  if (flow.stage === 'protected-deposit-released' || flow.stage === 'reservation-confirmed') {
    return 'success';
  }

  switch (booking.status) {
    case 'confirmed':
      return 'brand';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'neutral';
    default:
      return 'neutral';
  }
};

const getBookingStatusText = (booking: Booking) => {
  const flow = getBookingFlow(booking);

  if (flow.statusLabel) {
    return flow.statusLabel;
  }

  switch (booking.status) {
    case 'confirmed':
      return 'Confirmada';
    case 'pending':
      return 'Pendiente';
    case 'completed':
      return 'Finalizada';
    case 'cancelled':
      return 'Cancelada';
    default:
      return booking.status;
  }
};

const getBookingGroupKey = (booking: Booking): BookingGroupKey => {
  const flow = getBookingFlow(booking);

  if (booking.status === 'completed' || booking.status === 'cancelled') {
    return 'closed';
  }

  if (flow.stage === 'request-pending' || flow.stage === 'request-accepted' || flow.stage === 'protected-checkout-pending' || flow.stage === 'direct-deposit-reported') {
    return 'requests';
  }

  if (isBookingCheckInReached(booking.startDate) || isWithinUpcomingWindow(booking.startDate) || flow.stage === 'protected-deposit-review' || flow.stage === 'protected-no-show-pending') {
    return 'upcoming';
  }

  return 'accepted';
};

const getHighlightedStayDescription = (booking: Booking) => {
  const flow = getBookingFlow(booking);

  if (flow.stage === 'protected-deposit-held' && isBookingCheckInReached(booking.startDate)) {
    return 'Tu estadía ya empezó. Desde acá podés confirmar la llegada o reportar un problema sin salir del panel.';
  }

  if (flow.stage === 'protected-deposit-held') {
    return 'La reserva ya quedó ordenada en la app. Dejala a mano para coordinar la llegada cuando se acerque el ingreso.';
  }

  if (flow.stage === 'protected-deposit-released') {
    return 'La llegada ya quedó confirmada. Usá este acceso rápido para seguir el chat y cualquier ajuste de la estadía.';
  }

  if (booking.conversationId) {
    return 'Ya tenés el chat listo para coordinar horario, llegada y cualquier detalle final con el anfitrión.';
  }

  return 'Entrá a la reserva para revisar fechas, estado y los próximos pasos antes del ingreso.';
};

export const MyBookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setActiveMode } = useAuth();
  const {
    reservations: bookings,
    setReservations: setBookings,
    loading,
    error: loadError,
    reload: fetchBookings,
  } = useUserReservations();
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [favoritesLoadError, setFavoritesLoadError] = useState<string | null>(null);
  const [conversationsLoadError, setConversationsLoadError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractState | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [externalDepositChoiceBookingId, setExternalDepositChoiceBookingId] = useState<string | null>(null);
  const [processingBookingAction, setProcessingBookingAction] = useState<{
    bookingId: string;
    action: 'select-external-deposit' | 'select-protected-deposit' | 'pay-deposit' | 'confirm-arrival' | 'report-arrival-problem';
  } | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [handledDepositCheckoutToken, setHandledDepositCheckoutToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.activeMode !== 'guest' && user.canGuest !== false) {
      void setActiveMode('guest');
    }
  }, [setActiveMode, user]);

  useEffect(() => {
    if (loading || loadError) {
      return;
    }

    let cancelled = false;

    const loadSupplementalData = async () => {
      const [favoritesResult, conversationsResult] = await Promise.allSettled([
        apiJson<unknown[]>('/api/favorites', { includeCredentials: true }),
        apiJson<unknown[]>('/api/conversations', { includeCredentials: true }),
      ]);

      if (cancelled) {
        return;
      }

      if (favoritesResult.status === 'fulfilled') {
        const nextFavorites = Array.isArray(favoritesResult.value)
          ? favoritesResult.value.filter(isResolvedProperty)
          : [];
        setFavorites(nextFavorites);
        setFavoritesLoadError(null);
      } else {
        setFavorites([]);
        setFavoritesLoadError('No pudimos actualizar tus guardados ahora.');
      }

      if (conversationsResult.status === 'fulfilled') {
        const nextConversations = Array.isArray(conversationsResult.value)
          ? conversationsResult.value.filter(isResolvedConversation)
          : [];
        setConversations(nextConversations);
        setConversationsLoadError(null);
      } else {
        setConversations([]);
        setConversationsLoadError('No pudimos actualizar tus conversaciones ahora.');
      }
    };

    void loadSupplementalData();

    return () => {
      cancelled = true;
    };
  }, [loading, loadError]);

  const formatDate = (dateStr?: string) => formatBookingDateOnly(dateStr);

  const getCancellationDeadline = (booking: Booking) => {
    if (booking.cancellationDeadline) {
      const parsedDate = new Date(booking.cancellationDeadline);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return getCancellationDeadlineFromStartDate(booking.startDate);
  };

  const getCancellationDeadlineLabel = (booking: Booking) => formatBookingDateTime(getCancellationDeadline(booking));

  const canCancelBooking = (booking: Booking) => {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return false;
    }

    if (booking.depositStatus === 'review' || booking.depositStatus === 'pending_confirmation') {
      return false;
    }

    const cancellationDeadline = getCancellationDeadline(booking);
    if (!cancellationDeadline) {
      return false;
    }

    return Date.now() < cancellationDeadline.getTime();
  };

  const openContract = (booking: Booking) => {
    if (!booking.contractJson) {
      return;
    }

    try {
      const parsedContract = JSON.parse(booking.contractJson) as Omit<ContractState, 'id' | 'accepted'>;
      setSelectedContract({
        ...parsedContract,
        id: booking.id,
        accepted: booking.contractAccepted,
      });
    } catch {
      showToast('Condiciones', 'No pudimos abrir las condiciones de esta reserva.', 'error');
    }
  };

  const updateBookingState = (nextBooking: Booking) => {
    setBookings((currentBookings) => currentBookings.map((currentBooking) => (
      currentBooking.id === nextBooking.id ? { ...currentBooking, ...nextBooking } : currentBooking
    )));
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

  const handleAcceptContract = async (bookingId: string) => {
    setAccepting(true);

    try {
      await acceptContract(bookingId);
      setBookings((currentBookings) => currentBookings.map((booking) => (
        booking.id === bookingId ? { ...booking, contractAccepted: true } : booking
      )));
      setSelectedContract((currentContract) => (
        currentContract && currentContract.id === bookingId
          ? { ...currentContract, accepted: true }
          : currentContract
      ));
      showToast('Condiciones aceptadas', 'Ya registramos la aceptación y quedó asociada a tu reserva.', 'success');
    } catch {
      showToast('Condiciones', 'No pudimos registrar la aceptación. Intentá de nuevo.', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    const cancellationDeadlineLabel = getCancellationDeadlineLabel(booking);
    const usesProtectedDeposit = booking.depositType === 'protected'
      || (booking.requestMode === 'protected' && (booking.depositStatus === 'checkout_pending' || booking.depositStatus === 'held'));
    const confirmMessage = usesProtectedDeposit
      ? cancellationDeadlineLabel
        ? `¿Querés cancelar esta reserva? Podés hacerlo hasta el ${cancellationDeadlineLabel}. La devolución depende del momento de la cancelación y del estado de la reserva. Si la seña ya estaba en custodia, puede quedar en revisión.`
        : '¿Querés cancelar esta reserva? La devolución depende del momento de la cancelación y del estado de la reserva. Si la seña ya estaba en custodia, puede quedar en revisión.'
      : cancellationDeadlineLabel
        ? `¿Querés cancelar esta reserva? Podés hacerlo hasta el ${cancellationDeadlineLabel}. La plataforma solo va a dejar asentado el estado.`
        : '¿Querés cancelar esta reserva? La plataforma solo va a dejar asentado el estado.';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setCancelingBookingId(booking.id);

    try {
      const response = await cancelBooking(booking.id);
      setBookings((currentBookings) => currentBookings.map((currentBooking) => (
        currentBooking.id === booking.id ? { ...currentBooking, ...response.booking } : currentBooking
      )));
      showToast('Reserva cancelada', 'La reserva se canceló y las fechas volvieron a quedar disponibles.', 'success');
    } catch (error) {
      showToast('Reserva', error instanceof Error ? error.message : 'No pudimos cancelar la reserva. Intentá de nuevo.', 'error');
    } finally {
      setCancelingBookingId(null);
    }
  };

  const handlePayDeposit = async (bookingId: string) => {
    setProcessingBookingAction({ bookingId, action: 'pay-deposit' });

    try {
      const checkoutSession = await payProtectedDeposit(bookingId, '/my-bookings');
      updateBookingState(checkoutSession.booking);
      showToast('Pago de seña', 'Vas a Mercado Pago para dejar la seña registrada. Cuando se confirme, volvés a esta reserva.', 'info');
      navigateToExternalUrl(checkoutSession.checkoutUrl);
    } catch (error) {
      showToast('Seña', error instanceof Error ? error.message : 'No pudimos abrir el pago de la seña.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const checkoutResult = searchParams.get('depositCheckout');
    const bookingId = searchParams.get('bookingId');
    const paymentId = searchParams.get('payment_id');
    const checkoutToken = `${checkoutResult || ''}:${bookingId || ''}:${paymentId || ''}:${location.pathname}`;

    if (!checkoutResult || !bookingId || loading) {
      if (!checkoutResult || !bookingId) {
        setHandledDepositCheckoutToken(null);
      }
      return;
    }

    if (handledDepositCheckoutToken === checkoutToken) {
      return;
    }

    setHandledDepositCheckoutToken(checkoutToken);

    const handleCheckoutReturn = async () => {
      try {
        if (checkoutResult === 'failure') {
          showToast('Pago no confirmado', 'La seña no quedó registrada. Si todavía quieren cerrarlo, podés volver a abrir el pago desde esta reserva.', 'warning');
          clearDepositCheckoutSearch();
          return;
        }

        if (!paymentId) {
          showToast('Pago pendiente', 'Todavía estamos esperando la confirmación de Mercado Pago para esta seña.', 'info');
          clearDepositCheckoutSearch();
          return;
        }

        const confirmation = await confirmProtectedDepositPayment(bookingId, paymentId);
        updateBookingState(confirmation.booking);

        if (confirmation.confirmed) {
          showToast('Seña registrada', 'La seña quedó registrada y la reserva sigue ordenada dentro de la app.', 'success');
        } else {
          showToast('Pago pendiente', 'Mercado Pago todavía no terminó de confirmar la seña. Si hace falta, podés reabrir el pago desde esta reserva.', 'info');
        }
      } catch (error) {
        showToast('Seña', error instanceof Error ? error.message : 'No pudimos confirmar la seña registrada.', 'error');
      } finally {
        clearDepositCheckoutSearch();
      }
    };

    void handleCheckoutReturn();
  }, [handledDepositCheckoutToken, loading, location.pathname, location.search, navigate]);

  const handleSelectExternalDeposit = async (bookingId: string) => {
    setProcessingBookingAction({ bookingId, action: 'select-external-deposit' });

    try {
      const nextBooking = await selectExternalDeposit(bookingId);
      updateBookingState(nextBooking);
      setExternalDepositChoiceBookingId((currentBookingId) => (currentBookingId === bookingId ? null : currentBookingId));
      showToast('Coordinación directa', 'Quedó en coordinación directa por chat. Si cambiás de idea antes de cerrar la seña, podés usar Seña Protegida desde esta reserva.', 'success');
    } catch (error) {
      showToast('Seña', error instanceof Error ? error.message : 'No pudimos registrar esta elección.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleSelectProtectedDeposit = async (bookingId: string) => {
    setProcessingBookingAction({ bookingId, action: 'select-protected-deposit' });

    try {
      const nextBooking = await selectProtectedDeposit(bookingId);
      updateBookingState(nextBooking);
      setExternalDepositChoiceBookingId((currentBookingId) => (currentBookingId === bookingId ? null : currentBookingId));
      showToast('Seña Protegida', 'La reserva quedó lista para usar Seña Protegida. Vas a ver el costo por operación antes de pagar.', 'success');
    } catch (error) {
      showToast('Seña', error instanceof Error ? error.message : 'No pudimos registrar esta elección.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleConfirmProtectedArrival = async (bookingId: string) => {
    setProcessingBookingAction({ bookingId, action: 'confirm-arrival' });

    try {
      const nextBooking = await confirmArrival(bookingId);
      updateBookingState(nextBooking);
      showToast('Ingreso confirmado', 'Tu confirmación ya quedó registrada. Ahora falta que el anfitrión confirme el acceso para liberar la seña.', 'success');
    } catch (error) {
      showToast('Llegada', error instanceof Error ? error.message : 'No pudimos confirmar la llegada.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleReportProtectedArrivalProblem = async (bookingId: string) => {
    setProcessingBookingAction({ bookingId, action: 'report-arrival-problem' });

    try {
      const nextBooking = await reportArrivalProblem(bookingId);
      updateBookingState(nextBooking);
      showToast('Seña en revisión', 'El problema quedó informado y la seña pasó a revisión.', 'success');
    } catch (error) {
      showToast('Problema', error instanceof Error ? error.message : 'No pudimos registrar el problema. Intentá de nuevo.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const sortedRequestBookings = bookings.filter((booking) => getBookingGroupKey(booking) === 'requests').slice().sort(compareBookingsByStartDate);
  const sortedAcceptedBookings = bookings.filter((booking) => getBookingGroupKey(booking) === 'accepted').slice().sort(compareBookingsByStartDate);
  const sortedUpcomingBookings = bookings.filter((booking) => getBookingGroupKey(booking) === 'upcoming').slice().sort(compareBookingsByStartDate);
  const sortedClosedBookings = bookings.filter((booking) => getBookingGroupKey(booking) === 'closed').slice().sort(compareBookingsByStartDate);

  const currentStay = sortedUpcomingBookings.find((booking) => isBookingCheckInReached(booking.startDate)) ?? null;
  const nextFutureStay = [...sortedUpcomingBookings, ...sortedAcceptedBookings]
    .filter((booking) => isFutureBookingDate(booking.startDate))
    .sort(compareBookingsByStartDate)[0] ?? null;
  const highlightedStay = currentStay ?? nextFutureStay;

  const bookingsByConversationId = new Map(
    bookings
      .filter((booking): booking is Booking & { conversationId: string } => typeof booking.conversationId === 'string' && booking.conversationId.length > 0)
      .map((booking) => [booking.conversationId, booking]),
  );

  const allRelevantConversations = conversations
    .filter((conversation) => {
      const relatedBooking = bookingsByConversationId.get(conversation.id);
      const updatedAt = parseInstant(conversation.updated_at);

      if (relatedBooking && getBookingGroupKey(relatedBooking) !== 'closed') {
        return true;
      }

      if (conversation.requestMode || conversation.requestStatus || conversation.bookingStatus === 'pending') {
        return true;
      }

      return Boolean(updatedAt && (Date.now() - updatedAt.getTime()) <= RECENT_CONVERSATION_WINDOW_MS);
    })
    .sort((left, right) => {
      const leftValue = parseInstant(left.updated_at)?.getTime() ?? 0;
      const rightValue = parseInstant(right.updated_at)?.getTime() ?? 0;
      return rightValue - leftValue;
    });

  const relevantConversations = allRelevantConversations.slice(0, 4);
  const usefulSavedProperties = sortPropertiesByCatalogOrder(favorites, 'verification').slice(0, 3);

  const activeReservationsCount = sortedAcceptedBookings.length + sortedUpcomingBookings.length;
  const pendingRequestsCount = sortedRequestBookings.length;
  const openConversationsCount = allRelevantConversations.length;

  const scrollToBooking = (bookingId: string) => {
    if (!scrollToTarget(getBookingElementId(bookingId))) {
      scrollToTarget(RESERVATIONS_SECTION_ID);
    }
  };

  const addPriorityAction = (actions: PriorityAction[], action: PriorityAction | null) => {
    if (!action || actions.some((currentAction) => currentAction.id === action.id)) {
      return;
    }

    actions.push(action);
  };

  const priorityActions: PriorityAction[] = [];

  const arrivalActionBooking = bookings.find((booking) => {
    const flow = getBookingFlow(booking);
    return flow.stage === 'protected-deposit-held' && isBookingCheckInReached(booking.startDate);
  }) ?? null;

  const contractActionBooking = bookings.find((booking) => Boolean(booking.contractJson) && !booking.contractAccepted) ?? null;
  const depositActionBooking = bookings.find((booking) => {
    const stage = getBookingFlow(booking).stage;
    return booking.requestMode === 'protected' && (stage === 'deposit-choice' || stage === 'protected-checkout-pending' || stage === 'request-accepted');
  }) ?? null;
  const pendingResponseBooking = bookings.find((booking) => getBookingFlow(booking).stage === 'request-pending') ?? null;

  addPriorityAction(priorityActions, arrivalActionBooking ? {
    id: `arrival-${arrivalActionBooking.id}`,
    eyebrow: 'Resolver hoy',
    title: `Tu llegada a ${arrivalActionBooking.propertyTitle || 'esta reserva'} ya pide confirmación`,
    description: 'Hoy ya podés confirmar el ingreso o reportar un problema si la llegada no salió como esperabas.',
    actionLabel: 'Ir a la reserva',
    icon: <Icons.CheckCircle2 className="h-5 w-5" />,
    onAction: () => scrollToBooking(arrivalActionBooking.id),
  } : null);

  addPriorityAction(priorityActions, contractActionBooking ? {
    id: `contract-${contractActionBooking.id}`,
    eyebrow: 'Antes de viajar',
    title: `Revisá las condiciones de ${contractActionBooking.propertyTitle || 'tu reserva'}`,
    description: 'Dejá aceptadas las condiciones para que todo el acuerdo quede ordenado dentro de la reserva.',
    actionLabel: 'Abrir condiciones',
    icon: <Icons.FileText className="h-5 w-5" />,
    onAction: () => openContract(contractActionBooking),
  } : null);

  addPriorityAction(priorityActions, depositActionBooking ? {
    id: `deposit-${depositActionBooking.id}`,
    eyebrow: 'Tu paso pendiente',
    title: getBookingFlow(depositActionBooking).stage === 'deposit-choice'
      ? `Revisá cómo sigue la seña de ${depositActionBooking.propertyTitle || 'esta reserva'}`
      : `Seguimiento de seña protegida para ${depositActionBooking.propertyTitle || 'esta reserva'}`,
    description: getBookingFlow(depositActionBooking).stage === 'deposit-choice'
      ? 'La reserva sigue con la vieja elección de seña. Revisala desde la reserva para ver el estado actual.'
      : 'La reserva ya quedó marcada con seña protegida y por ahora solo muestra el estado base, sin procesar pagos dentro de la app.',
    actionLabel: 'Ver solicitud',
    icon: <Icons.ShieldCheck className="h-5 w-5" />,
    onAction: () => scrollToBooking(depositActionBooking.id),
  } : null);

  addPriorityAction(priorityActions, pendingResponseBooking ? {
    id: `pending-${pendingResponseBooking.id}`,
    eyebrow: 'Seguimiento',
    title: `Retomá la solicitud de ${pendingResponseBooking.propertyTitle || 'esta propiedad'}`,
    description: 'Entrá a la reserva para ver el estado, la ventana de cancelación y el chat vinculado.',
    actionLabel: 'Ver solicitud',
    icon: <Icons.MessageSquare className="h-5 w-5" />,
    onAction: () => scrollToBooking(pendingResponseBooking.id),
  } : null);

  addPriorityAction(priorityActions, highlightedStay ? {
    id: `stay-${highlightedStay.id}`,
    eyebrow: currentStay ? 'En curso' : 'Lo que sigue',
    title: `${currentStay ? 'Seguís con' : 'Tu próxima estadía es'} ${highlightedStay.propertyTitle || 'esta reserva'}`,
    description: highlightedStay.conversationId
      ? 'Tenés el chat listo para coordinar horario, llegada y cualquier detalle final con el anfitrión.'
      : 'Entrá a la reserva para revisar fechas, estado y próximos pasos antes del ingreso.',
    actionLabel: highlightedStay.conversationId ? 'Abrir chat' : 'Ver reserva',
    icon: <Icons.Calendar className="h-5 w-5" />,
    onAction: () => (
      highlightedStay.conversationId
        ? navigate(`/chat/${highlightedStay.conversationId}`)
        : scrollToBooking(highlightedStay.id)
    ),
  } : null);

  addPriorityAction(priorityActions, usefulSavedProperties[0] ? {
    id: `saved-${usefulSavedProperties[0].id}`,
    eyebrow: 'Guardados útiles',
    title: `Volvé a ${usefulSavedProperties[0].title}`,
    description: 'Ya muestra verificación presencial o información útil del aviso para comparar rápido con lo que ya reservaste.',
    actionLabel: 'Ver guardado',
    icon: <Icons.Heart className="h-5 w-5" />,
    onAction: () => navigate(`/detail/${usefulSavedProperties[0].id}`),
  } : null);

  addPriorityAction(priorityActions, relevantConversations[0] ? {
    id: `conversation-${relevantConversations[0].id}`,
    eyebrow: 'Conversación activa',
    title: `Retomá el chat de ${relevantConversations[0].propertyTitle || 'esta propiedad'}`,
    description: 'Quedó actividad reciente y conviene seguir desde la conversación para no perder el contexto.',
    actionLabel: 'Abrir chat',
    icon: <Icons.MessageSquare className="h-5 w-5" />,
    onAction: () => navigate(`/chat/${relevantConversations[0].id}`),
  } : null);

  if (priorityActions.length < 2) {
    addPriorityAction(priorityActions, {
      id: 'explore-properties',
      eyebrow: 'Sin urgencias',
      title: 'Aprovechá para seguir explorando propiedades',
      description: 'Si todavía no cerraste tu próxima estadía, podés volver a explorar y comparar opciones desde la home.',
      actionLabel: 'Explorar',
      icon: <Icons.Search className="h-5 w-5" />,
      onAction: () => navigate('/'),
    });
  }

  if (priorityActions.length < 2) {
    addPriorityAction(priorityActions, {
      id: 'faq-help',
      eyebrow: 'Cómo seguir',
      title: 'Revisá las preguntas frecuentes antes de reservar',
      description: 'Ahí vas a encontrar cómo se confirma la seña, qué pasa con la llegada y cómo se gestiona una cancelación.',
      actionLabel: 'Ver ayuda',
      icon: <Icons.Info className="h-5 w-5" />,
      onAction: () => navigate('/faq'),
    });
  }

  const renderBookingCard = (booking: Booking) => {
    const cancellationDeadlineLabel = getCancellationDeadlineLabel(booking);
    const isCancelable = canCancelBooking(booking);
    const bookingFlow = getBookingFlow(booking);
    const protectedDepositPricing = booking.protectedDepositPricing ?? getProtectedDepositPricingFromBooking(booking);
    const showReservationFlowPanel = Boolean(booking.requestMode && bookingFlow.stage && bookingFlow.stage !== 'reservation-confirmed');
    const showBookingQuickGuide = booking.requestMode === 'protected' && (bookingFlow.stage === 'deposit-choice' || bookingFlow.stage === 'external-deposit-pending' || bookingFlow.stage === 'request-accepted' || bookingFlow.stage === 'protected-checkout-pending');
    const isSelectingExternalDeposit = processingBookingAction?.bookingId === booking.id && processingBookingAction.action === 'select-external-deposit';
    const isSelectingProtectedDeposit = processingBookingAction?.bookingId === booking.id && processingBookingAction.action === 'select-protected-deposit';
    const isPayingDeposit = processingBookingAction?.bookingId === booking.id && processingBookingAction.action === 'pay-deposit';
    const isConfirmingArrival = processingBookingAction?.bookingId === booking.id && processingBookingAction.action === 'confirm-arrival';
    const isReportingArrivalProblem = processingBookingAction?.bookingId === booking.id && processingBookingAction.action === 'report-arrival-problem';
    const isReviewingExternalDepositChoice = externalDepositChoiceBookingId === booking.id;
    const arrivalActionsAvailable = isBookingCheckInReached(booking.startDate);
    const canReviewBooking = booking.status === 'completed' && !booking.guestReviewSubmitted && Boolean(booking.hostId);
    const protectedDepositPriceLines = protectedDepositPricing ? [
      { label: 'Seña', value: formatCurrency(protectedDepositPricing.depositAmount) },
      { label: 'Fee de servicio', value: formatCurrency(protectedDepositPricing.serviceFee) },
      { label: 'Total', value: formatCurrency(protectedDepositPricing.totalCharge), emphasize: true },
    ] : undefined;

    return (
      <div
        key={booking.id}
        id={getBookingElementId(booking.id)}
        className="border-t border-slate-100 px-5 py-5 first:border-t-0 dark:border-slate-800 sm:px-6"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <img
                src={booking.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'}
                alt={booking.propertyTitle || 'Propiedad'}
                className="h-24 w-full rounded-[24px] object-cover sm:w-36"
              />
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getBookingStatusVariant(booking)} size="md">{getBookingStatusText(booking)}</Badge>
                  {booking.requestMode ? (
                    <Badge variant="neutral" size="md">
                      {booking.depositType === 'external' || booking.requestMode === 'direct'
                        ? 'Operación libre'
                        : 'Seña protegida'}
                    </Badge>
                  ) : null}
                  {booking.contractAccepted ? <Badge variant="success" size="md">Condiciones firmadas</Badge> : null}
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{booking.propertyTitle || 'Propiedad'}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                    {booking.location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Icons.MapPin className="h-4 w-4" />
                        {booking.location}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5">
                      <Icons.Calendar className="h-4 w-4" />
                      {formatDate(booking.startDate)} <span className="text-slate-500 dark:text-slate-600">→</span> {formatDate(booking.endDate)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Icons.Users className="h-4 w-4" />
                      {booking.guests || 1} {(booking.guests || 1) === 1 ? 'huésped' : 'huéspedes'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-[12rem] rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-left dark:border-slate-700 dark:bg-slate-800/60 lg:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Costo total</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{formatCurrency(booking.totalPrice)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Etapa: {bookingFlow.statusLabel || getBookingStatusText(booking)}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quién sigue</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{getReservationNextActorDisplayLabel(bookingFlow)}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Qué conviene hacer</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{getReservationNextStepDisplayLabel(bookingFlow)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {booking.conversationId ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/chat/${booking.conversationId}`)}
                className="rounded-full"
              >
                <>
                  <Icons.MessageSquare className="h-4 w-4" />
                  Abrir chat
                </>
              </Button>
            ) : null}

            {canReviewBooking ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setReviewingBooking(booking)}
                className="rounded-full"
              >
                <>
                  <Icons.CheckCircle2 className="h-4 w-4" />
                  Compartir cierre
                </>
              </Button>
            ) : null}

            {booking.status === 'completed' && booking.guestReviewSubmitted ? (
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Ya compartiste cómo cerró esta estadía
              </div>
            ) : null}

            {booking.contractJson ? (
              <Button
                type="button"
                variant={booking.contractAccepted ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => openContract(booking)}
                className="rounded-full"
              >
                <>
                  <Icons.FileText className="h-4 w-4" />
                  {booking.contractAccepted ? 'Firmado' : 'Ver condiciones'}
                </>
              </Button>
            ) : null}

            {isCancelable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCancelBooking(booking)}
                loading={cancelingBookingId === booking.id}
                loadingLabel="Cancelando..."
                className="rounded-full"
              >
                <>
                  <Icons.X className="h-4 w-4" />
                  Cancelar reserva
                </>
              </Button>
            ) : null}
          </div>

          {(booking.status === 'pending' || booking.status === 'confirmed') && booking.startDate && bookingFlow.stage !== 'protected-deposit-review' && bookingFlow.stage !== 'protected-no-show-pending' ? (
            <div className={cn(
              'rounded-[24px] border px-4 py-3 text-sm leading-6',
              isCancelable
                ? 'border-brand/10 bg-brand/5 text-slate-700 dark:border-brand/20 dark:bg-brand/10 dark:text-slate-200'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300',
            )}>
              {isCancelable && cancellationDeadlineLabel
                ? `Podés cancelarla desde la app hasta el ${cancellationDeadlineLabel}.`
                : cancellationDeadlineLabel
                  ? `La cancelación online estuvo disponible hasta el ${cancellationDeadlineLabel}. Si necesitás ayuda, escribile al anfitrión cuanto antes.`
                  : 'Ya no está dentro del plazo para cancelarla online. Si necesitás ayuda, escribile al anfitrión cuanto antes.'}
            </div>
          ) : null}

          {showReservationFlowPanel ? (
            <div className="rounded-[24px] border border-brand/10 bg-brand/5 p-4 dark:border-brand/20 dark:bg-brand/10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">{bookingFlow.statusLabel}</p>
                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{bookingFlow.description}</p>
                  {bookingFlow.supportText ? <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{bookingFlow.supportText}</p> : null}
                  {bookingFlow.trackingHint ? <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{bookingFlow.trackingHint}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {bookingFlow.stage === 'deposit-choice' ? (
                    <div className="w-full lg:max-w-[38rem]">
                      <DepositChoiceBlock
                        title="Elegí cómo querés avanzar"
                        description="Las dos opciones siguen por chat. Elegí la que mejor les cierre."
                        options={[
                          {
                            key: 'external',
                            eyebrow: 'Opción 1',
                            title: 'Coordinar directamente',
                            description: 'Podés acordar la seña y los detalles directamente con el anfitrión. En este caso, Alquiler Real no interviene en el pago.',
                            icon: <Icons.MessageSquare className="h-5 w-5" />,
                            tone: 'neutral',
                            helper: isReviewingExternalDepositChoice
                              ? 'Seguís por chat y, si cambiás de idea antes de cerrar la seña, todavía podés usar Seña Protegida.'
                              : undefined,
                            action: isReviewingExternalDepositChoice
                              ? {
                                  label: 'Coordinar por chat',
                                  onClick: () => void handleSelectExternalDeposit(booking.id),
                                  loading: isSelectingExternalDeposit,
                                  loadingLabel: 'Guardando...',
                                  icon: <Icons.MessageSquare className="h-4 w-4" />,
                                  variant: 'outline',
                                }
                              : {
                                  label: 'Coordinar por chat',
                                  onClick: () => setExternalDepositChoiceBookingId(booking.id),
                                  icon: <Icons.MessageSquare className="h-4 w-4" />,
                                  variant: 'outline',
                                },
                            secondaryAction: isReviewingExternalDepositChoice
                              ? {
                                  label: 'Volver',
                                  onClick: () => setExternalDepositChoiceBookingId(null),
                                  variant: 'ghost',
                                }
                              : undefined,
                          },
                          {
                            key: 'protected',
                            eyebrow: 'Opción 2 · Premium opcional',
                            title: 'Usar Seña Protegida',
                            description: 'La seña queda retenida por Alquiler Real hasta el check-in. Tiene un costo por operación.',
                            icon: <Icons.ShieldCheck className="h-5 w-5" />,
                            tone: 'brand',
                            priceLines: protectedDepositPriceLines,
                            action: {
                              label: 'Usar Seña Protegida',
                              onClick: () => void handleSelectProtectedDeposit(booking.id),
                              loading: isSelectingProtectedDeposit,
                              loadingLabel: 'Guardando...',
                              icon: <Icons.ShieldCheck className="h-4 w-4" />,
                            },
                          },
                        ]}
                      />
                    </div>
                  ) : null}

                  {bookingFlow.stage === 'external-deposit-pending' ? (
                    <div className="w-full lg:max-w-[27rem]">
                      <DepositChoiceBlock
                        options={[
                          {
                            key: 'switch-to-protected',
                            eyebrow: 'Opción 2 · Premium opcional',
                            title: 'Usar Seña Protegida',
                            description: 'La seña queda retenida por Alquiler Real hasta el check-in. Tiene un costo por operación.',
                            icon: <Icons.ShieldCheck className="h-5 w-5" />,
                            tone: 'brand',
                            helper: 'Hoy siguen coordinando por chat. Si cambiás de idea antes de pagar, todavía podés usar Seña Protegida.',
                            action: {
                              label: 'Usar Seña Protegida',
                              onClick: () => void handleSelectProtectedDeposit(booking.id),
                              loading: isSelectingProtectedDeposit,
                              loadingLabel: 'Guardando...',
                              icon: <Icons.ShieldCheck className="h-4 w-4" />,
                            },
                          },
                        ]}
                      />
                    </div>
                  ) : null}

                  {bookingFlow.stage === 'protected-checkout-pending' && !protectedDepositPricing && PROTECTED_DEPOSIT_PAYMENT_ENABLED ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handlePayDeposit(booking.id)}
                      loading={isPayingDeposit}
                      loadingLabel="Abriendo pago..."
                      className="rounded-full"
                    >
                      <>
                        <Icons.ShieldCheck className="h-4 w-4" />
                        {bookingFlow.primaryActionLabel}
                      </>
                    </Button>
                  ) : null}

                  {bookingFlow.stage === 'protected-deposit-held' && arrivalActionsAvailable && bookingFlow.state !== 'guest_checkin_confirmed' ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleConfirmProtectedArrival(booking.id)}
                      loading={isConfirmingArrival}
                      loadingLabel="Confirmando llegada..."
                      className="rounded-full"
                    >
                      <>
                        <Icons.CheckCircle2 className="h-4 w-4" />
                        {bookingFlow.primaryActionLabel}
                      </>
                    </Button>
                  ) : null}

                  {bookingFlow.stage === 'protected-deposit-held' && arrivalActionsAvailable && bookingFlow.state !== 'guest_checkin_confirmed' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleReportProtectedArrivalProblem(booking.id)}
                      loading={isReportingArrivalProblem}
                      loadingLabel="Informando problema..."
                      className="rounded-full"
                    >
                      <>
                        <Icons.AlertTriangle className="h-4 w-4" />
                        {bookingFlow.secondaryActionLabel}
                      </>
                    </Button>
                  ) : null}

                </div>
              </div>

              {bookingFlow.stage === 'protected-checkout-pending' && protectedDepositPricing && PROTECTED_DEPOSIT_PAYMENT_ENABLED ? (
                <DepositChoiceBlock
                  className="mt-4"
                  title="Usar Seña Protegida"
                  description="La modalidad ya quedó elegida. Revisá el costo por operación antes de continuar."
                  options={[
                    {
                      key: 'pay-protected-deposit',
                      eyebrow: 'Opción 2 · Premium opcional',
                      title: 'Continuar con Seña Protegida',
                      description: 'La seña queda retenida por Alquiler Real hasta el check-in. Tiene un costo por operación.',
                      icon: <Icons.ShieldCheck className="h-5 w-5" />,
                      tone: 'brand',
                      priceLines: protectedDepositPriceLines,
                      action: {
                        label: bookingFlow.primaryActionLabel,
                        onClick: () => void handlePayDeposit(booking.id),
                        loading: isPayingDeposit,
                        loadingLabel: 'Abriendo pago...',
                        icon: <Icons.ShieldCheck className="h-4 w-4" />,
                      },
                    },
                  ]}
                />
              ) : null}

              {bookingFlow.stage === 'protected-checkout-pending' && !PROTECTED_DEPOSIT_PAYMENT_ENABLED ? (
                <div className="mt-4 rounded-[20px] border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  La reserva ya quedó marcada con seña protegida. Por ahora solo ves el costo por operación y el estado base: el cobro todavía no se procesa dentro de la app.
                </div>
              ) : null}

              {bookingFlow.stage === 'protected-deposit-held' && !arrivalActionsAvailable ? (
                <div className="mt-4 rounded-[20px] border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  {bookingFlow.pendingActionHint}
                </div>
              ) : null}

              {showBookingQuickGuide ? (
                <PlatformTermsQuickGuide
                  eyebrow="Guía corta"
                  title="Qué implica la seña protegida"
                  description="Lo esencial para entender cuándo la app protege la seña, qué sigue fuera de la plataforma y en qué casos puede intervenir una revisión manual."
                  density="compact"
                  showLink
                  className="mt-4"
                />
              ) : null}
            </div>
          ) : null}

          {(bookingFlow.stage === 'reservation-confirmed' || (!booking.requestMode && booking.status === 'confirmed')) ? (
            <ReservationConfirmedState
              eyebrow="Reserva confirmada"
              title="Todo listo para esas fechas"
              description="Ya podés coordinar tranquilo la llegada por el chat."
              details={[
                {
                  label: 'Código de ingreso',
                  value: booking.stay_code || 'Se confirma desde el chat',
                },
              ]}
              nextStep="Próximo paso: coordiná horario y llegada con el anfitrión por el chat."
            />
          ) : null}

          {booking.status === 'cancelled' && !showReservationFlowPanel ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Reserva cancelada</p>
              <p className="mt-2">Las fechas se liberaron y ya no hay ingreso asociado a esta estadía.</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <LoadingState
        fullScreen
        message="Cargando tus reservas..."
        description="Estamos reuniendo fechas, condiciones y estados para que tengas todo ordenado en un solo lugar."
      />
    );
  }

  if (loadError) {
    return (
      <ErrorState
        fullScreen
        title="No pudimos cargar tus reservas"
        description={loadError}
        onRetry={() => void fetchBookings()}
        onDismiss={() => navigate('/profile')}
        dismissLabel="Volver al perfil"
      />
    );
  }

  return (
    <div className="app-page py-6 md:py-8">
      <div className="space-y-6 md:space-y-8">
        <Card
          variant="elevated"
          padding="none"
          className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_32px_72px_-44px_rgba(15,23,42,0.42)]"
        >
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 text-slate-600 transition-colors hover:border-brand/20 hover:text-brand dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
                >
                  <Icons.ArrowLeft className="h-5 w-5" />
                </button>
                <Badge variant="brand" size="md">
                  <Icons.LayoutDashboard className="h-3.5 w-3.5" />
                  Centro de control
                </Badge>
              </div>
              <AccountModeSwitch compact />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr,1fr]">
              <div className="space-y-5">
                <SectionTitle
                  eyebrow="Mis reservas"
                  heading="Tus reservas, tus chats y tu próximo paso en un solo lugar."
                  description="Entrás y ya ves qué mover primero, qué chat retomar y qué guardado vale volver a mirar."
                  as="h1"
                  visualLevel="h2"
                  className="max-w-3xl"
                />

                <div className="rounded-[32px] border border-white/80 bg-white/88 p-5 shadow-[0_20px_42px_-34px_rgba(15,23,42,0.3)] dark:border-slate-800 dark:bg-slate-900/88">
                  {highlightedStay ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="brand" size="md">{currentStay ? 'Estadía en curso' : 'Próxima estadía'}</Badge>
                        <Badge variant={getBookingStatusVariant(highlightedStay)} size="md">{getBookingStatusText(highlightedStay)}</Badge>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{highlightedStay.propertyTitle || 'Tu próxima reserva'}</h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                          {highlightedStay.location ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Icons.MapPin className="h-4 w-4 text-brand" />
                              {highlightedStay.location}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1.5">
                            <Icons.Calendar className="h-4 w-4 text-brand" />
                            {formatDate(highlightedStay.startDate)} <span className="text-slate-300 dark:text-slate-600">→</span> {formatDate(highlightedStay.endDate)}
                          </span>
                        </div>
                      </div>

                      <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{getHighlightedStayDescription(highlightedStay)}</p>

                      <div className="flex flex-wrap gap-2">
                        {highlightedStay.conversationId ? (
                          <Button type="button" variant="secondary" onClick={() => navigate(`/chat/${highlightedStay.conversationId}`)}>
                            <>
                              <Icons.MessageSquare className="h-4 w-4" />
                              Abrir chat
                            </>
                          </Button>
                        ) : null}
                        <Button type="button" onClick={() => scrollToBooking(highlightedStay.id)}>
                          <>
                            <Icons.ArrowRight className="h-4 w-4" />
                            Ver reserva
                          </>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Badge variant="neutral" size="md">Sin próxima estadía confirmada</Badge>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Todavía no tenés una próxima estadía activa</h2>
                        <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                          Cuando avances una solicitud o cierres una reserva, acá vas a ver el próximo ingreso, el estado real y la acción que más conviene retomar primero.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" onClick={() => navigate('/')}>
                          <>
                            <Icons.Search className="h-4 w-4" />
                            Explorar propiedades
                          </>
                        </Button>
                        {usefulSavedProperties.length > 0 ? (
                          <Button type="button" onClick={() => scrollToTarget(SAVED_SECTION_ID)}>
                            <>
                              <Icons.Heart className="h-4 w-4" />
                              Ver guardados
                            </>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <SummaryMetric
                  label="Solicitudes pendientes"
                  value={String(pendingRequestsCount)}
                  helper={pendingRequestsCount > 0 ? 'Hay solicitudes que todavía esperan respuesta, pago de seña o una decisión tuya.' : 'No tenés solicitudes abiertas ahora.'}
                  icon={<Icons.ListTodo className="h-5 w-5" />}
                />
                <SummaryMetric
                  label="Reservas activas"
                  value={String(activeReservationsCount)}
                  helper={activeReservationsCount > 0 ? 'Contamos solo reservas que siguen activas y todavía piden coordinación o seguimiento.' : 'No hay reservas activas en este momento.'}
                  icon={<Icons.Home className="h-5 w-5" />}
                />
                <SummaryMetric
                  label="Chats para retomar"
                  value={String(openConversationsCount)}
                  helper={openConversationsCount > 0 ? 'Priorizamos conversaciones ligadas a reservas activas o con movimiento reciente.' : 'No hay conversaciones que necesiten seguimiento ahora.'}
                  icon={<Icons.MessageSquare className="h-5 w-5" />}
                />
              </div>
            </div>
          </div>
        </Card>

        <section className="space-y-4" aria-labelledby="guest-dashboard-priorities">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Qué conviene hacer ahora"
              heading="Priorizamos lo que te mueve una reserva de verdad."
              description="Estas acciones salen del estado real de tus reservas, tus chats y tus guardados para ahorrarte reconstruir contexto cada vez que entrás."
              as="h2"
              visualLevel="h3"
              className="max-w-3xl"
            />
          </div>

          <div className="grid gap-4">
            {priorityActions.slice(0, 3).map((action) => (
              <PriorityActionRow key={action.id} {...action} />
            ))}
          </div>
        </section>

        <section id={RESERVATIONS_SECTION_ID} className="space-y-4" aria-labelledby="guest-dashboard-bookings">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Mis reservas"
              heading="Cada reserva, en su etapa real."
              description="Cada fila te muestra propiedad, fechas, quién sigue y qué conviene hacer ahora sin repetir bloques inútiles."
              as="h2"
              visualLevel="h3"
              className="max-w-3xl"
            />
          </div>

          {bookings.length === 0 ? (
            <EmptyState
              eyebrow="Reservas"
              tone="soft"
              icon={<Icons.Calendar className="h-12 w-12 text-brand" />}
              title="Todavía no tenés reservas"
              description="Cuando reserves una propiedad, acá vas a ver fechas, estado, chat, condiciones y los próximos pasos de cada estadía."
              action={{
                label: 'Explorá propiedades',
                onClick: () => navigate('/'),
              }}
            />
          ) : (
            <div className="grid gap-4">
              <BookingGroup
                title="Solicitudes enviadas"
                description="Esperan respuesta, una decisión sobre la seña o una confirmación dentro del flujo."
                count={sortedRequestBookings.length}
                emptyText="No hay solicitudes abiertas ahora."
              >
                {sortedRequestBookings.map(renderBookingCard)}
              </BookingGroup>

              <BookingGroup
                title="Reservas aceptadas"
                description="Ya están encaminadas, pero todavía no entraron en tramo de llegada."
                count={sortedAcceptedBookings.length}
                emptyText="No hay reservas aceptadas fuera de la ventana de ingreso."
              >
                {sortedAcceptedBookings.map(renderBookingCard)}
              </BookingGroup>

              <BookingGroup
                title="Próximas estadías"
                description="Piden coordinación fina, confirmación o seguimiento del ingreso."
                count={sortedUpcomingBookings.length}
                emptyText="No hay ingresos cercanos para resolver ahora."
              >
                {sortedUpcomingBookings.map(renderBookingCard)}
              </BookingGroup>

              <BookingGroup
                title="Finalizadas"
                description="Quedan visibles para revisar cierre, historial o cancelaciones."
                count={sortedClosedBookings.length}
                emptyText="Todavía no tenés reservas cerradas."
              >
                {sortedClosedBookings.map(renderBookingCard)}
              </BookingGroup>
            </div>
          )}
        </section>

        <section id={SAVED_SECTION_ID} className="space-y-4" aria-labelledby="guest-dashboard-saved">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Guardados útiles"
              heading="Lo que te conviene volver a mirar antes de decidir."
              description="Mostramos primero los guardados con verificación presencial para que retomes comparaciones reales, no una lista plana de favoritos."
              as="h2"
              visualLevel="h3"
              className="max-w-3xl"
            />

            <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/favorites')} className="rounded-full">
              <>
                <Icons.Heart className="h-4 w-4" />
                Ver todos
              </>
            </Button>
          </div>

          <Card padding="none">
            {favoritesLoadError ? <p className="px-6 py-6 text-sm leading-6 text-slate-500 dark:text-slate-400">{favoritesLoadError}</p> : null}

            {!favoritesLoadError && usefulSavedProperties.length === 0 ? (
              <p className="px-6 py-6 text-sm leading-6 text-slate-500 dark:text-slate-400">Todavía no hay guardados relevantes para retomar desde este panel.</p>
            ) : null}

            {!favoritesLoadError && usefulSavedProperties.length > 0 ? usefulSavedProperties.map((property, index) => {
              const verificationDetails = getPropertyVerificationDetails(property);

              return (
                <div key={property.id} className={cn('flex flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between', index > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                  <div className="flex items-start gap-4">
                    <img
                      src={property.imageUrl}
                      alt={property.title}
                      className="h-20 w-28 rounded-[20px] object-cover"
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-start gap-3">
                        <VerificationSeal
                          score={verificationDetails.score}
                          maxScore={verificationDetails.max}
                          label={verificationDetails.compactLabel}
                          description={verificationDetails.description}
                          size="sm"
                          showCount={false}
                          ariaLabel={verificationDetails.summaryLabel}
                        />
                        <Badge variant="neutral" size="md">{formatCurrency(property.price)}</Badge>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{property.title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{property.location}</p>
                      </div>
                      {verificationDetails.items.length > 0 ? (
                        <PropertyVerificationChecklist items={verificationDetails.items} size="sm" columns={2} />
                      ) : (
                        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{verificationDetails.countLabel}.</p>
                      )}
                    </div>
                  </div>

                  <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/detail/${property.id}`)} className="rounded-full">
                    <>
                      <Icons.ArrowRight className="h-4 w-4" />
                      Ver propiedad
                    </>
                  </Button>
                </div>
              );
            }) : null}
          </Card>
        </section>

        <section id={CONVERSATIONS_SECTION_ID} className="space-y-4" aria-labelledby="guest-dashboard-conversations">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Conversaciones"
              heading="Retomá cada chat con el estado de la reserva al lado."
              description="Acá sólo quedan las conversaciones que siguen abiertas, están ligadas a una reserva activa o tuvieron movimiento reciente y todavía importan para decidir o viajar."
              as="h2"
              visualLevel="h3"
              className="max-w-3xl"
            />

            <Button type="button" variant="secondary" size="sm" onClick={() => navigate('/chat/all')} className="rounded-full">
              <>
                <Icons.MessageSquare className="h-4 w-4" />
                Ver chats
              </>
            </Button>
          </div>

          <Card padding="none">
            {conversationsLoadError ? <p className="px-6 py-6 text-sm leading-6 text-slate-500 dark:text-slate-400">{conversationsLoadError}</p> : null}

            {!conversationsLoadError && relevantConversations.length === 0 ? (
              <p className="px-6 py-6 text-sm leading-6 text-slate-500 dark:text-slate-400">No hay conversaciones que necesiten seguimiento ahora.</p>
            ) : null}

            {!conversationsLoadError && relevantConversations.length > 0 ? relevantConversations.map((conversation, index) => {
              const relatedBooking = bookingsByConversationId.get(conversation.id);
              const conversationFlow = getConversationFlow(conversation, relatedBooking);
              const conversationStatus = conversationFlow.statusLabel || (relatedBooking ? getBookingStatusText(relatedBooking) : 'Chat activo');
              const conversationVariant = relatedBooking ? getBookingStatusVariant(relatedBooking) : 'neutral';

              return (
                <div key={conversation.id} className={cn('flex flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-start md:justify-between', index > 0 && 'border-t border-slate-100 dark:border-slate-800')}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={conversationVariant} size="md">{conversationStatus}</Badge>
                      <Badge variant="neutral" size="md">Actualizada {formatConversationUpdatedAt(conversation.updated_at)}</Badge>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{conversation.propertyTitle || 'Conversación activa'}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {conversation.hostName ? `Con ${conversation.hostName}` : 'Con tu anfitrión'}
                        {relatedBooking?.startDate ? ` · Ingreso ${formatBookingDateShort(relatedBooking.startDate)}` : ''}
                      </p>
                    </div>

                    <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {conversation.last_message || conversationFlow.description || 'Abrí el chat para retomar la conversación desde el último intercambio.'}
                    </p>
                  </div>

                  <Button type="button" variant="secondary" size="sm" onClick={() => navigate(`/chat/${conversation.id}`)} className="rounded-full">
                    <>
                      <Icons.ArrowRight className="h-4 w-4" />
                      Abrir chat
                    </>
                  </Button>
                </div>
              );
            }) : null}
          </Card>
        </section>
      </div>

      {reviewingBooking ? (
        <ReviewModal
          bookingId={reviewingBooking.id}
          reviewedUserId={reviewingBooking.hostId || ''}
          reviewedUserName={reviewingBooking.hostName || 'Anfitrión'}
          type="guest_review"
          onClose={() => setReviewingBooking(null)}
          onComplete={() => {
            setReviewingBooking(null);
            void fetchBookings();
          }}
        />
      ) : null}

      {selectedContract ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/40">
          <div className="w-full max-w-lg overflow-hidden rounded-[40px] border border-slate-200/80 bg-white shadow-[0_32px_72px_-42px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Condiciones de la reserva</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Leé el acuerdo antes de seguir</h2>
              </div>
              <button type="button" onClick={() => setSelectedContract(null)} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
                <Icons.X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-6 overflow-y-auto px-6 py-6">
              {(() => {
                const contractPlatformTerms = getContractPlatformTerms(selectedContract);

                return (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Huésped</p>
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{selectedContract.guestName}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Anfitrión</p>
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{selectedContract.hostName}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Propiedad</p>
                      <p className="text-base font-semibold text-slate-950 dark:text-slate-50">{selectedContract.propertyTitle}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedContract.location}</p>
                    </div>

                    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-800/50">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Condiciones de la estadía</p>
                      <ul className="mt-4 space-y-3">
                        {(selectedContract.rules || []).map((rule, index) => (
                          <li key={`${selectedContract.id}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            <Icons.Check className="mt-1 h-4 w-4 shrink-0 text-brand" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-[28px] border border-brand/12 bg-brand/5 p-5 dark:border-brand/20 dark:bg-brand/10">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Responsabilidad y alcance de la plataforma</p>
                      <div className="mt-4 space-y-4">
                        {contractPlatformTerms.map((term) => (
                          <div key={term.id} className="rounded-[20px] border border-white/80 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{term.title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{term.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Al aceptar, confirmás que leíste las condiciones de la estadía y el alcance de Alquiler Real. Antes de pagar, revisá la identidad, los datos de la reserva y cómo se va a gestionar la seña.
                    </p>
                  </>
                );
              })()}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/30">
              {!selectedContract.accepted ? (
                <Button
                  type="button"
                  onClick={() => void handleAcceptContract(selectedContract.id)}
                  loading={accepting}
                  loadingLabel="Confirmando condiciones..."
                  fullWidth
                  size="lg"
                  className="rounded-[24px]"
                >
                  <>
                    <Icons.ShieldCheck className="h-5 w-5" />
                    Aceptar condiciones
                  </>
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-3 rounded-[24px] bg-brand px-5 py-4 text-base font-semibold text-white shadow-[var(--app-shadow-brand)]">
                  <Icons.CheckCircle2 className="h-5 w-5" />
                  Condiciones aceptadas
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};