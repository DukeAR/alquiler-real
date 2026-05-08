import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiJson } from '../lib/apiConfig';
import { isBookingCheckInReached } from '../lib/bookingDates';
import { withDemoQuery } from '../lib/demoMode';
import { resolveGuestRequestProfile } from '../lib/guestRequestProfile';
import { formatPremiumPriceLabel } from '../lib/premiumVerification';
import { getPropertyVerificationDetails, getPropertyVerificationItems, getPropertyVerificationProgress } from '../lib/propertyVerification';
import { getReservationFlowCopy, getReservationNextActorDisplayLabel, getReservationNextStepDisplayLabel } from '../lib/reservationFlow';
import { acceptConversationRequest, confirmAccess, confirmDirectDeposit, notAdvanceConversationRequest } from '../services/geminiService';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { AccountModeSwitch } from './ui/AccountModeSwitch';
import { Button } from './ui/Button';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import GuestRequestProfileCard from './GuestRequestProfileCard';
import HostAvailabilityPanel from './HostAvailabilityPanel';
import { Icons } from './Icons';
import { LoadingState } from './LoadingState';
import { PropertyUploadForm } from './PropertyUploadForm.tsx';
import { ReviewModal } from './ReviewModal';
import { HostListingProgressPanel } from './verification/HostListingProgressPanel';
import { PremiumVerificationCheckoutModal } from './verification/PremiumVerificationCheckoutModal';

interface HostDashboardProps {
  onBack: () => void;
  initialDashboardData?: any;
  disableAutoLoad?: boolean;
}

const dashboardSectionClass = 'card space-y-6 p-6 md:p-8 dark:border-slate-800 dark:bg-slate-900';
const PROPERTIES_SECTION_ID = 'host-dashboard-properties';
const REQUESTS_SECTION_ID = 'host-dashboard-requests';

const parseDashboardDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDashboardDate = (value?: string | null) => {
  const parsedDate = parseDashboardDate(value);

  if (!parsedDate) {
    return value || 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(parsedDate);
};

const isFutureOrToday = (date: Date | null) => {
  if (!date) {
    return false;
  }

  const comparisonDate = new Date(date);
  comparisonDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return comparisonDate >= today;
};

const formatCountLabel = (count: number, singular: string, plural: string) => (
  `${count} ${count === 1 ? singular : plural}`
);

const toSafeCount = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.round(numericValue)) : 0;
};

const scrollToSection = (sectionId: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  const section = document.getElementById(sectionId);

  if (section && typeof section.scrollIntoView === 'function') {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const getBookingFlow = (booking: any) => getReservationFlowCopy({
  mode: booking.requestMode,
  depositType: booking.depositType,
  requestStatus: typeof booking.requestStatus === 'string'
    ? booking.requestStatus
    : booking.requestMode === 'protected'
      ? booking.depositStatus === 'held' || booking.depositStatus === 'released' || booking.status === 'confirmed'
        ? 'accepted'
        : 'pending'
      : undefined,
  bookingStatus: booking.status,
  depositStatus: booking.depositStatus,
  cancellationActor: booking.cancellationActor,
  startDate: booking.startDate,
  guestCheckinConfirmed: booking.guestCheckinConfirmed,
  hostAccessConfirmed: booking.hostAccessConfirmed,
  viewerRole: 'host',
});

const hasProtectedPlatformDeposit = (booking: {
  depositType?: unknown;
  requestMode?: unknown;
  depositStatus?: unknown;
}) => {
  if (booking.depositType === 'protected') {
    return true;
  }

  return booking.requestMode === 'protected'
    && (
      booking.depositStatus === 'checkout_pending'
      || booking.depositStatus === 'held'
      || booking.depositStatus === 'review'
      || booking.depositStatus === 'pending_confirmation'
      || booking.depositStatus === 'released'
      || booking.depositStatus === 'refunded'
    );
};

const getBookingStatusLabel = (booking: any) => {
  const status = booking.status;

  if (status === 'completed') {
    return 'Estadía finalizada';
  }

  const flow = getBookingFlow(booking);

  if (flow.statusLabel) {
    return flow.statusLabel;
  }

  if (status === 'pending') return 'Solicitud pendiente';
  if (status === 'confirmed') return 'Reserva confirmada';
  return 'Estado no disponible';
};

const getBookingStatusClassName = (booking: any) => {
  if (booking.status === 'completed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300';
  }

  const flow = getBookingFlow(booking);

  if (flow.stage === 'host-cancelled') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300';
  }

  if (flow.stage === 'guest-cancelled' || flow.stage === 'protected-deposit-review' || flow.stage === 'protected-no-show-pending' || flow.stage === 'direct-deposit-reported') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300';
  }

  if (flow.stage === 'request-accepted' || flow.stage === 'protected-checkout-pending' || flow.stage === 'protected-deposit-held') {
    return 'border-brand/20 bg-brand/10 text-brand dark:border-brand/25 dark:bg-brand/15 dark:text-brand-light';
  }

  if (flow.stage === 'reservation-confirmed' || flow.stage === 'protected-deposit-released') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300';
  }

  if (booking.status === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300';
  }

  if (booking.status === 'confirmed') {
    return 'border-brand/20 bg-brand/10 text-brand dark:border-brand/25 dark:bg-brand/15 dark:text-brand-light';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300';
};

const getBookingSummaryItems = (booking: any) => {
  const summaryItems = [] as string[];

  if (typeof booking.startDate === 'string' && booking.startDate && typeof booking.endDate === 'string' && booking.endDate) {
    summaryItems.push(`${booking.startDate} al ${booking.endDate}`);
  } else if (typeof booking.date === 'string' && booking.date) {
    summaryItems.push(booking.date);
  }

  if (typeof booking.guests === 'number' && booking.guests > 0) {
    summaryItems.push(`${booking.guests} ${booking.guests === 1 ? 'huésped' : 'huéspedes'}`);
  }

  if (typeof booking.totalPrice === 'number' && booking.totalPrice > 0) {
    summaryItems.push(`$${Math.floor(booking.totalPrice).toLocaleString('es-AR')}`);
  }

  return summaryItems;
};

type PriorityActionRowProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  icon: React.ReactNode;
  onAction: () => void;
};

