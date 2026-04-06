import React, { useEffect, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import { resolveGuestRequestProfile } from '../lib/guestRequestProfile';
import { getPropertyVerificationBadge, getPropertyVerificationItems } from '../lib/propertyVerification';
import { showToast } from '../lib/toast';
import { Icons } from './Icons';
import GuestRequestProfileCard from './GuestRequestProfileCard';
import HostAvailabilityPanel from './HostAvailabilityPanel';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { PropertyUploadForm } from './PropertyUploadForm';
import { ReviewModal } from './ReviewModal';
import { Button } from './ui/Button';
import { getReservationFlowCopy } from '../lib/reservationFlow';

interface HostDashboardProps {
  onBack: () => void;
}

const dashboardCardClass = 'app-card p-6 dark:border-slate-800 dark:bg-slate-900';
const dashboardSectionClass = 'app-card p-6 md:p-8 space-y-6 dark:border-slate-800 dark:bg-slate-900';
const dashboardMutedTileClass = 'rounded-[var(--app-radius-control)] border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50';

const getHostVerificationStatusText = (status: 'complete' | 'pending') => (
  status === 'complete' ? 'Ya está completa.' : 'Todavía falta completarla.'
);

const getBookingFlow = (booking: any) => getReservationFlowCopy({
  mode: booking.requestMode,
  requestStatus: booking.requestMode === 'protected'
    ? booking.depositStatus === 'held' || booking.depositStatus === 'released' || booking.status === 'confirmed'
      ? 'accepted'
      : 'pending'
    : undefined,
  bookingStatus: booking.status,
  depositStatus: booking.depositStatus,
  cancellationActor: booking.cancellationActor,
  viewerRole: 'host',
});

const getBookingStatusLabel = (booking: any) => {
  const flow = getBookingFlow(booking);

  if (flow.statusLabel) {
    return flow.statusLabel;
  }

  const status = booking.status;
  if (status === 'pending') return 'Solicitud pendiente';
  if (status === 'confirmed') return 'Reserva confirmada';
  if (status === 'completed') return 'Estadía finalizada';
  return 'Estado no disponible';
};

const getBookingStatusClassName = (booking: any) => {
  const flow = getBookingFlow(booking);

  if (flow.stage === 'host-cancelled') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300';
  }

  if (flow.stage === 'guest-cancelled' || flow.stage === 'protected-deposit-review' || flow.stage === 'protected-no-show-pending' || flow.stage === 'direct-deposit-reported') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300';
  }

  if (flow.stage === 'request-accepted' || flow.stage === 'protected-deposit-held') {
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

export const HostDashboard: React.FC<HostDashboardProps> = ({ onBack }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [availabilityPropertyId, setAvailabilityPropertyId] = useState<string | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [processingBookingAction, setProcessingBookingAction] = useState<{ bookingId: string; action: 'cancel-host' | 'report-no-show' } | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await apiJson<any>('/api/host/dashboard', { includeCredentials: true });
      setDashboardData(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No pudimos cargar el panel del anfitrión.');
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
      showToast('Reserva cancelada', booking.requestMode === 'protected' ? 'La reserva quedó cancelada y la seña se devuelve automáticamente.' : 'La reserva quedó cancelada y el estado ya se actualizó.', 'success');
    } catch (err) {
      showToast('Reserva', err instanceof Error ? err.message : 'No pudimos cancelar la reserva desde el panel.', 'error');
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
      showToast('Pendiente de confirmación', 'El no show quedó informado y la seña sigue en pausa hasta que se revise.', 'success');
    } catch (err) {
      showToast('No show', err instanceof Error ? err.message : 'No pudimos registrar el no show.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
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

  if (!dashboardData || dashboardData.properties?.length === 0) {
    if (isAddingProperty) {
      return (
        <div className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
          <div className="mx-auto mb-6 max-w-5xl px-4">
            <Button variant="ghost" onClick={() => setIsAddingProperty(false)} className="rounded-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
              <Icons.ArrowLeft className="h-4 w-4" /> Cancelar
            </Button>
          </div>
          <PropertyUploadForm onComplete={() => { setIsAddingProperty(false); void fetchData(); }} />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 px-6 py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            eyebrow="Panel de anfitrión"
            tone="soft"
            visual={<Icons.LayoutDashboard className="h-10 w-10" />}
            title="Todavía no publicaste propiedades"
            description="Publicá tu primera propiedad con datos claros para aparecer mejor y recibir preguntas más concretas."
            action={{
              label: 'Publicá tu primera propiedad',
              onClick: () => setIsAddingProperty(true),
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

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await apiJson(`/api/properties/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
        includeCredentials: true,
      });
      showToast('Publicación actualizada', newStatus === 'active' ? 'La propiedad volvió a quedar visible.' : 'La propiedad quedó pausada y ya no recibe reservas nuevas.', 'success');
      void fetchData();
    } catch (err) {
      console.error(err);
      showToast('Publicación', err instanceof Error ? err.message : 'No pudimos actualizar el estado de la propiedad.', 'error');
    }
  };

  const hostProperties = Array.isArray(dashboardData?.properties) ? dashboardData.properties : [];
  const recentBookings = Array.isArray(dashboardData?.recentBookings)
    ? dashboardData.recentBookings.map((booking: any, index: number) => ({
        ...booking,
        guestProfile: resolveGuestRequestProfile(booking, index),
      }))
    : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <button
            onClick={onBack}
            className="app-button-base rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-brand dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Icons.ArrowLeft className="h-4 w-4" />
            Volver a explorar
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="app-title-4 dark:text-white">Panel de anfitrión</p>
              <p className="app-eyebrow">Tu actividad</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-brand/20 bg-brand/10">
              <Icons.User className="h-5 w-5 text-brand" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className={dashboardCardClass}>
            <p className="app-eyebrow mb-1">Calificación</p>
            <div className="flex items-center gap-2">
              <Icons.Star className="h-6 w-6 fill-current text-brand" />
              <p className="text-3xl font-semibold text-slate-900 dark:text-white">{dashboardData.stats?.host_rating || '5.0'}</p>
            </div>
          </div>
          <div className={dashboardCardClass}>
            <p className="app-eyebrow mb-1">Propiedades</p>
            <p className="text-3xl font-semibold text-brand">{dashboardData.properties?.length || 0}</p>
          </div>
          <div className={dashboardCardClass}>
            <p className="app-eyebrow mb-1">Reservas recibidas</p>
            <p className="text-3xl font-semibold text-slate-900 dark:text-white">{dashboardData.stats?.total_bookings_hosted || 0}</p>
          </div>
          <div className="rounded-[32px] bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-lg shadow-brand/20">
            <p className="app-eyebrow mb-1 text-white/60">Ingresos estimados</p>
            <p className="text-3xl font-semibold">${Math.floor(dashboardData.estimatedIncome || 0).toLocaleString()}</p>
          </div>
        </section>

        <section className={cn(dashboardSectionClass, 'relative overflow-hidden')}>
          <div className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-brand/5 blur-3xl opacity-50" />

          <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="58"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={364.42}
                  initial={{ strokeDashoffset: 364.42 }}
                  animate={{ strokeDashoffset: 364.42 * (1 - (dashboardData.stats?.trust_score || 0) / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  className="text-brand"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{dashboardData.stats?.trust_score || 0}</span>
                <span className="app-eyebrow">Confianza</span>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <h3 className="app-title-4 dark:text-white">Cómo te ven</h3>
              <p className="app-body-sm app-text-muted">Hoy tu perfil figura como <span className="font-semibold text-brand">{dashboardData.stats?.badge || 'Usuario nuevo'}</span>. Un mejor historial y avisos más completos ayudan a recibir consultas más directas.</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <div className={cn(dashboardMutedTileClass, 'px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400')}>
                  <span className="mr-1 text-brand">Calificación:</span> {dashboardData.stats?.host_rating || 5.0}
                </div>
                <div className={cn(dashboardMutedTileClass, 'px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400')}>
                  <span className={cn('mr-1', dashboardData.stats?.host_verified ? 'text-emerald-500' : 'text-slate-400')}>Validado:</span> {dashboardData.stats?.host_verified ? 'Sí' : 'Pendiente'}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={dashboardSectionClass}>
          <div className="space-y-2">
            <h2 className="app-title-4 dark:text-white">Completá lo que falta en cada aviso</h2>
            <p className="app-body-sm app-text-muted">Cuanto más completo esté tu aviso, más arriba aparece en los resultados.</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {hostProperties.map((property: any) => {
              const verificationBadge = getPropertyVerificationBadge(property);
              const verificationItems = getPropertyVerificationItems(property);

              return (
                <div key={`verification-${property.id}`} className={cn(dashboardMutedTileClass, 'space-y-4 p-5')}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{property.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{verificationBadge.label}</p>
                    </div>
                    <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {verificationBadge.visual}
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {verificationItems.map((item) => (
                      <li key={`${property.id}-${item.key}`} className="flex items-start gap-3 text-sm leading-5">
                        <span
                          className={cn(
                            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                            item.status === 'complete'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                              : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
                          )}
                          aria-hidden="true"
                        >
                          {item.status === 'complete' ? '✔' : '○'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                          <p className="text-slate-500 dark:text-slate-400">{getHostVerificationStatusText(item.status)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="app-title-4 flex items-center gap-2 dark:text-white">
              <Icons.Home className="h-5 w-5 text-brand" />
              Tus propiedades
            </h2>
            <button onClick={() => setIsAddingProperty(true)} className="app-button-base rounded-[var(--app-radius-control)] bg-brand px-4 py-2 text-sm text-white hover:-translate-y-px hover:bg-brand-dark hover:shadow-[var(--app-shadow-brand)]">
              Publicar una propiedad
            </button>
          </div>

          <div className="grid gap-4">
            {dashboardData.properties.map((prop: any) => (
              <div key={prop.id}>
                <div className="app-card flex flex-col gap-4 p-4 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      <img src={prop.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200'} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h3 className="app-title-4 dark:text-white">{prop.title}</h3>
                      <p className="app-body-sm app-text-muted">${prop.price} / noche • {prop.reviewsCount} reseñas</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleToggleStatus(prop.id, prop.status)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]',
                        prop.status === 'active'
                          ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      )}
                    >
                      {prop.status === 'active' ? 'Activo' : 'Pausado'}
                    </button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setAvailabilityPropertyId((currentValue) => (currentValue === prop.id ? null : prop.id))}
                      className="rounded-full"
                    >
                      <>
                        <Icons.Calendar className="h-4 w-4" />
                        {availabilityPropertyId === prop.id ? 'Ocultar disponibilidad' : 'Disponibilidad'}
                      </>
                    </Button>
                  </div>
                </div>

                {availabilityPropertyId === prop.id ? (
                  <HostAvailabilityPanel propertyId={prop.id} propertyTitle={prop.title} />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="app-title-4 flex items-center gap-2 dark:text-white">
                <Icons.UserCheck className="h-5 w-5 text-brand" />
                Solicitudes y huéspedes
              </h2>
              <p className="app-body-sm app-text-muted">En las solicitudes pendientes, la ficha aparece debajo del resumen para que decidas con más información antes de seguir.</p>
            </div>
          </div>

          <div className="app-card overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="app-eyebrow">Solicitudes y reservas recientes</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking: any) => {
                  const isExpanded = expandedBookingId === booking.id;
                  const canReviewBooking = booking.status === 'completed';
                  const isDecisionStage = booking.status === 'pending';
                  const shouldShowGuestProfile = isDecisionStage || isExpanded;
                  const bookingSummaryItems = getBookingSummaryItems(booking);
                  const bookingFlow = getBookingFlow(booking);
                  const showBookingFlowPanel = Boolean(booking.requestMode && bookingFlow.stage && bookingFlow.stage !== 'request-pending' && bookingFlow.stage !== 'reservation-confirmed');
                  const canCancelAsHost = (booking.status === 'pending' || booking.status === 'confirmed') && bookingFlow.stage !== 'host-cancelled' && bookingFlow.stage !== 'guest-cancelled' && bookingFlow.stage !== 'protected-deposit-review' && bookingFlow.stage !== 'protected-no-show-pending';
                  const canReportProtectedNoShow = booking.requestMode === 'protected' && bookingFlow.stage === 'protected-deposit-held';
                  const isCancelingAsHost = processingBookingAction?.bookingId === booking.id && processingBookingAction?.action === 'cancel-host';
                  const isReportingNoShow = processingBookingAction?.bookingId === booking.id && processingBookingAction?.action === 'report-no-show';

                  return (
                    <div key={booking.id} className="space-y-4 p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                            <Icons.User className="h-6 w-6 text-slate-400" />
                          </div>
                          <div className="space-y-2">
                            <p className="app-title-4 dark:text-white">{booking.userName || 'Huésped'}</p>
                            <p className="app-body-sm app-text-muted">{booking.propertyTitle}</p>
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
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">{bookingFlow.statusLabel}</p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{bookingFlow.description}</p>
                              {bookingFlow.supportText ? <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{bookingFlow.supportText}</p> : null}
                              {bookingFlow.trackingHint ? <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{bookingFlow.trackingHint}</p> : null}
                            </div>

                            <div className="grid gap-2 md:grid-cols-3">
                              <div className="rounded-2xl bg-white/80 px-3 py-3 text-sm dark:bg-slate-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Estado actual</p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{bookingFlow.statusLabel}</p>
                              </div>
                              <div className="rounded-2xl bg-white/80 px-3 py-3 text-sm dark:bg-slate-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Actúa ahora</p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{bookingFlow.nextActorLabel ?? 'No hace falta'}</p>
                              </div>
                              <div className="rounded-2xl bg-white/80 px-3 py-3 text-sm dark:bg-slate-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Próximo paso</p>
                                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{bookingFlow.nextStepLabel ?? 'Solo dejar contexto por chat'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {!isDecisionStage || canReviewBooking || canCancelAsHost || canReportProtectedNoShow ? (
                        <div className="flex flex-wrap gap-2 pt-1 lg:justify-end">
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
                                Marcar no show
                              </>
                            </Button>
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
                              className="app-button-base rounded-[var(--app-radius-control)] bg-brand px-4 py-2 text-sm text-white hover:-translate-y-px hover:bg-brand-dark hover:shadow-[var(--app-shadow-brand)]"
                            >
                              Evaluar huésped
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="p-8 text-center app-body-sm app-text-muted">Todavía no hay solicitudes o estadías para revisar.</p>
              )}
            </div>
          </div>
          <p className="app-form-hint px-4 italic">
            * La ficha se ordena dentro del flujo real de la solicitud. Las evaluaciones siguen disponibles solo después de una estadía finalizada.
          </p>
        </section>

        {reviewingBooking && (
          <ReviewModal
            bookingId={reviewingBooking.id}
            reviewedUserId={reviewingBooking.userId}
            reviewedUserName={reviewingBooking.userName || 'Huésped'}
            type="host_to_guest"
            onClose={() => setReviewingBooking(null)}
            onComplete={() => {
              setReviewingBooking(null);
              fetchData();
            }}
          />
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="app-card space-y-4 border-brand/10 bg-brand/5 p-8 dark:border-brand/20 dark:bg-brand/10">
            <Icons.Lightbulb className="h-8 w-8 text-brand" />
            <h3 className="app-title-4 text-slate-950 dark:text-slate-50">¿Por qué conviene verificar mejor?</h3>
            <p className="app-body-sm text-slate-700 dark:text-slate-300">
              Cuando el aviso deja claro quién publica, dónde está el lugar y qué ya fue comprobado, la decisión cuesta menos.
            </p>
          </div>
          <div className="rounded-[var(--app-radius-card)] border border-slate-800 bg-slate-900 p-8 text-white shadow-[var(--app-shadow-soft)] dark:bg-slate-800">
            <Icons.Shield className="h-8 w-8 text-brand" />
            <h3 className="mt-4 app-title-4 text-white">Información real, mejores decisiones</h3>
            <p className="mt-4 app-body-sm text-slate-100">
              Completar verificaciones mejora tu aviso porque la otra persona entiende más rápido qué está viendo y qué ya fue revisado.
            </p>
            <button className="app-button-base mt-4 justify-start px-0 text-sm text-brand hover:underline">
              Ver guía para anfitriones
              <Icons.ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
