import React, { useEffect, useState } from 'react';
import { apiJson } from '../lib/apiConfig';
import { formatGuestMemberSinceYear, getGuestSnapshotDetail, getGuestSnapshotTitle, resolveGuestRequestProfile } from '../lib/guestRequestProfile';
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

interface HostDashboardProps {
  onBack: () => void;
}

const dashboardCardClass = 'app-card p-6 dark:border-slate-800 dark:bg-slate-900';
const dashboardSectionClass = 'app-card p-6 md:p-8 space-y-6 dark:border-slate-800 dark:bg-slate-900';
const dashboardMutedTileClass = 'rounded-[var(--app-radius-control)] border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50';

const getHostVerificationStatusText = (status: 'complete' | 'pending') => (
  status === 'complete' ? 'Ya está completa.' : 'Todavía falta completarla.'
);

const getBookingStatusLabel = (status: string) => {
  if (status === 'pending') return 'Solicitud pendiente';
  if (status === 'confirmed') return 'Reserva confirmada';
  if (status === 'completed') return 'Estadía finalizada';
  return 'Estado no disponible';
};

const getBookingStatusClassName = (status: string) => {
  if (status === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300';
  }

  if (status === 'confirmed') {
    return 'border-brand/20 bg-brand/10 text-brand dark:border-brand/25 dark:bg-brand/15 dark:text-brand-light';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300';
};

export const HostDashboard: React.FC<HostDashboardProps> = ({ onBack }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState<any>(null);
  const [availabilityPropertyId, setAvailabilityPropertyId] = useState<string | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12">
          <div className="max-w-5xl mx-auto px-4 mb-6">
            <Button variant="ghost" onClick={() => setIsAddingProperty(false)} className="rounded-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400">
              <Icons.ArrowLeft className="w-4 h-4" /> Cancelar
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

  const contactedGuests = Array.isArray(dashboardData?.contactedGuests)
    ? dashboardData.contactedGuests.map((guest: any, index: number) => ({
        ...guest,
        guestProfile: resolveGuestRequestProfile(guest, index),
      }))
    : [];
  const hostProperties = Array.isArray(dashboardData?.properties) ? dashboardData.properties : [];
  const recentBookings = Array.isArray(dashboardData?.recentBookings)
    ? dashboardData.recentBookings.map((booking: any, index: number) => ({
        ...booking,
        guestProfile: resolveGuestRequestProfile(booking, index),
      }))
    : [];


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="app-button-base rounded-full px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-brand dark:hover:bg-slate-800"
          >
            <Icons.ArrowLeft className="w-4 h-4" />
            Volver a explorar
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="app-title-4 dark:text-white">Panel de anfitrión</p>
              <p className="app-eyebrow">Tu actividad</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Icons.User className="w-5 h-5 text-brand" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={dashboardCardClass}>
            <p className="app-eyebrow mb-1">Calificación</p>
            <div className="flex items-center gap-2">
              <Icons.Star className="w-6 h-6 text-brand fill-current" />
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
          <div className="bg-gradient-to-br from-brand to-brand-dark p-6 rounded-[32px] shadow-lg shadow-brand/20 text-white">
            <p className="app-eyebrow text-white/60 mb-1">Ingresos estimados</p>
            <p className="text-3xl font-semibold">${Math.floor(dashboardData.estimatedIncome || 0).toLocaleString()}</p>
          </div>
        </section>

        {/* Circular Progress & Trust Card */}
        <section className={cn(dashboardSectionClass, 'overflow-hidden relative')}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
             <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
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
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-brand"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">{dashboardData.stats?.trust_score || 0}</span>
                  <span className="app-eyebrow">Confianza</span>
                </div>
             </div>
             
             <div className="flex-1 space-y-2">
               <h3 className="app-title-4 dark:text-white">Cómo te ven</h3>
               <p className="app-body-sm app-text-muted">Hoy tu perfil figura como <span className="text-brand font-semibold">{dashboardData.stats?.badge || 'Usuario nuevo'}</span>. Un mejor historial y avisos más completos ayudan a recibir consultas más directas.</p>
                <div className="flex flex-wrap gap-2 pt-2">
                   <div className={cn(dashboardMutedTileClass, 'px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400')}>
                     <span className="text-brand mr-1">Calificación:</span> {dashboardData.stats?.host_rating || 5.0}
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
                        <span className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                          item.status === 'complete'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
                        )} aria-hidden="true">
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

        {/* Mis Propiedades Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="app-title-4 dark:text-white flex items-center gap-2">
              <Icons.Home className="w-5 h-5 text-brand" />
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
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img src={prop.imageUrl || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200'} className="w-full h-full object-cover" />
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
                        'px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em]',
                        prop.status === 'active'
                          ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      )}>
                      {prop.status === 'active' ? 'Activo' : 'Pausado'}
                    </button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setAvailabilityPropertyId((currentValue) => currentValue === prop.id ? null : prop.id)}
                      className="rounded-full"
                    >
                      <>
                        <Icons.Calendar className="w-4 h-4" />
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


        {/* Risk Dashboard Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="app-title-4 dark:text-white flex items-center gap-2">
              <Icons.ShieldAlert className="w-5 h-5 text-brand" />
              Contexto del huésped
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className={dashboardSectionClass}>
              <div className="flex items-center justify-between">
                <h3 className="app-title-4 dark:text-white">Huéspedes con actividad reciente</h3>
                <span className="app-eyebrow">Recientes</span>
              </div>
              <div className="space-y-3">
                {contactedGuests.length > 0 ? contactedGuests.map((tenant: any) => (
                  <div key={tenant.id || tenant.name} className={cn(dashboardMutedTileClass, 'flex items-center justify-between p-3')}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold uppercase">
                        {String(tenant.name || 'H').slice(0, 1)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{tenant.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Usuario desde {formatGuestMemberSinceYear(tenant.guestProfile.memberSince)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="app-eyebrow leading-none">{getGuestSnapshotTitle(tenant.guestProfile)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{getGuestSnapshotDetail(tenant.guestProfile)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Todavía no hay huéspedes recientes para mostrar.</p>
                )}
              </div>
            </div>

            <div className="rounded-[var(--app-radius-card)] bg-slate-900 dark:bg-slate-800 p-8 text-white space-y-4 flex flex-col justify-center shadow-[var(--app-shadow-soft)]">
              <div className="w-12 h-12 bg-brand/20 rounded-2xl flex items-center justify-center mb-2">
                <Icons.Zap className="w-6 h-6 text-brand" />
              </div>
              <h3 className="app-title-4 text-white">Más contexto antes de aceptar</h3>
              <p className="app-body-sm text-slate-100">
                Abrí la ficha del huésped para revisar identidad, historial, reseñas y señales simples dentro de la plataforma antes de responder o aceptar.
              </p>
              <div className="pt-4">
                <div className="flex items-center gap-2 app-eyebrow text-emerald-300">
                  <span aria-hidden="true">✔</span> Información simple, sin puntajes ocultos
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tenant Management Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="app-title-4 dark:text-white flex items-center gap-2">
                <Icons.UserCheck className="w-5 h-5 text-brand" />
                Solicitudes y huéspedes
              </h2>
              <p className="app-body-sm app-text-muted">Antes de aceptar una reserva, podés abrir la ficha del huésped y revisar información simple de la plataforma.</p>
            </div>
          </div>

          <div className="app-card overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <p className="app-eyebrow">Solicitudes y estadías recientes</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking: any) => {
                  const isExpanded = expandedBookingId === booking.id;
                  const canReviewBooking = booking.status === 'completed';

                  return (
                    <div key={booking.id} className="p-6 space-y-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <Icons.User className="w-6 h-6 text-slate-400" />
                          </div>
                          <div>
                            <p className="app-title-4 dark:text-white">{booking.userName || 'Huésped'}</p>
                            <p className="app-body-sm app-text-muted">{booking.propertyTitle} • {booking.date}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          <span className={cn('inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]', getBookingStatusClassName(booking.status))}>
                            {getBookingStatusLabel(booking.status)}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setExpandedBookingId((currentValue) => currentValue === booking.id ? null : booking.id)}
                              className="rounded-full"
                            >
                              {isExpanded ? 'Ocultar ficha' : 'Ver ficha del huésped'}
                            </Button>
                            {canReviewBooking ? (
                              <button
                                onClick={() => setReviewingBooking(booking)}
                                className="app-button-base rounded-[var(--app-radius-control)] bg-brand px-4 py-2 text-sm text-white hover:-translate-y-px hover:bg-brand-dark hover:shadow-[var(--app-shadow-brand)]"
                              >
                                Evaluar huésped
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {isExpanded ? (
                        <GuestRequestProfileCard guestName={booking.userName || 'Huésped'} profile={booking.guestProfile} />
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="p-8 text-center app-body-sm app-text-muted">Todavía no hay solicitudes o estadías para revisar.</p>
              )}
            </div>
          </div>
          <p className="app-form-hint italic px-4">
            * La ficha del huésped ordena la información disponible dentro de la plataforma. Las evaluaciones solo se habilitan después de una estadía finalizada.
          </p>
        </section>

        {/* Review Modal Integration */}
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

        {/* Tips / Education */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="app-card border-brand/10 bg-brand/5 p-8 space-y-4 dark:border-brand/20 dark:bg-brand/10">
            <Icons.Lightbulb className="w-8 h-8 text-brand" />
            <h3 className="app-title-4 text-slate-950 dark:text-slate-50">¿Por qué conviene verificar mejor?</h3>
            <p className="app-body-sm text-slate-700 dark:text-slate-300">
              Cuando el aviso deja claro quién publica, dónde está el lugar y qué ya fue comprobado, la decisión cuesta menos.
            </p>
          </div>
          <div className="rounded-[var(--app-radius-card)] border border-slate-800 bg-slate-900 dark:bg-slate-800 p-8 text-white space-y-4 shadow-[var(--app-shadow-soft)]">
            <Icons.Shield className="w-8 h-8 text-brand" />
            <h3 className="app-title-4 text-white">Información real, mejores decisiones</h3>
            <p className="app-body-sm text-slate-100">
              Completar verificaciones mejora tu aviso porque la otra persona entiende más rápido qué está viendo y qué ya fue revisado.
            </p>
            <button className="app-button-base justify-start px-0 text-sm text-brand hover:underline">
              Ver guía para anfitriones
              <Icons.ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
