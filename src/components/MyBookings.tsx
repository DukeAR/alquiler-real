import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { Booking } from '../types';
import { cn } from '../lib/utils';
import { showToast } from '../lib/toast';
import { acceptContract, cancelBooking } from '../services/geminiService';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { LoadingState } from './LoadingState';
import { formatBookingDateOnly, formatBookingDateTime, getCancellationDeadlineFromStartDate } from '../lib/bookingDates';
import { useUserReservations } from '../hooks/useUserReservations';

export const MyBookings = () => {
  const navigate = useNavigate();
  const { reservations: bookings, setReservations: setBookings, loading, error: loadError, reload: fetchBookings } = useUserReservations();
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);

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

    const cancellationDeadline = getCancellationDeadline(booking);
    if (!cancellationDeadline) {
      return false;
    }

    return Date.now() < cancellationDeadline.getTime();
  };

  const handleCancelBooking = async (booking: Booking) => {
    const cancellationDeadlineLabel = getCancellationDeadlineLabel(booking);
    const confirmMessage = cancellationDeadlineLabel
      ? `¿Querés cancelar esta reserva? Podés hacerlo hasta el ${cancellationDeadlineLabel} y, si seguís, las fechas van a volver a quedar disponibles.`
      : '¿Querés cancelar esta reserva? Solo se puede cancelar hasta 24 horas antes del ingreso y, si seguís, las fechas van a volver a quedar disponibles.';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      case 'completed': return 'brand';
      default: return 'neutral';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Finalizada';
      default: return status;
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
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
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
                    variant={getStatusColor(booking.status) as 'neutral' | 'brand' | 'success' | 'warning' | 'danger'}
                    size="md"
                    className="shadow-lg"
                  >
                    {getStatusText(booking.status)}
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
                              ? "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30"
                              : "bg-brand/10 text-brand hover:bg-brand hover:text-white"
                          )}
                        >
                          <Icons.FileText className="w-4 h-4" />
                          {booking.contractAccepted ? 'Firmado' : 'Ver acuerdo'}
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

                {(booking.status === 'pending' || booking.status === 'confirmed') && booking.startDate ? (
                  <div className={cn(
                    'rounded-2xl border px-4 py-3 text-xs font-semibold leading-5',
                    isCancelable
                      ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300',
                  )}>
                    {isCancelable && cancellationDeadlineLabel
                      ? `Podés cancelarla desde la app hasta el ${cancellationDeadlineLabel}.`
                      : cancellationDeadlineLabel
                        ? `La cancelación online estuvo disponible hasta el ${cancellationDeadlineLabel}. Si necesitás ayuda, escribile al anfitrión cuanto antes.`
                        : 'Ya no está dentro del plazo para cancelarla online. Si necesitás ayuda, escribile al anfitrión cuanto antes.'}
                  </div>
                ) : null}

                {booking.status === 'confirmed' && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icons.CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Datos para el ingreso</p>
                        <p className="text-xs font-bold text-emerald-900/60 dark:text-emerald-300/60">Código de ingreso: {booking.stay_code}</p>
                      </div>
                    </div>
                  </div>
                )}

                {booking.status === 'cancelled' && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 flex items-center gap-3">
                    <Icons.AlertTriangle className="w-5 h-5 text-rose-500" />
                    <div>
                      <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Reserva cancelada</p>
                      <p className="text-xs font-bold text-rose-900/60 dark:text-rose-300/60">Las fechas se liberaron y ya no hay ingreso asociado a esta estadía.</p>
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
                    <div className="grid grid-cols-2 gap-4">
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
                                <Icons.Check className="w-4 h-4 text-emerald-500 shrink-0" />
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
                    <div className="w-full py-6 bg-emerald-500 text-white rounded-[32px] font-black text-lg tracking-widest uppercase flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20">
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