const PriorityActionRow = ({ eyebrow, title, description, actionLabel, icon, onAction }: PriorityActionRowProps) => (
  <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200/80 bg-white/94 p-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900/90 md:flex-row md:items-center md:justify-between">
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light">
        {icon}
      </div>
      <div className="space-y-1.5">
        <p className="eyebrow">{eyebrow}</p>
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

type BookingGroupProps = {
  title: string;
  description: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
};

const BookingGroup = ({ title, description, count, emptyText, children }: BookingGroupProps) => (
  <div className="card overflow-hidden dark:border-slate-800 dark:bg-slate-900">
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
  </div>
);

export const HostDashboard: React.FC<HostDashboardProps> = ({
  onBack,
  initialDashboardData = null,
  disableAutoLoad = false,
}) => {
  const navigate = useNavigate();
  const { user, setActiveMode } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(initialDashboardData);
  const [loading, setLoading] = useState(() => !disableAutoLoad && !initialDashboardData);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [showPublishingFlow, setShowPublishingFlow] = useState(false);
  const [focusedPropertyId, setFocusedPropertyId] = useState<string | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [availabilityPropertyId, setAvailabilityPropertyId] = useState<string | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [processingBookingAction, setProcessingBookingAction] = useState<{ bookingId: string; action: 'accept-request' | 'not-advance-request' | 'confirm-direct-deposit' | 'confirm-access' | 'cancel-host' | 'report-no-show' } | null>(null);
  const [activePremiumOffer, setActivePremiumOffer] = useState<any>(null);
  const [processingPremiumOffer, setProcessingPremiumOffer] = useState(false);

  const openPublishingFlow = () => {
    setIsAddingProperty(true);
    setShowPublishingFlow(true);
  };

  const closePublishingFlow = () => {
    setIsAddingProperty(false);
    setShowPublishingFlow(false);
  };

  useEffect(() => {
    if (disableAutoLoad) {
      setLoading(false);
      return;
    }

    void fetchData();
  }, [disableAutoLoad]);

  useEffect(() => {
    if (user?.activeMode !== 'host') {
      void setActiveMode('host');
    }
  }, [setActiveMode, user?.activeMode]);

  useEffect(() => {
    if (!focusedPropertyId || showPublishingFlow || loading) {
      return;
    }

    scrollToSection(PROPERTIES_SECTION_ID);
  }, [focusedPropertyId, loading, showPublishingFlow]);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await apiJson<any>('/api/host/dashboard', { includeCredentials: true, ttlMs: 60_000 });
      setDashboardData(data);
      return data;
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No pudimos cargar el panel del anfitrión.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateRecentBooking = (nextBooking: any) => {
    setDashboardData((currentData: any) => {
      if (!currentData || !Array.isArray(currentData.recentBookings)) {
        return currentData;
      }

      return {
        ...currentData,
        recentBookings: currentData.recentBookings.map((booking: any) => (
          booking.id === nextBooking.id ? { ...booking, ...nextBooking } : booking
        )),
      };
    });
  };

  const updateHostProperty = (propertyId: string, patch: Record<string, unknown>) => {
    setDashboardData((currentData: any) => {
      if (!currentData || !Array.isArray(currentData.properties)) {
        return currentData;
      }

      return {
        ...currentData,
        properties: currentData.properties.map((property: any) => (
          property.id === propertyId ? { ...property, ...patch } : property
        )),
      };
    });
  };

  const handleAcceptRequest = async (booking: any) => {
    if (!booking.conversationId) {
      return;
    }

    setProcessingBookingAction({ bookingId: booking.id, action: 'accept-request' });

    try {
      const updatedConversation = await acceptConversationRequest(booking.conversationId);
      const acceptedMode = updatedConversation.requestMode === 'direct' ? 'direct' : 'protected';

      updateRecentBooking({
        ...booking,
        conversationId: updatedConversation.id,
        requestMode: updatedConversation.requestMode ?? booking.requestMode,
        requestStatus: updatedConversation.requestStatus ?? 'accepted',
        depositStatus: updatedConversation.depositStatus ?? booking.depositStatus,
        status: updatedConversation.bookingStatus ?? (acceptedMode === 'protected' ? 'confirmed' : booking.status),
      });

      showToast(
        acceptedMode === 'direct' ? 'Operación libre aceptada' : 'Seña protegida aceptada',
        acceptedMode === 'direct'
          ? 'La operación libre quedó abierta. Sigan por chat: la app no interviene en pagos externos.'
          : 'La solicitud quedó aceptada y la reserva ya quedó marcada con seña protegida. El seguimiento sigue por chat.',
        'success',
      );
    } catch (err) {
      showToast('Solicitud', err instanceof Error ? err.message : 'No pudimos aceptar la solicitud desde el panel.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleNotAdvanceRequest = async (booking: any) => {
    if (!booking.conversationId) {
      return;
    }

    const requestLabel = booking.requestMode === 'direct' ? 'operación libre' : 'solicitud con seña protegida';
    if (!window.confirm(`¿Querés marcar que no podés avanzar con esta ${requestLabel}?`)) {
      return;
    }

    setProcessingBookingAction({ bookingId: booking.id, action: 'not-advance-request' });

    try {
      const updatedConversation = await notAdvanceConversationRequest(booking.conversationId);

      updateRecentBooking({
        ...booking,
        conversationId: updatedConversation.id,
        requestMode: updatedConversation.requestMode ?? booking.requestMode,
        requestStatus: updatedConversation.requestStatus ?? 'not_advanced',
        depositType: updatedConversation.depositType ?? null,
        depositStatus: updatedConversation.depositStatus ?? null,
        status: updatedConversation.bookingStatus ?? 'cancelled',
        cancellationActor: updatedConversation.cancellationActor ?? booking.cancellationActor,
      });

      showToast(
        'Estado actualizado',
        'Quedó marcado que no se pudo avanzar. El chat sigue abierto por si quieren recoordinar.',
        'success',
      );
    } catch (err) {
      showToast('Reserva', err instanceof Error ? err.message : 'No pudimos actualizar este estado. Intentá de nuevo.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleCancelBookingAsHost = async (booking: any) => {
    if (!window.confirm('¿Querés cancelar esta reserva desde el panel?')) {
      return;
    }

    setProcessingBookingAction({ bookingId: booking.id, action: 'cancel-host' });

    try {
      const response = await apiJson<{ booking: any }>(`/api/bookings/${booking.id}/cancel-as-host`, {
        method: 'POST',
        includeCredentials: true,
      });

      updateRecentBooking(response.booking);
      const usesProtectedPlatformDeposit = hasProtectedPlatformDeposit(response.booking ?? {}) || hasProtectedPlatformDeposit(booking);
      showToast('Reserva cancelada', usesProtectedPlatformDeposit ? 'La reserva quedó cancelada y la seña se devuelve automáticamente.' : 'La reserva quedó cancelada y el estado ya se actualizó.', 'success');
    } catch (err) {
      showToast('Reserva', err instanceof Error ? err.message : 'No pudimos cancelar la reserva desde el panel.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleConfirmDirectDeposit = async (booking: any) => {
    if (!booking.conversationId) {
      return;
    }

    setProcessingBookingAction({ bookingId: booking.id, action: 'confirm-direct-deposit' });

    try {
      const updatedConversation = await confirmDirectDeposit(booking.conversationId);

      updateRecentBooking({
        ...booking,
        conversationId: updatedConversation.id,
        requestMode: updatedConversation.requestMode ?? booking.requestMode,
        depositStatus: updatedConversation.depositStatus ?? booking.depositStatus,
        status: updatedConversation.bookingStatus ?? booking.status,
      });

      showToast('Reserva confirmada', 'La seña ya quedó confirmada y la reserva sigue por chat con los últimos detalles.', 'success');
    } catch (err) {
      showToast('Reserva', err instanceof Error ? err.message : 'No pudimos confirmar la recepción de la seña desde el panel.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleConfirmProtectedAccess = async (booking: any) => {
    setProcessingBookingAction({ bookingId: booking.id, action: 'confirm-access' });

    try {
      const nextBooking = await confirmAccess(booking.id);
      updateRecentBooking(nextBooking);
      showToast('Acceso confirmado', 'El acceso quedó confirmado y la seña ya salió de custodia.', 'success');
    } catch (err) {
      showToast('Acceso', err instanceof Error ? err.message : 'No pudimos confirmar el acceso.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleReportNoShow = async (booking: any) => {
    setProcessingBookingAction({ bookingId: booking.id, action: 'report-no-show' });

    try {
      const response = await apiJson<{ booking: any }>(`/api/bookings/${booking.id}/report-no-show`, {
        method: 'POST',
        includeCredentials: true,
      });

      updateRecentBooking(response.booking);
      showToast('Llegada en revisión', 'El no show quedó informado y la seña sigue en pausa mientras la plataforma revisa qué pasó.', 'success');
    } catch (err) {
      showToast('No show', err instanceof Error ? err.message : 'No pudimos registrar el no show.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await apiJson(`/api/properties/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
        includeCredentials: true,
      });
      updateHostProperty(id, { status: newStatus });
      showToast('Publicación actualizada', newStatus === 'active' ? 'La propiedad volvió a quedar visible.' : 'La propiedad quedó pausada y ya no recibe reservas nuevas.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Publicación', err instanceof Error ? err.message : 'No pudimos actualizar el estado de la propiedad.', 'error');
    }
  };

  const handlePremiumOfferCheckout = async () => {
    if (!activePremiumOffer) {
      return;
    }

    setProcessingPremiumOffer(true);

    try {
      if (activePremiumOffer.purchased || activePremiumOffer.completed) {
        setActivePremiumOffer(null);
        navigate(activePremiumOffer.redirectTo);
        return;
      }

      const response = await apiJson<{ redirectTo?: string }>('/api/verification/premium-checkout', {
        method: 'POST',
        includeCredentials: true,
        body: JSON.stringify({
          offerType: activePremiumOffer.offerType,
          propertyId: activePremiumOffer.propertyId,
        }),
      });

      setActivePremiumOffer(null);
      navigate(response.redirectTo || activePremiumOffer.redirectTo);
    } catch (error) {
      showToast('Verificación', error instanceof Error ? error.message : 'No pudimos activar esta validación presencial ahora.', 'error');
    } finally {
      setProcessingPremiumOffer(false);
    }
  };

  const recentBookings = useMemo(
    () => (Array.isArray(dashboardData?.recentBookings)
      ? dashboardData.recentBookings.map((booking: any, index: number) => ({
          ...booking,
          guestProfile: resolveGuestRequestProfile(booking, index),
          parsedStartDate: parseDashboardDate(
            typeof booking.startDate === 'string' && booking.startDate
              ? booking.startDate
              : typeof booking.date === 'string'
                ? booking.date
                : null,
          ),
        }))
      : []),
    [dashboardData?.recentBookings],
  );

  const derivedPropertyStatsByTitle = useMemo(() => {
    const stats = new Map<string, { pendingRequestsCount: number; activeReservationsCount: number; nextArrivalDate: string | null }>();

    recentBookings.forEach((booking: any) => {
      const propertyTitle = typeof booking.propertyTitle === 'string' ? booking.propertyTitle.trim() : '';

      if (!propertyTitle) {
        return;
      }

      const currentValue = stats.get(propertyTitle) ?? {
        pendingRequestsCount: 0,
        activeReservationsCount: 0,
        nextArrivalDate: null,
      };

      if (booking.status === 'pending') {
        currentValue.pendingRequestsCount += 1;
      }

      if (booking.status === 'confirmed') {
        currentValue.activeReservationsCount += 1;

        const formattedDate = typeof booking.startDate === 'string' && booking.startDate
          ? booking.startDate
          : typeof booking.date === 'string' && booking.date
            ? booking.date
            : null;
        const currentArrivalDate = parseDashboardDate(currentValue.nextArrivalDate);
        const bookingArrivalDate = parseDashboardDate(formattedDate);

        if (isFutureOrToday(bookingArrivalDate) && (!currentArrivalDate || (bookingArrivalDate && bookingArrivalDate < currentArrivalDate))) {
          currentValue.nextArrivalDate = formattedDate;
        }
      }

      stats.set(propertyTitle, currentValue);
    });

    return stats;
  }, [recentBookings]);

  const hostProperties = useMemo(() => {
    const properties = Array.isArray(dashboardData?.properties) ? dashboardData.properties : [];

    return properties
      .map((property: any) => {
        const fallbackStats = derivedPropertyStatsByTitle.get(typeof property.title === 'string' ? property.title.trim() : '') ?? {
          pendingRequestsCount: 0,
          activeReservationsCount: 0,
          nextArrivalDate: null,
        };
        const verificationItems = getPropertyVerificationItems(property);
        const verificationDetails = getPropertyVerificationDetails({ ...property, verificationItems });
        const verificationProgress = getPropertyVerificationProgress({ ...property, verificationItems });

        return {
          ...property,
          pendingRequestsCount: Math.max(toSafeCount(property.pendingRequestsCount), fallbackStats.pendingRequestsCount),
          activeReservationsCount: Math.max(toSafeCount(property.activeReservationsCount), fallbackStats.activeReservationsCount),
          nextArrivalDate: typeof property.nextArrivalDate === 'string' && property.nextArrivalDate
            ? property.nextArrivalDate
            : fallbackStats.nextArrivalDate,
          verificationDetails,
          verificationItems,
          verificationProgress,
          completedVerificationItems: verificationItems.filter((item) => item.status === 'complete'),
          pendingVerificationItems: verificationItems.filter((item) => item.status !== 'complete'),
          completedVerificationDetails: verificationItems.filter((item) => item.status === 'complete'),
          pendingVerificationDetails: verificationItems.filter((item) => item.status !== 'complete'),
        };
      })
      .sort((left: any, right: any) => {
        const leftIsActive = left.status === 'active' ? 1 : 0;
        const rightIsActive = right.status === 'active' ? 1 : 0;

        if (leftIsActive !== rightIsActive) {
          return rightIsActive - leftIsActive;
        }

        if (left.pendingRequestsCount !== right.pendingRequestsCount) {
          return right.pendingRequestsCount - left.pendingRequestsCount;
        }

        const leftArrival = parseDashboardDate(left.nextArrivalDate);
        const rightArrival = parseDashboardDate(right.nextArrivalDate);

        if (leftArrival && rightArrival && leftArrival.getTime() !== rightArrival.getTime()) {
          return leftArrival.getTime() - rightArrival.getTime();
        }

        if (leftArrival && !rightArrival) {
          return -1;
        }

        if (!leftArrival && rightArrival) {
          return 1;
        }

        return String(left.title || '').localeCompare(String(right.title || ''), 'es');
      });
  }, [dashboardData?.properties, derivedPropertyStatsByTitle]);

  const pendingRequestBookings = useMemo(
    () => recentBookings.filter((booking: any) => {
      const stage = getBookingFlow(booking).stage;
      return stage === 'request-pending' || (!stage && booking.status === 'pending');
    }),
    [recentBookings],
  );

  const upcomingArrivalBookings = useMemo(
    () => recentBookings
      .filter((booking: any) => booking.status === 'confirmed' && isFutureOrToday(booking.parsedStartDate))
      .sort((left: any, right: any) => {
        const leftTime = left.parsedStartDate instanceof Date ? left.parsedStartDate.getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.parsedStartDate instanceof Date ? right.parsedStartDate.getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      }),
    [recentBookings],
  );

  const upcomingArrivalBookingIds = useMemo(
    () => new Set(upcomingArrivalBookings.map((booking: any) => booking.id)),
    [upcomingArrivalBookings],
  );

  const acceptedReservationBookings = useMemo(
    () => recentBookings.filter((booking: any) => (
      booking.status !== 'pending'
      && !upcomingArrivalBookingIds.has(booking.id)
    )),
    [recentBookings, upcomingArrivalBookingIds],
  );

  const nextArrivalFromProperties = useMemo(
    () => hostProperties
      .filter((property: any) => isFutureOrToday(parseDashboardDate(property.nextArrivalDate)))
      .sort((left: any, right: any) => {
        const leftTime = parseDashboardDate(left.nextArrivalDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightTime = parseDashboardDate(right.nextArrivalDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })[0] ?? null,
    [hostProperties],
  );

  const dashboardOverview = useMemo(() => {
    const activePropertiesCount = hostProperties.filter((property: any) => property.status === 'active').length;
    const pendingRequestsCount = Math.max(
      hostProperties.reduce((total: number, property: any) => total + toSafeCount(property.pendingRequestsCount), 0),
      pendingRequestBookings.length,
    );
    const activeReservationsCount = Math.max(
      hostProperties.reduce((total: number, property: any) => total + toSafeCount(property.activeReservationsCount), 0),
      recentBookings.filter((booking: any) => booking.status === 'confirmed').length,
    );

    if (nextArrivalFromProperties) {
      return {
        activePropertiesCount,
        pendingRequestsCount,
        activeReservationsCount,
        nextArrival: {
          dateLabel: formatDashboardDate(nextArrivalFromProperties.nextArrivalDate),
          helper: nextArrivalFromProperties.title || 'Próxima llegada',
        },
      };
    }

    const fallbackNextArrival = upcomingArrivalBookings[0];

    return {
      activePropertiesCount,
      pendingRequestsCount,
      activeReservationsCount,
      nextArrival: fallbackNextArrival
        ? {
            dateLabel: formatDashboardDate(fallbackNextArrival.startDate || fallbackNextArrival.date),
            helper: [fallbackNextArrival.propertyTitle, fallbackNextArrival.userName].filter(Boolean).join(' · '),
          }
        : null,
    };
  }, [hostProperties, nextArrivalFromProperties, pendingRequestBookings.length, recentBookings, upcomingArrivalBookings]);

  const priorityActions = useMemo(() => {
    const actions = [] as Array<{
      id: string;
      eyebrow: string;
      title: string;
      description: string;
      actionLabel: string;
      icon: React.ReactNode;
      kind: 'requests' | 'property' | 'availability';
      propertyId?: string;
    }>;

    if (dashboardOverview.pendingRequestsCount > 0) {
      actions.push({
        id: 'pending-requests',
        eyebrow: 'Recibi mas consultas',
        title: `Responde ${formatCountLabel(dashboardOverview.pendingRequestsCount, 'la solicitud pendiente', 'las solicitudes pendientes')}`,
        description: 'Responder rapido evita que la conversacion se enfrie y te deja el panel mas ordenado.',
        actionLabel: 'Ver solicitudes',
        icon: <Icons.MessageSquare className="h-5 w-5" />,
        kind: 'requests',
      });
    }

    const propertyNeedingVerification = hostProperties.find((property: any) => property.pendingVerificationDetails.length > 0);

    if (propertyNeedingVerification) {
      actions.push({
        id: 'missing-verifications',
        eyebrow: 'Genera mas confianza',
        title: `Mejora ${propertyNeedingVerification.title}`,
        description: propertyNeedingVerification.pendingVerificationDetails.length === 1
          ? `Te falta ${propertyNeedingVerification.pendingVerificationDetails[0]?.label?.toLowerCase() || 'un paso de respaldo'} para que el aviso muestre mejor respaldo visible.`
          : `Te faltan ${propertyNeedingVerification.pendingVerificationDetails.length} pasos de respaldo para acercar el aviso a la verificación presencial.`,
        actionLabel: 'Mejorar aviso',
        icon: <Icons.Shield className="h-5 w-5" />,
        kind: 'property',
        propertyId: propertyNeedingVerification.id,
      });
    }

    const pausedProperty = hostProperties.find((property: any) => property.status !== 'active');
    const availabilityProperty = hostProperties.find((property: any) => property.status === 'active') || hostProperties[0];

    if (pausedProperty) {
      actions.push({
        id: 'paused-property',
        eyebrow: 'Mejora tu visibilidad',
        title: `Volve a activar ${pausedProperty.title}`,
        description: 'Hoy esta pausado. Cuando lo actives vuelve a mostrarse y puede recibir consultas de nuevo.',
        actionLabel: 'Revisar aviso',
        icon: <Icons.Home className="h-5 w-5" />,
        kind: 'property',
        propertyId: pausedProperty.id,
      });
    } else if (availabilityProperty) {
      actions.push({
        id: 'availability',
        eyebrow: 'Mejora tu visibilidad',
        title: `Revisa la disponibilidad de ${availabilityProperty.title}`,
        description: availabilityProperty.nextArrivalDate
          ? `Tu proxima llegada para este aviso esta marcada para el ${formatDashboardDate(availabilityProperty.nextArrivalDate)}.`
          : 'Deja claras las fechas disponibles para responder menos dudas y cerrar mas rapido.',
        actionLabel: 'Editar disponibilidad',
        icon: <Icons.Calendar className="h-5 w-5" />,
        kind: 'availability',
        propertyId: availabilityProperty.id,
      });
    }

    return actions.slice(0, 3);
  }, [dashboardOverview.pendingRequestsCount, hostProperties]);

  const handlePriorityAction = (action: { kind: 'requests' | 'property' | 'availability'; propertyId?: string }) => {
    if (action.kind === 'requests') {
      scrollToSection(REQUESTS_SECTION_ID);
      if (pendingRequestBookings[0]?.id) {
        setExpandedBookingId(pendingRequestBookings[0].id);
      }
      return;
    }

    if (action.propertyId) {
      setFocusedPropertyId(action.propertyId);
    }

    if (action.kind === 'availability' && action.propertyId) {
      setAvailabilityPropertyId(action.propertyId);
    }

    scrollToSection(PROPERTIES_SECTION_ID);
  };

  const renderBookingEntry = (booking: any) => {
    const isExpanded = expandedBookingId === booking.id;
    const canReviewBooking = booking.status === 'completed' && !booking.hostReviewSubmitted;
    const isDecisionStage = booking.status === 'pending';
    const shouldShowGuestProfile = isDecisionStage || isExpanded;
    const bookingSummaryItems = getBookingSummaryItems(booking);
    const bookingFlow = getBookingFlow(booking);
    const arrivalActionsAvailable = isBookingCheckInReached(booking.startDate);
    const showBookingFlowPanel = booking.status !== 'completed' && Boolean(booking.requestMode && bookingFlow.stage && bookingFlow.stage !== 'reservation-confirmed');
    const canAcceptRequest = Boolean(booking.conversationId && bookingFlow.stage === 'request-pending');
    const canNotAdvanceRequest = Boolean(booking.conversationId && bookingFlow.stage === 'request-pending');
    const canConfirmDirectDeposit = Boolean(booking.conversationId && bookingFlow.stage === 'direct-deposit-reported');
    const canConfirmProtectedAccess = bookingFlow.state === 'guest_checkin_confirmed' && arrivalActionsAvailable;
    const canOpenChat = Boolean(booking.conversationId);
    const canCancelAsHost = (booking.status === 'pending' || booking.status === 'confirmed')
      && bookingFlow.stage !== 'request-pending'
      && bookingFlow.stage !== 'host-cancelled'
      && bookingFlow.stage !== 'guest-cancelled'
      && bookingFlow.stage !== 'protected-deposit-review'
      && bookingFlow.stage !== 'protected-no-show-pending';
    const canReportProtectedNoShow = bookingFlow.stage === 'protected-deposit-held' && bookingFlow.state !== 'guest_checkin_confirmed' && arrivalActionsAvailable;
    const isAcceptingRequest = processingBookingAction?.bookingId === booking.id && processingBookingAction?.action === 'accept-request';
    const isNotAdvancingRequest = processingBookingAction?.bookingId === booking.id && processingBookingAction?.action === 'not-advance-request';
    const isConfirmingDirectDeposit = processingBookingAction?.bookingId === booking.id && processingBookingAction?.action === 'confirm-direct-deposit';
    const isConfirmingProtectedAccess = processingBookingAction?.bookingId === booking.id && processingBookingAction?.action === 'confirm-access';
    const isCancelingAsHost = processingBookingAction?.bookingId === booking.id && processingBookingAction?.action === 'cancel-host';
    const isReportingNoShow = processingBookingAction?.bookingId === booking.id && processingBookingAction?.action === 'report-no-show';

    return (
      <div key={booking.id} className="space-y-4 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Icons.User className="h-6 w-6 text-slate-400" />
            </div>
            <div className="space-y-2">
              <p className="section-title dark:text-white">{booking.userName || 'Huésped'}</p>
              <p className="body-sm text-muted">{booking.propertyTitle}</p>
              {bookingSummaryItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {bookingSummaryItems.map((item) => (
                    <span key={`${booking.id}-${item}`} className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]', getBookingStatusClassName(booking))}>
              {getBookingStatusLabel(booking)}
            </span>
          </div>
        </div>

        {shouldShowGuestProfile ? (
          <GuestRequestProfileCard guestName={booking.userName || 'Huésped'} profile={booking.guestProfile} />
        ) : null}

        {showBookingFlowPanel ? (
          <div className="rounded-[26px] border border-brand/15 bg-brand/5 p-4 dark:border-brand/20 dark:bg-brand/10">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">{bookingFlow.statusLabel}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{bookingFlow.description}</p>
                  {bookingFlow.supportText ? <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{bookingFlow.supportText}</p> : null}
                  {bookingFlow.trackingHint ? <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{bookingFlow.trackingHint}</p> : null}
                </div>

                {canAcceptRequest ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleAcceptRequest(booking)}
                    loading={isAcceptingRequest}
                    loadingLabel="Aceptando..."
                    className="rounded-full"
                  >
                    <>
                      <Icons.CheckCircle2 className="h-4 w-4" />
                      {bookingFlow.primaryActionLabel}
                    </>
                  </Button>
                ) : null}

                {canNotAdvanceRequest ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleNotAdvanceRequest(booking)}
                    loading={isNotAdvancingRequest}
                    loadingLabel="Actualizando..."
                    className="rounded-full"
                  >
                    <>
                      <Icons.X className="h-4 w-4" />
                      No avanzar
                    </>
                  </Button>
                ) : null}

                {canConfirmDirectDeposit ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleConfirmDirectDeposit(booking)}
                    loading={isConfirmingDirectDeposit}
                    loadingLabel="Confirmando..."
                    className="rounded-full"
                  >
                    <>
                      <Icons.CheckCircle2 className="h-4 w-4" />
                      {bookingFlow.primaryActionLabel}
                    </>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <div className="rounded-2xl bg-white/80 px-3 py-3 text-sm dark:bg-slate-900/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Estado actual</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">{bookingFlow.statusLabel}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-3 py-3 text-sm dark:bg-slate-900/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Actúa ahora</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">{getReservationNextActorDisplayLabel(bookingFlow)}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-3 py-3 text-sm dark:bg-slate-900/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Próximo paso</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">{getReservationNextStepDisplayLabel(bookingFlow)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!isDecisionStage || canReviewBooking || canCancelAsHost || canConfirmProtectedAccess || canReportProtectedNoShow || canOpenChat ? (
          <div className="flex flex-wrap gap-2 pt-1 lg:justify-end">
            {canOpenChat ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate(withDemoQuery(`/chat/${booking.conversationId}`))}
                className="btn-secondary rounded-full"
              >
                <>
                  <Icons.MessageSquare className="h-4 w-4" />
                  Abrir chat
                </>
              </Button>
            ) : null}
            {!isDecisionStage ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setExpandedBookingId((currentValue) => (currentValue === booking.id ? null : booking.id))}
                className="rounded-full"
              >
                {isExpanded ? 'Ocultar ficha' : 'Ver ficha del huésped'}
              </Button>
            ) : null}
            {canConfirmProtectedAccess ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleConfirmProtectedAccess(booking)}
                loading={isConfirmingProtectedAccess}
                loadingLabel="Confirmando acceso..."
                className="rounded-full"
              >
                <>
                  <Icons.CheckCircle2 className="h-4 w-4" />
                  Confirmar acceso
                </>
              </Button>
            ) : null}
            {canReportProtectedNoShow ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleReportNoShow(booking)}
                loading={isReportingNoShow}
                loadingLabel="Informando no show..."
                className="rounded-full"
              >
                <>
                  <Icons.AlertTriangle className="h-4 w-4" />
                  {bookingFlow.primaryActionLabel}
                </>
              </Button>
            ) : null}
            {bookingFlow.stage === 'protected-deposit-held' && !arrivalActionsAvailable ? (
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {bookingFlow.pendingActionHint}
              </div>
            ) : null}
            {canCancelAsHost ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCancelBookingAsHost(booking)}
                loading={isCancelingAsHost}
                loadingLabel="Cancelando..."
                className="rounded-full"
              >
                <>
                  <Icons.X className="h-4 w-4" />
                  Cancelar reserva
                </>
              </Button>
            ) : null}
            {canReviewBooking ? (
              <button
                onClick={() => setReviewingBooking(booking)}
                className="btn rounded-[var(--app-radius-control)] bg-brand px-4 py-2 text-sm text-white hover:-translate-y-px hover:bg-brand-dark hover:shadow-[var(--app-shadow-brand)]"
              >
                Registrar cierre
              </button>
            ) : null}
            {booking.status === 'completed' && booking.hostReviewSubmitted ? (
              <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                Ya compartiste el cierre de esta estadía
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <LoadingState
        fullScreen
        message="Cargando tu panel..."
        description="Estamos reuniendo propiedades, reservas y verificaciones para mostrarte qué ya está claro y qué te falta completar."
      />
    );
  }

  if (loadError) {
    return (
      <ErrorState
        fullScreen
        title="No pudimos cargar el panel del anfitrión"
        description={loadError}
        onRetry={() => void fetchData()}
        onDismiss={onBack}
        dismissLabel="Volver a explorar"
      />
    );
  }

  if (isAddingProperty || showPublishingFlow) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
        <div className="mx-auto mb-6 max-w-5xl px-4">
          <Button variant="ghost" onClick={closePublishingFlow} className="rounded-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
            <Icons.ArrowLeft className="h-4 w-4" /> Cancelar
          </Button>
        </div>
        <PropertyUploadForm
          onComplete={(publishedPropertyId) => {
            closePublishingFlow();
            setFocusedPropertyId(publishedPropertyId ?? null);
            void fetchData();
          }}
        />
      </div>
    );
  }

  if (!dashboardData || dashboardData.properties?.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            eyebrow="Panel de anfitrión"
            tone="soft"
            visual={<Icons.LayoutDashboard className="h-10 w-10" />}
            title="Publica tu propiedad en pocos pasos"
            description="Arranca con lo esencial para activarla rapido. Despues podes mejorarla para generar mas confianza y recibir mas consultas."
            action={{
              label: 'Empezar',
              onClick: openPublishingFlow,
            }}
            secondaryAction={{
              label: 'Volver a explorar',
              onClick: onBack,
              variant: 'secondary',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="btn-secondary rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-brand dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Icons.ArrowLeft className="h-4 w-4" />
            Volver a explorar
          </button>
          <div className="flex items-center gap-3">
            <AccountModeSwitch compact />
            <div className="hidden text-right sm:block">
              <p className="section-title dark:text-white">Panel de anfitrión</p>
              <p className="eyebrow">Estado actual y próximos pasos</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand/20 bg-brand/10">
              <Icons.User className="h-5 w-5 text-brand" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className={dashboardSectionClass}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="eyebrow">Panel de anfitrion</p>
              <h1 className="section-title text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Publica, responde y mejora sin complicarte</h1>
              <p className="max-w-3xl body-sm leading-7 text-slate-600 dark:text-slate-300">
                Primero ves el estado de cada aviso, despues la actividad reciente y al final solo las sugerencias que hoy pueden mover mas consultas.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <span className="badge">
                  {dashboardOverview.activePropertiesCount > 0
                    ? formatCountLabel(dashboardOverview.activePropertiesCount, 'aviso activo', 'avisos activos')
                    : 'Sin avisos activos'}
                </span>
                <span className="badge">
                  {dashboardOverview.pendingRequestsCount > 0
                    ? formatCountLabel(dashboardOverview.pendingRequestsCount, 'solicitud pendiente', 'solicitudes pendientes')
                    : 'Sin solicitudes pendientes'}
                </span>
                <span className="badge">
                  {dashboardOverview.nextArrival?.dateLabel
                    ? `Proxima llegada ${dashboardOverview.nextArrival.dateLabel}`
                    : 'Sin llegadas proximas'}
                </span>
              </div>
            </div>
            <Button type="button" onClick={openPublishingFlow} className="rounded-full">
              <>
                <Icons.Home className="h-4 w-4" />
                Publicar propiedad
              </>
            </Button>
          </div>
        </section>

        <section id={PROPERTIES_SECTION_ID} className={dashboardSectionClass}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icons.Home className="h-5 w-5 text-brand" />
              <h2 className="section-title dark:text-white">Tus publicaciones</h2>
            </div>
            <p className="body-sm text-muted">Primero ves si cada aviso esta activo y despues cuanto ya queda claro para quien consulta.</p>
            <p className="body-sm text-muted">Desde aca podes mejorar la publicacion sin volverla mas pesada ni sacar el aviso del aire.</p>
          </div>

          <div className="overflow-hidden rounded-[var(--app-radius-card)] border border-slate-200/80 bg-white/94 dark:border-slate-800 dark:bg-slate-900/94">
            {hostProperties.map((property: any, index: number) => {
              const pendingKeys = new Set(property.pendingVerificationItems.map((item: any) => item.key));
              const showIdentityAction = pendingKeys.has('identity');
              const showAvailabilityAction = pendingKeys.has('availability') || pendingKeys.has('price');
              const showDocumentsAction = property.verificationProgress?.level !== 'base'
                && Array.isArray(property.verificationProgress?.advancedChecks)
                && property.verificationProgress.advancedChecks.some((item: any) => item.key === 'documents' && item.status !== 'complete');
              const showOnsiteAction = property.premiumOnsiteOffer
                && !property.premiumOnsiteOffer.completed
                && Array.isArray(property.verificationProgress?.advancedChecks)
                && property.verificationProgress.advancedChecks.some((item: any) => item.key === 'manualReview' && item.status !== 'complete');

              return (
                <div key={property.id}>
                  <div
                    className={cn(
                      'grid gap-5 px-5 py-5 transition-colors sm:px-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]',
                      index > 0 && 'border-t border-slate-100 dark:border-slate-800',
                      focusedPropertyId === property.id && 'bg-brand/5 dark:bg-brand/10',
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                        <img src={property.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200'} alt={property.title} className="h-full w-full object-cover" />
                      </div>

                      <div className="min-w-0 space-y-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{property.title}</h3>
                            <span
                              className={cn(
                                'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                                property.status === 'active'
                                  ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
                              )}
                            >
                              {property.status === 'active' ? 'Activo' : 'Pausado'}
                            </span>
                          </div>
                          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{property.location}</p>
                        </div>

                        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                          <p className="eyebrow dark:text-slate-500">Estado del aviso</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {property.status === 'active' ? 'Tu publicacion ya esta activa' : 'Tu publicacion esta pausada'}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {property.status === 'active'
                              ? property.pendingRequestsCount > 0
                                ? 'Tenes consultas esperando respuesta en este aviso.'
                                : property.activeReservationsCount > 0
                                  ? 'Ya hay reservas en marcha y el aviso sigue visible.'
                                  : 'Esta listo para seguir recibiendo consultas.'
                              : 'Revisalo y activalo cuando quieras volver a mostrarlo.'}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="badge">
                              {property.pendingRequestsCount > 0 ? formatCountLabel(property.pendingRequestsCount, 'solicitud pendiente', 'solicitudes pendientes') : 'Sin solicitudes pendientes'}
                            </span>
                            <span className="badge">
                              {property.activeReservationsCount > 0 ? formatCountLabel(property.activeReservationsCount, 'reserva activa', 'reservas activas') : 'Sin reservas activas'}
                            </span>
                            {property.nextArrivalDate ? (
                              <span className="badge">
                                Proxima llegada {formatDashboardDate(property.nextArrivalDate)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <HostListingProgressPanel
                        property={property}
                        onRefresh={fetchData}
                        onOpenIdentityVerification={showIdentityAction ? () => navigate('/profile') : undefined}
                        onToggleAvailability={showAvailabilityAction ? () => {
                          setFocusedPropertyId(property.id);
                          setAvailabilityPropertyId((currentValue) => (currentValue === property.id ? null : property.id));
                        } : undefined}
                        isAvailabilityOpen={availabilityPropertyId === property.id}
                      />

                      {showDocumentsAction ? (
                        <div className="rounded-[22px] border border-slate-200/80 bg-white/92 p-4 dark:border-slate-800 dark:bg-slate-900/80">
                          <p className="eyebrow dark:text-slate-500">Respaldo privado</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Si querés sumar documentación interna, podés cargarla desde la ficha del aviso sin tocar el score visible.</p>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/detail/${property.id}`)}
                            className="mt-3 rounded-full"
                          >
                            <>
                              <Icons.Lock className="h-4 w-4" />
                              Abrir respaldo privado
                            </>
                          </Button>
                        </div>
                      ) : null}

                      {showOnsiteAction ? (
                        <div className="rounded-[20px] border border-indigo-200/70 bg-indigo-50/70 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                          <p className="eyebrow text-indigo-700 dark:text-indigo-300">Validación adicional</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Podés solicitar una verificación presencial para que el aviso muestre el sello completo cuando se confirme la visita.</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {property.premiumOnsiteOffer.complimentaryReason
                              ? property.premiumOnsiteOffer.complimentaryReason
                              : `Costo actual ${formatPremiumPriceLabel(property.premiumOnsiteOffer.priceArs, property.premiumOnsiteOffer.isComplimentary)}.`}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 rounded-full"
                            onClick={() => setActivePremiumOffer(property.premiumOnsiteOffer)}
                          >
                            <Icons.ShieldCheck className="h-4 w-4" />
                            Solicitar verificación presencial
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/detail/${property.id}`)}
                        className="rounded-full"
                      >
                        <>
                          <Icons.ExternalLink className="h-4 w-4" />
                          Ver aviso
                        </>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setFocusedPropertyId(property.id);
                          setAvailabilityPropertyId((currentValue) => (currentValue === property.id ? null : property.id));
                        }}
                        className="rounded-full"
                      >
                        <>
                          <Icons.Calendar className="h-4 w-4" />
                          {availabilityPropertyId === property.id ? 'Ocultar disponibilidad' : 'Editar disponibilidad'}
                        </>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleToggleStatus(property.id, property.status)}
                        className="rounded-full"
                      >
                        {property.status === 'active' ? 'Pausar aviso' : 'Activar aviso'}
                      </Button>
                    </div>
                  </div>

                  {availabilityPropertyId === property.id ? (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/60 sm:px-6">
                      <HostAvailabilityPanel propertyId={property.id} propertyTitle={property.title} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section id={REQUESTS_SECTION_ID} className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icons.UserCheck className="h-5 w-5 text-brand" />
              <h2 className="section-title dark:text-white">Actividad reciente</h2>
            </div>
            <p className="body-sm text-muted">Consultas, reservas y proximas llegadas ordenadas por lo que conviene mirar primero.</p>
          </div>

          <div className="space-y-4">
            <BookingGroup
              title="Consultas por responder"
              description="Lo que hoy necesita una respuesta directa para no perder ritmo."
              count={pendingRequestBookings.length}
              emptyText="No hay solicitudes pendientes ahora."
            >
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingRequestBookings.map((booking: any) => renderBookingEntry(booking))}
              </div>
            </BookingGroup>

            <BookingGroup
              title="Próximas llegadas"
              description="Reservas confirmadas que conviene tener presentes antes de la llegada."
              count={upcomingArrivalBookings.length}
              emptyText="No hay próximas llegadas confirmadas por ahora."
            >
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingArrivalBookings.map((booking: any) => renderBookingEntry(booking))}
              </div>
            </BookingGroup>

            <BookingGroup
              title="Reservas en curso y cerradas"
              description="Lo que ya esta encaminado, confirmado o necesita seguimiento despues."
              count={acceptedReservationBookings.length}
              emptyText="Todavía no hay reservas aceptadas para revisar."
            >
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {acceptedReservationBookings.map((booking: any) => renderBookingEntry(booking))}
              </div>
            </BookingGroup>
          </div>

          <p className="form-hint px-4 italic">
            * La ficha del huésped sigue dentro del flujo real de cada solicitud o reserva. Las evaluaciones se mantienen disponibles después de una estadía finalizada.
          </p>
        </section>

        <section className={dashboardSectionClass}>
          <div className="space-y-2">
            <p className="eyebrow">Sugerencias</p>
            <h2 className="section-title dark:text-white">Sugerencias para mover tus avisos</h2>
            <p className="body-sm text-muted">Solo te mostramos lo que hoy puede ayudarte a recibir mas consultas, generar mas confianza o mejorar visibilidad.</p>
          </div>

          {priorityActions.length > 0 ? (
            <div className="space-y-3">
              {priorityActions.map((action) => (
                <PriorityActionRow
                  key={action.id}
                  eyebrow={action.eyebrow}
                  title={action.title}
                  description={action.description}
                  actionLabel={action.actionLabel}
                  icon={action.icon}
                  onAction={() => handlePriorityAction(action)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-slate-200/80 bg-white/92 p-5 text-sm leading-6 text-slate-500 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.3)] dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
              Hoy no hay acciones urgentes. Tus avisos ya estan ordenados y podes seguir desde la actividad reciente cuando aparezca algo nuevo.
            </div>
          )}
        </section>

        {reviewingBooking && (
          <ReviewModal
            bookingId={reviewingBooking.id}
            reviewedUserId={reviewingBooking.userId}
            reviewedUserName={reviewingBooking.userName || 'Huésped'}
            type="host_review"
            onClose={() => setReviewingBooking(null)}
            onComplete={() => {
              if (reviewingBooking?.id) {
                updateRecentBooking({ ...reviewingBooking, hostReviewSubmitted: true });
              }
              setReviewingBooking(null);
            }}
          />
        )}

        {activePremiumOffer ? (
          <PremiumVerificationCheckoutModal
            offer={activePremiumOffer}
            onClose={() => setActivePremiumOffer(null)}
            onConfirm={handlePremiumOfferCheckout}
            processing={processingPremiumOffer}
          />
        ) : null}
      </main>
    </div>
  );
};
