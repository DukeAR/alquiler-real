import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { Booking } from '../types';
import { cn } from '../lib/utils';
import { showToast } from '../lib/toast';
import { acceptContract, cancelBooking, confirmArrival, payProtectedDeposit, reportArrivalProblem } from '../services/geminiService';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { LoadingState } from './LoadingState';
import { formatBookingDateOnly, formatBookingDateTime, getCancellationDeadlineFromStartDate, isBookingCheckInReached } from '../lib/bookingDates';
import { useUserReservations } from '../hooks/useUserReservations';
import { getReservationFlowCopy, getReservationFlowMilestones, type ReservationFlowMilestoneKey, type ReservationFlowMilestoneState } from '../lib/reservationFlow';

export const MyBookings = () => {
  const navigate = useNavigate();
  const { reservations: bookings, setReservations: setBookings, loading, error: loadError, reload: fetchBookings } = useUserReservations();
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [processingBookingAction, setProcessingBookingAction] = useState<{ bookingId: string; action: 'pay-deposit' | 'confirm-arrival' | 'report-arrival-problem' } | null>(null);

  const handleAcceptContract = async (bookingId: string) => {
    setAccepting(true);

    try {
      await acceptContract(bookingId);
      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId ? { ...booking, contractAccepted: true } : booking,
        ),
      );
      setSelectedContract((currentContract: any) =>
        currentContract && currentContract.id === bookingId
          ? { ...currentContract, accepted: true }
          : currentContract,
      );
      showToast('Condiciones aceptadas', 'Ya registramos la aceptación y quedó asociada a tu reserva.', 'success');
    } catch (err) {
      showToast('Condiciones', 'No pudimos registrar la aceptación. Intentá de nuevo.', 'error');
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    return formatBookingDateOnly(dateStr);
  };

  const formatCurrency = (value?: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
  };

  const getCancellationDeadline = (booking: Booking) => {
    if (booking.cancellationDeadline) {
      const parsed = new Date(booking.cancellationDeadline);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return getCancellationDeadlineFromStartDate(booking.startDate);
  };

  const getCancellationDeadlineLabel = (booking: Booking) => {
    return formatBookingDateTime(getCancellationDeadline(booking));
  };

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

  const handleCancelBooking = async (booking: Booking) => {
    const cancellationDeadlineLabel = getCancellationDeadlineLabel(booking);
    const confirmMessage = booking.requestMode === 'protected'
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
      const nextBooking = response.booking;

      setBookings((currentBookings) =>
        currentBookings.map((currentBooking) =>
          currentBooking.id === booking.id ? { ...currentBooking, ...nextBooking } : currentBooking,
        ),
      );

      showToast('Reserva cancelada', 'La reserva se canceló y las fechas volvieron a quedar disponibles.', 'success');
    } catch (err) {
      showToast('Reserva', err instanceof Error ? err.message : 'No pudimos cancelar la reserva. Intentá de nuevo.', 'error');
    } finally {
      setCancelingBookingId(null);
    }
  };

  const getBookingFlow = (booking: Booking) => getReservationFlowCopy({
    mode: booking.requestMode,
    requestStatus: booking.requestMode === 'protected'
      ? booking.depositStatus === 'held' || booking.depositStatus === 'released' || booking.status === 'confirmed'
        ? 'accepted'
        : 'pending'
      : undefined,
    bookingStatus: booking.status,
    depositStatus: booking.depositStatus,
    cancellationActor: booking.cancellationActor,
    viewerRole: 'guest',
  });

  const getBookingMilestones = (booking: Booking) => getReservationFlowMilestones({
    mode: booking.requestMode,
    requestStatus: booking.requestMode === 'protected'
      ? booking.depositStatus === 'held' || booking.depositStatus === 'released' || booking.status === 'confirmed'
        ? 'accepted'
        : 'pending'
      : undefined,
    bookingStatus: booking.status,
    depositStatus: booking.depositStatus,
    cancellationActor: booking.cancellationActor,
    viewerRole: 'guest',
  });

  const getFlowMilestoneIcon = (key: ReservationFlowMilestoneKey, mode?: Booking['requestMode']) => {
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

    return 'border-slate-200 bg-white/80 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400';
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

  const updateBookingState = (nextBooking: Booking) => {
    setBookings((currentBookings) =>
      currentBookings.map((currentBooking) =>
        currentBooking.id === nextBooking.id ? { ...currentBooking, ...nextBooking } : currentBooking,
      ),
    );
  };

  const handlePayDeposit = async (bookingId: string) => {
    setProcessingBookingAction({ bookingId, action: 'pay-deposit' });

    try {
      const nextBooking = await payProtectedDeposit(bookingId);
      updateBookingState(nextBooking);
      showToast('Seña en custodia', 'La seña ya quedó resguardada en la plataforma hasta que confirmes la llegada.', 'success');
    } catch (err) {
      showToast('Seña', err instanceof Error ? err.message : 'No pudimos registrar el pago de la seña.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const handleConfirmProtectedArrival = async (bookingId: string) => {
    setProcessingBookingAction({ bookingId, action: 'confirm-arrival' });

    try {
      const nextBooking = await confirmArrival(bookingId);
      updateBookingState(nextBooking);
      showToast('Seña liberada', 'La llegada quedó confirmada y la seña pasó a liberación.', 'success');
    } catch (err) {
      showToast('Llegada', err instanceof Error ? err.message : 'No pudimos confirmar la llegada.', 'error');
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
    } catch (err) {
      showToast('Problema', err instanceof Error ? err.message : 'No pudimos registrar el problema. Intentá de nuevo.', 'error');
    } finally {
      setProcessingBookingAction(null);
    }
  };

  const getStatusColor = (booking: Booking) => {
    const flow = getBookingFlow(booking);

    if (flow.stage === 'host-cancelled') {
      return 'danger';
    }

    if (flow.stage === 'guest-cancelled' || flow.stage === 'protected-deposit-review' || flow.stage === 'protected-no-show-pending') {
      return 'warning';
    }

    if (flow.stage === 'request-accepted' || flow.stage === 'protected-deposit-held') {
      return 'brand';
    }

    if (flow.stage === 'protected-deposit-released' || flow.stage === 'reservation-confirmed') {
      return 'success';
    }

    switch (booking.status) {
      case 'confirmed': return 'brand';
      case 'pending': return 'neutral';
      case 'cancelled': return 'neutral';
      case 'completed': return 'success';
      default: return 'neutral';
    }
  };

  const getStatusText = (booking: Booking) => {
    const flow = getBookingFlow(booking);

    if (flow.statusLabel) {
      return flow.statusLabel;
    }

    switch (booking.status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Finalizada';
      default: return booking.status;
    }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="p-4 flex items-center gap-4 max-w-2xl mx-auto">
          <button onClick={() => navigate('/profile')} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-brand/10 hover:text-brand transition-all" type="button">
            <Icons.ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-black text-xl uppercase tracking-tight">Mis reservas</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-8">
        {bookings.length === 0 ? (
          <EmptyState
            eyebrow="Reservas"
            tone="soft"
            icon={<Icons.Calendar className="h-12 w-12 text-brand" />}
            title="Todavía no tenés reservas"
            description="Cuando reserves una propiedad, acá vas a ver fechas, estado y condiciones de la estadía."
            action={{
              label: 'Explorá propiedades',
              onClick: () => navigate('/'),
            }}
          />
        ) : (
          bookings.map((booking) => {
            const cancellationDeadlineLabel = getCancellationDeadlineLabel(booking);
            const isCancelable = canCancelBooking(booking);
            const bookingFlow = getBookingFlow(booking);
            const bookingMilestones = getBookingMilestones(booking);
            const showReservationFlowPanel = Boolean(booking.requestMode && bookingFlow.stage && bookingFlow.stage !== 'reservation-confirmed');
            const isPayingDeposit = processingBookingAction?.bookingId === booking.id && processingBookingAction.action === 'pay-deposit';
            const isConfirmingArrival = processingBookingAction?.bookingId === booking.id && processingBookingAction.action === 'confirm-arrival';
            const isReportingArrivalProblem = processingBookingAction?.bookingId === booking.id && processingBookingAction.action === 'report-arrival-problem';
            const arrivalActionsAvailable = isBookingCheckInReached(booking.startDate);

            return (
            <div
              key={booking.id}
              className="group bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 hover:border-brand/30 transition-all"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={booking.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'}
                  alt={booking.propertyTitle}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4">
                  <Badge
                    variant={getStatusColor(booking) as 'neutral' | 'brand' | 'success' | 'warning' | 'danger'}
                    size="md"
                    className="shadow-lg"
                  >
                    {getStatusText(booking)}
                  </Badge>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="font-black text-white text-xl uppercase tracking-tight leading-none">{booking.propertyTitle || 'Propiedad'}</h3>
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">{booking.location}</p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estadía</p>
                    <div className="flex items-center gap-3">
                      <Icons.Calendar className="w-4 h-4 text-brand" />
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                        {formatDate(booking.startDate)} <span className="text-slate-300 font-normal">→</span> {formatDate(booking.endDate)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Huéspedes</p>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">{booking.guests || 1}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo total</p>
                     <p className="text-2xl font-black text-brand tracking-tighter">{formatCurrency(booking.totalPrice)}</p>
                   </div>
                   <div className="flex gap-2">
                     {booking.contractJson && (
                        <button
                          type="button"
                          onClick={() => setSelectedContract({ ...JSON.parse(booking.contractJson!), id: booking.id, accepted: booking.contractAccepted })}
                          className={cn(
                            "px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2",
                            booking.contractAccepted 
                              ? "bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light border border-brand/15 dark:border-brand/20"
                              : "bg-brand/10 text-brand hover:bg-brand hover:text-white"
                          )}
                        >
                          <Icons.FileText className="w-4 h-4" />
                          {booking.contractAccepted ? 'Firmado' : 'Ver condiciones'}
                        </button>
                     )}
                     {isCancelable && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleCancelBooking(booking)}
                          loading={cancelingBookingId === booking.id}
                          loadingLabel="Cancelando..."
                          className="rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest"
                        >
                          <>
                            <Icons.X className="w-4 h-4" />
                            Cancelar reserva
                          </>
                        </Button>
                     )}
                   </div>
                </div>

                {(booking.status === 'pending' || booking.status === 'confirmed') && booking.startDate && bookingFlow.stage !== 'protected-deposit-review' && bookingFlow.stage !== 'protected-no-show-pending' ? (
                  <div className={cn(
                    'rounded-2xl border px-4 py-3 text-xs font-semibold leading-5',
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
                  <div className="rounded-[28px] border border-brand/15 bg-brand/5 p-4 dark:border-brand/20 dark:bg-brand/10">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">{bookingFlow.statusLabel}</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{bookingFlow.description}</p>
                          {bookingFlow.supportText ? <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{bookingFlow.supportText}</p> : null}
                          {bookingFlow.trackingHint ? <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{bookingFlow.trackingHint}</p> : null}
                        </div>

                        {bookingFlow.stage === 'request-accepted' ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handlePayDeposit(booking.id)}
                            loading={isPayingDeposit}
                            loadingLabel="Registrando pago..."
                            className="rounded-2xl"
                          >
                            <>
                              <Icons.ShieldCheck className="w-4 h-4" />
                              Pagar seña
                            </>
                          </Button>
                        ) : null}

                        {bookingFlow.stage === 'protected-deposit-held' && arrivalActionsAvailable ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleConfirmProtectedArrival(booking.id)}
                            loading={isConfirmingArrival}
                            loadingLabel="Confirmando llegada..."
                            className="rounded-2xl"
                          >
                            <>
                              <Icons.CheckCircle2 className="w-4 h-4" />
                              Confirmar llegada
                            </>
                          </Button>
                        ) : null}

                        {bookingFlow.stage === 'protected-deposit-held' && arrivalActionsAvailable ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleReportProtectedArrivalProblem(booking.id)}
                            loading={isReportingArrivalProblem}
                            loadingLabel="Informando problema..."
                            className="rounded-2xl"
                          >
                            <>
                              <Icons.AlertTriangle className="w-4 h-4" />
                              Reportar problema
                            </>
                          </Button>
                        ) : null}

                        {bookingFlow.stage === 'protected-deposit-held' && !arrivalActionsAvailable ? (
                          <div className="rounded-2xl bg-white/80 px-3 py-3 text-xs font-medium text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
                            Confirmar llegada y reportar un problema se habilitan el día del ingreso.
                          </div>
                        ) : null}
                      </div>

                      {bookingMilestones.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {bookingMilestones.map((milestone) => {
                            const MilestoneIcon = getFlowMilestoneIcon(milestone.key, booking.requestMode);

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
                          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{bookingFlow.nextStepLabel ?? 'Solo coordinar por chat'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {(bookingFlow.stage === 'reservation-confirmed' || (!booking.requestMode && booking.status === 'confirmed')) && (
                  <div className="rounded-2xl border border-brand/10 bg-brand/5 p-4 dark:border-brand/20 dark:bg-brand/10">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Icons.CheckCircle2 className="w-5 h-5 text-brand" />
                        <div>
                          <p className="text-[10px] font-black text-brand dark:text-brand-light uppercase tracking-widest">Datos para el ingreso</p>
                          <p className="text-xs font-bold text-slate-700/80 dark:text-slate-300/80">Código de ingreso: {booking.stay_code}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-3 rounded-2xl border border-white/80 bg-white/80 px-3 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                      <Icons.Calendar className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <p className="leading-5">Próximo paso: coordiná horario de llegada con el anfitrión.</p>
                    </div>
                  </div>
                )}

                {booking.status === 'cancelled' && !showReservationFlowPanel && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    <Icons.AlertTriangle className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Reserva cancelada</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Las fechas se liberaron y ya no hay ingreso asociado a esta estadía.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
          })
        )}
      </main>

      {/* Contract Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/40">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-2xl font-black uppercase tracking-tight">Condiciones de la reserva</h2>
              <button type="button" onClick={() => setSelectedContract(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <Icons.X className="w-6 h-6" />
                 </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8 no-scrollbar">
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Huésped</p>
                          <p className="text-sm font-black truncate">{selectedContract.guestName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anfitrión</p>
                          <p className="text-sm font-black truncate">{selectedContract.hostName}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Propiedad</p>
                       <p className="text-sm font-black uppercase tracking-tight">{selectedContract.propertyTitle}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedContract.location}</p>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[32px] border border-slate-100 dark:border-slate-800/50 space-y-4">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condiciones de la estadía</p>
                       <ul className="space-y-3">
                          {(selectedContract.rules || []).map((rule: string, i: number) => (
                             <li key={i} className="flex gap-3 text-xs font-bold leading-relaxed text-slate-600 dark:text-slate-400">
                                <Icons.Check className="w-4 h-4 text-slate-400 shrink-0" />
                                {rule}
                             </li>
                          ))}
                       </ul>
                    </div>

                    <div className="space-y-4 opacity-50">
                       <p className="text-[10px] font-bold text-center text-slate-400 leading-relaxed uppercase tracking-tighter">
                            Al aceptar, confirmás que leíste las condiciones. Antes de transferir dinero, revisá la identidad y los datos de la reserva.
                       </p>
                    </div>
                 </div>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                 {!selectedContract.accepted ? (
                    <Button
                      onClick={() => void handleAcceptContract(selectedContract.id)}
                      loading={accepting}
                      loadingLabel="Confirmando condiciones..."
                      fullWidth
                      size="lg"
                      className="h-16 rounded-[32px] text-lg font-black uppercase tracking-widest shadow-2xl shadow-brand/20"
                    >
                      <>
                        <Icons.ShieldCheck className="w-6 h-6" />
                        Aceptar condiciones
                      </>
                    </Button>
                 ) : (
                    <div className="w-full py-6 bg-brand text-white rounded-[32px] font-black text-lg tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-brand/20">
                       <Icons.CheckCircle2 className="w-6 h-6" />
                        Condiciones aceptadas
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
