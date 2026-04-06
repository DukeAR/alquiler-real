import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserPreferences, type UserPreferences } from '../hooks/useUserPreferences';
import { useUserProfile, type ValidationChecks } from '../hooks/useUserProfile';
import { VALID_ZONES } from '../lib/constants';
import { showToast } from '../lib/toast';
import { cn } from '../lib/utils';
import { Icons } from './Icons';
import { ProfileSkeleton } from './ProfileSkeleton';
import { ReportModal } from './ReportModal';
import { ValidationBadge } from './ValidationBadge';
import { DocumentVerificationModal } from './verification/DocumentVerificationModal';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { NoticeBanner } from './ui/NoticeBanner';
import { PageHeader } from './ui/PageHeader';
import { SectionTitle } from './ui/SectionTitle';

type ReviewTab = 'received' | 'written';

type VerificationLevel = 'basic' | 'verified' | 'premium';

const profilePanelClass = 'rounded-[var(--app-radius-control)] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50';
const actionRowBaseClass = 'flex w-full items-center justify-between gap-4 rounded-[var(--app-radius-control)] border p-4 text-left shadow-[var(--app-shadow-subtle)] transition-[transform,box-shadow,border-color,background-color] hover:-translate-y-px hover:shadow-[var(--app-shadow-soft)]';

const interestOptions = [
  '🏖️ Playa y Mar',
  '🎣 Pesca',
  '🏇 Caballos',
  '🏍️ Cuatriciclos',
  '👨‍👩‍👧‍👦 Familia',
  '🎵 Recitales',
  '🍲 Gastronomía',
  '📸 Fotografía',
  '🏃 Deportes',
  '📚 Lectura',
  '🎨 Arte',
  '🌿 Naturaleza',
];

const propertyTypeOptions = ['Casa', 'Departamento', 'Cabaña'];

const parseInterests = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }

  return [];
};

const formatMonthYear = (value?: string) => {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date);
};

const formatShortDate = (value?: string) => {
  if (!value) {
    return 'Sin registro';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Sin registro';
  }

  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const formatPriceLabel = (value?: number | string | null) => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!numeric || Number.isNaN(numeric)) {
    return 'Sin definir';
  }

  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(numeric);
};

const normalizeRating = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }

  return numeric;
};

const toVerificationLevel = (value?: string): VerificationLevel => {
  const normalized = value?.toUpperCase();

  if (normalized === 'PREMIUM') {
    return 'premium';
  }

  if (normalized === 'VERIFICADO' || normalized === 'VERIFIED_DNI') {
    return 'verified';
  }

  return 'basic';
};

const buildVerificationChecks = (checks?: ValidationChecks, isHost?: boolean) => {
  if (!checks) {
    return [] as Array<{ label: string; done: boolean }>;
  }

  const items = [
    { label: 'DNI frente cargado', done: checks.dniFrontUploaded },
    { label: 'DNI dorso cargado', done: checks.dniBackUploaded },
    { label: 'Selfie con DNI', done: checks.selfieUploaded },
    { label: 'Identidad validada', done: checks.dniVerified },
  ];

  if (isHost && typeof checks.utilityBillUploaded === 'boolean') {
    items.push({ label: 'Comprobante de domicilio', done: checks.utilityBillUploaded });
  }

  return items;
};

export const ProfileViewNew = () => {
  const navigate = useNavigate();
  const { user, logout, refresh, updateProfile } = useAuth();
  const {
    validationData,
    activity,
    reviews,
    loading: profileDataLoading,
    reload: reloadProfileData,
  } = useUserProfile();
  const {
    preferences,
    loading: preferencesLoading,
    savePreferences,
  } = useUserPreferences();
  const [showVerification, setShowVerification] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [reviewTab, setReviewTab] = useState<ReviewTab>('received');
  const [showReportModal, setShowReportModal] = useState(false);

  const loadingProfile = profileDataLoading || preferencesLoading;

  const handleSaveInterests = async (interests: string[], bio: string) => {
    try {
      const success = await updateProfile({ interests, bio });

      if (!success) {
        throw new Error('No pudimos actualizar tu perfil.');
      }

      setShowInterestsModal(false);
      showToast('Perfil', 'Actualizamos tus intereses y tu presentación.', 'success');
    } catch (error) {
      console.error('Error saving interests:', error);
      showToast('Perfil', 'No pudimos actualizar tu perfil. Intentá de nuevo.', 'error');
      throw error;
    }
  };

  const handleSavePreferences = async (nextPreferences: UserPreferences) => {
    try {
      const success = await savePreferences(nextPreferences);

      if (!success) {
        throw new Error('No pudimos guardar tus preferencias.');
      }

      setShowPreferencesModal(false);
      showToast('Perfil', 'Actualizamos tus preferencias para explorar.', 'success');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast('Perfil', 'No pudimos guardar tus preferencias. Intentá de nuevo.', 'error');
      throw error;
    }
  };

  if (!user) {
    return null;
  }

  const userInterests = parseInterests(user.interests);
  const memberSinceLabel = formatMonthYear(user.memberSince ?? user.createdAt);
  const verificationChecks = buildVerificationChecks(validationData?.checks, user.role === 'host');
  const completedChecks = verificationChecks.filter((item) => item.done).length;
  const progressPercent = Math.round(
    typeof validationData?.progress === 'number'
      ? validationData.progress
      : verificationChecks.length > 0
        ? (completedChecks / verificationChecks.length) * 100
        : 0,
  );
  const currentReviews = reviewTab === 'received' ? reviews.received : reviews.written;
  const reviewCountLabel = currentReviews.length === 1 ? '1 reseña' : `${currentReviews.length} reseñas`;
  const ratingValue = normalizeRating(user.role === 'host' ? user.hostRating : user.rating);
  const riskScore = normalizeRating(user.riskScore);
  const validationLevel = validationData?.level ?? 'BASICO';
  const preferencesSummary = [
    {
      label: 'Zona preferida',
      value: preferences?.preferred_zone || (user as { zone?: string }).zone || 'Sin preferencia',
    },
    {
      label: 'Presupuesto máximo',
      value: formatPriceLabel(preferences?.max_price),
    },
    {
      label: 'Tipo de propiedad',
      value: preferences?.preferred_property_type || 'Cualquiera',
    },
  ];
  const missingRequirementsText = validationData?.missingRequirements?.length
    ? validationData.missingRequirements.slice(0, 3).join(' · ')
    : null;

  const verificationPayload = {
    level: toVerificationLevel(validationData?.level),
    dniFront: null,
    dniBack: null,
    selfie: null,
    proofOfAddress: null,
    submittedAt: null,
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <PageHeader
        onBack={() => navigate('/')}
        eyebrow="Perfil"
        heading="Mi perfil"
        description="Todo lo importante de tu cuenta, en un solo lugar."
        action={
          <Button type="button" variant="secondary" onClick={() => navigate('/edit-profile')} className="hidden sm:inline-flex">
            <Icons.User className="h-4 w-4" />
            Editar perfil
          </Button>
        }
        contentClassName="app-page items-center"
      />

      {loadingProfile ? (
        <ProfileSkeleton />
      ) : (
        <main className="app-page py-8 md:py-10">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
            <aside className="space-y-6">
              <Card variant="elevated" padding="lg" className="space-y-6 border-slate-200/80 bg-white/96 shadow-[0_24px_60px_-38px_rgba(15,23,42,0.32)]">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="h-28 w-28 rounded-full bg-gradient-to-br from-brand via-brand-light to-emerald-400 p-[3px] shadow-[var(--app-shadow-brand)]">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white dark:bg-slate-900">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || 'default'}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                          alt={`Avatar de ${user.name}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 rounded-full border border-slate-200 bg-white p-1 shadow-[var(--app-shadow-subtle)] dark:border-slate-700 dark:bg-slate-900">
                      <ValidationBadge level={validationLevel} size="md" />
                    </div>
                  </div>

                  <SectionTitle
                    eyebrow="Tu cuenta"
                    heading={user.name}
                    description={`Miembro desde ${memberSinceLabel}`}
                    as="h2"
                    visualLevel="h3"
                    className="max-w-sm"
                  />

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="brand" size="md">
                      <Icons.UserCheck className="h-3.5 w-3.5" />
                      {user.role === 'host' ? 'Anfitrión' : 'Huésped'}
                    </Badge>
                    {(user as { zone?: string }).zone ? (
                      <Badge variant="neutral" size="md">
                        <Icons.MapPin className="h-3.5 w-3.5 text-brand" />
                        {(user as { zone?: string }).zone}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className={profilePanelClass}>
                    <p className="app-form-label">Email</p>
                    <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{user.email}</p>
                  </div>
                  <div className={profilePanelClass}>
                    <p className="app-form-label">Teléfono</p>
                    <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{user.phone || 'Todavía no lo agregaste'}</p>
                  </div>
                </div>

                <Button type="button" variant="secondary" fullWidth className="sm:hidden" onClick={() => navigate('/edit-profile')}>
                  <Icons.User className="h-4 w-4" />
                  Editar perfil
                </Button>
              </Card>

              <Card padding="lg" className="space-y-5 dark:border-slate-800 dark:bg-slate-900">
                <SectionTitle
                  eyebrow="Accesos rápidos"
                  heading="Resolvé lo básico"
                  description="Entrá a tus datos, tu actividad y lo que necesitás revisar sin dar vueltas."
                  as="h2"
                  visualLevel="h4"
                />

                <div className="space-y-3">
                  <ActionRow
                    icon={<Icons.User className="h-5 w-5" />}
                    label="Editar perfil"
                    description="Actualizá tu nombre y tu zona preferida."
                    onClick={() => navigate('/edit-profile')}
                  />
                  <ActionRow
                    icon={<Icons.Lock className="h-5 w-5" />}
                    label="Cambiar contraseña"
                    description="Mantené tu acceso seguro con una clave nueva."
                    onClick={() => navigate('/change-password')}
                  />
                  <ActionRow
                    icon={<Icons.Calendar className="h-5 w-5" />}
                    label="Mis reservas"
                    description="Revisá tus próximas estadías y el historial."
                    onClick={() => navigate('/my-bookings')}
                  />
                  {user.role === 'host' ? (
                    <ActionRow
                      icon={<Icons.LayoutDashboard className="h-5 w-5" />}
                      label="Panel de anfitrión"
                      description="Gestioná tus propiedades y reservas."
                      onClick={() => navigate('/host-dashboard')}
                    />
                  ) : null}
                  <ActionRow
                    icon={<Icons.AlertTriangle className="h-5 w-5" />}
                    label="Reportar un problema"
                    description="Contanos si necesitás ayuda con tu cuenta o una reserva."
                    onClick={() => setShowReportModal(true)}
                  />
                  <ActionRow
                    icon={<Icons.LogOut className="h-5 w-5" />}
                    label="Cerrar sesión"
                    description="Salí de tu cuenta en este dispositivo."
                    onClick={async () => {
                      await logout();
                      navigate('/');
                    }}
                    tone="danger"
                  />
                </div>
              </Card>
            </aside>

            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <Card
                  variant="elevated"
                  padding="lg"
                  className="border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_24px_60px_-38px_rgba(15,23,42,0.32)]"
                >
                  <SectionTitle
                    eyebrow="Perfil"
                    heading="Qué muestra tu perfil"
                    description="Lo que hoy ve otra persona cuando entra a tu cuenta."
                    as="h2"
                    visualLevel="h3"
                  />

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <MiniMetric label="Puntaje del perfil" value={String(user.trustScore || 0)} accent="brand" caption="Sobre 100" />
                    <MiniMetric label="Nivel actual" value={user.badge || 'Bronce'} accent="success" caption="Se actualiza con tu actividad" />
                    <MiniMetric label="Calificación" value={ratingValue > 0 ? ratingValue.toFixed(1) : 'Sin dato'} accent="warning" caption="Según tu historial" />
                  </div>

                  {riskScore > 0 ? (
                    <NoticeBanner
                      tone={riskScore > 50 ? 'error' : 'warning'}
                      className="mt-6"
                      heading={riskScore > 50 ? 'Tu cuenta necesita revisión.' : 'Detectamos algunos puntos para revisar con calma.'}
                      description={`Puntaje actual: ${riskScore}. Si hubo algo fuera de lo esperado, conviene revisar tu perfil y tus interacciones recientes.`}
                    />
                  ) : (
                    <NoticeBanner
                      tone="success"
                      className="mt-6"
                      heading="Tu perfil no muestra alertas activas."
                      description="Mantené tus datos al día y respondé claro para sostener este estado."
                    />
                  )}
                </Card>

                <Card padding="lg" className="space-y-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <SectionTitle
                      eyebrow="Verificación"
                      heading="Estado de verificación"
                      description="Cuanto más completo esté tu perfil, más fácil es entender quién sos y avanzar sin dudas básicas."
                      as="h2"
                      visualLevel="h4"
                      className="max-w-md"
                    />
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-2 shadow-[var(--app-shadow-subtle)] dark:border-slate-700 dark:bg-slate-900">
                      <ValidationBadge level={validationLevel} size="lg" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Avance actual</span>
                      <span className="font-semibold text-brand">{progressPercent}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand via-brand-light to-emerald-400 transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {verificationChecks.length > 0 ? verificationChecks.map((item) => (
                      <div
                        key={item.label}
                        className={cn(
                          'flex items-center gap-3 rounded-[var(--app-radius-control)] border p-3',
                          item.done
                            ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/30 dark:bg-emerald-900/10'
                            : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50',
                        )}
                      >
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full',
                          item.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
                        )}>
                          {item.done ? <Icons.Check className="h-4 w-4" /> : <Icons.Clock className="h-4 w-4" />}
                        </div>
                        <span className={cn('text-sm font-medium', item.done ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300')}>
                          {item.label}
                        </span>
                      </div>
                    )) : (
                      <div className={`${profilePanelClass} sm:col-span-2`}>
                        <p className="text-sm text-slate-600 dark:text-slate-300">Todavía no pudimos cargar el detalle de tu verificación.</p>
                      </div>
                    )}
                  </div>

                  {missingRequirementsText ? (
                    <NoticeBanner
                      tone="info"
                      heading="Todavía faltan pasos para completar tu verificación."
                      description={missingRequirementsText}
                    />
                  ) : null}

                  <Button type="button" fullWidth onClick={() => setShowVerification(true)}>
                    <Icons.Verified className="h-5 w-5" />
                    {progressPercent >= 100 ? 'Revisar verificación' : 'Completá tu verificación'}
                  </Button>
                </Card>
              </div>

              <Card padding="lg" className="space-y-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <SectionTitle
                    eyebrow="Información personal"
                    heading="Lo que ajusta lo que ves"
                    description="Intereses, presentación y preferencias ayudan a ordenar mejor lo que ves al explorar."
                    as="h2"
                    visualLevel="h3"
                    className="max-w-2xl"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowInterestsModal(true)}>
                      <Icons.Heart className="h-4 w-4" />
                      Editar intereses
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowPreferencesModal(true)}>
                      <Icons.SlidersHorizontal className="h-4 w-4" />
                      Editar preferencias
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className={`${profilePanelClass} space-y-4`}>
                    <div className="flex items-center gap-2">
                      <Icons.Heart className="h-4 w-4 text-red-500" />
                      <p className="app-form-label">Tus intereses</p>
                    </div>
                    {userInterests.length > 0 ? (
                      <div className="flex flex-wrap gap-2.5">
                        {userInterests.map((interest) => (
                          <Badge key={interest} variant="neutral" size="md" className="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Todavía no cargaste intereses. Sumarlos ayuda a que las sugerencias se acerquen más a lo que querés revisar.
                      </p>
                    )}
                  </div>

                  <div className={`${profilePanelClass} space-y-4`}>
                    <div className="flex items-center gap-2">
                      <Icons.SlidersHorizontal className="h-4 w-4 text-brand" />
                      <p className="app-form-label">Preferencias para explorar</p>
                    </div>
                    <div className="space-y-3">
                      {preferencesSummary.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`${profilePanelClass} space-y-3`}>
                  <p className="app-form-label">Sobre vos</p>
                  {user.bio ? (
                    <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{user.bio}</p>
                  ) : (
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Sumá una breve presentación para que sepan con quién hablan antes de escribirte.
                    </p>
                  )}
                </div>
              </Card>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <Card padding="lg" className="space-y-6 dark:border-slate-800 dark:bg-slate-900">
                  <SectionTitle
                    eyebrow="Actividad"
                    heading="Tu actividad"
                    description="Un resumen corto de cómo venís usando la app."
                    as="h2"
                    visualLevel="h4"
                  />

                  <div className="grid gap-4 sm:grid-cols-3">
                    <MiniMetric label="Reservas" value={String(activity?.total_bookings || 0)} accent="brand" />
                    <MiniMetric label="Reseñas escritas" value={String(activity?.total_reviews_written || 0)} accent="success" />
                    <MiniMetric label="Reseñas recibidas" value={String(activity?.total_reviews_received || reviews.received.length)} accent="warning" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Última actividad registrada</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{formatShortDate(activity?.last_booking_date)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Rol actual en la app</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{user.role === 'host' ? 'Anfitrión' : 'Huésped'}</span>
                    </div>
                  </div>
                </Card>

                <Card padding="lg" className="space-y-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <SectionTitle
                      eyebrow="Reseñas"
                      heading="Tus reseñas"
                      description="Lo que recibiste y lo que dejaste escrito dentro de la app."
                      as="h2"
                      visualLevel="h4"
                    />

                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => setReviewTab('received')}
                        className={cn(
                          'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                          reviewTab === 'received'
                            ? 'bg-white text-slate-900 shadow-[var(--app-shadow-subtle)] dark:bg-slate-900 dark:text-white'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                        )}
                      >
                        Recibidas
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewTab('written')}
                        className={cn(
                          'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                          reviewTab === 'written'
                            ? 'bg-white text-slate-900 shadow-[var(--app-shadow-subtle)] dark:bg-slate-900 dark:text-white'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                        )}
                      >
                        Escritas
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-[var(--app-radius-control)] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Mostrando</p>
                    <Badge variant="neutral" size="md">{reviewCountLabel}</Badge>
                  </div>

                  <div className="space-y-4">
                    {currentReviews.length > 0 ? currentReviews.map((review, index) => (
                      <div key={`${review.propertyTitle || review.userName || 'review'}-${index}`} className={`${profilePanelClass} space-y-3`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                              {review.propertyTitle || review.userName || 'Experiencia en la plataforma'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatShortDate(review.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: Math.max(1, Math.round(review.rating || 0)) }).map((_, starIndex) => (
                              <Icons.Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{review.comment || 'Sin comentario adicional.'}</p>
                      </div>
                    )) : (
                      <div className="rounded-[var(--app-radius-control)] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center dark:border-slate-800 dark:bg-slate-800/40">
                        <Icons.MessageCircle className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                        <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">Todavía no hay reseñas para mostrar.</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          Cuando tengas más actividad, acá vas a poder revisar tu historial de forma simple y ordenada.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      )}

      {showVerification ? (
        <DocumentVerificationModal
          userType={user.role as 'tenant' | 'host'}
          currentVerification={verificationPayload}
          onSubmitted={async () => {
            await refresh();
            await reloadProfileData();
          }}
          onClose={() => setShowVerification(false)}
        />
      ) : null}

      {showInterestsModal ? (
        <InterestsModal
          currentInterests={userInterests}
          currentBio={user.bio || ''}
          onClose={() => setShowInterestsModal(false)}
          onSave={handleSaveInterests}
        />
      ) : null}

      {showPreferencesModal ? (
        <PreferencesModal
          currentPreferences={preferences}
          onClose={() => setShowPreferencesModal(false)}
          onSave={handleSavePreferences}
        />
      ) : null}

      {showReportModal ? (
        <ReportModal
          reportedUserId={user.id}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            setShowReportModal(false);
            showToast('Reporte enviado', 'Ya recibimos tu reporte. Nuestro equipo lo va a revisar.', 'success');
          }}
        />
      ) : null}
    </div>
  );
};

type MiniMetricProps = {
  label: string;
  value: string;
  accent?: 'brand' | 'success' | 'warning';
  caption?: string;
};

const MiniMetric = ({ label, value, accent = 'brand', caption }: MiniMetricProps) => {
  const accentClass = {
    brand: 'text-brand',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
  }[accent];

  return (
    <div className={`${profilePanelClass} space-y-2`}>
      <p className="app-form-label">{label}</p>
      <p className={cn('text-2xl font-semibold tracking-tight', accentClass)}>{value}</p>
      {caption ? <p className="text-xs text-slate-500 dark:text-slate-400">{caption}</p> : null}
    </div>
  );
};

type ActionRowProps = {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void | Promise<void>;
  tone?: 'default' | 'danger';
};

const ActionRow = ({ icon, label, description, onClick, tone = 'default' }: ActionRowProps) => {
  return (
    <button
      type="button"
      onClick={() => {
        void onClick();
      }}
      className={cn(
        actionRowBaseClass,
        tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn('mt-0.5 shrink-0', tone === 'danger' ? 'text-red-500' : 'text-slate-500 dark:text-slate-400')}>{icon}</div>
        <div className="min-w-0 space-y-1 text-left">
          <p className="text-sm font-semibold tracking-tight">{label}</p>
          <p className={cn('text-sm leading-6', tone === 'danger' ? 'text-red-600/80 dark:text-red-300/80' : 'text-slate-500 dark:text-slate-400')}>
            {description}
          </p>
        </div>
      </div>
      <Icons.ChevronRight className={cn('h-5 w-5 shrink-0', tone === 'danger' ? 'text-red-400' : 'text-slate-300 dark:text-slate-600')} />
    </button>
  );
};

type ModalShellProps = {
  eyebrow: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const ProfileModalShell = ({ eyebrow, heading, description, onClose, children, footer }: ModalShellProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <Card
        variant="elevated"
        padding="none"
        className="w-full max-w-lg overflow-hidden border-slate-200/90 shadow-[0_40px_90px_-46px_rgba(15,23,42,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <SectionTitle
            eyebrow={eyebrow}
            heading={heading}
            description={description}
            as="h3"
            visualLevel="h4"
            className="pr-4"
          />
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar panel" className="rounded-full">
            <Icons.X className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-h-[calc(90vh-9rem)] overflow-y-auto px-6 py-6">{children}</div>

        {footer ? <div className="border-t border-slate-200 px-6 py-5 dark:border-slate-800">{footer}</div> : null}
      </Card>
    </div>
  );
};

const InterestsModal = ({ currentInterests, currentBio, onClose, onSave }: {
  currentInterests: string[];
  currentBio: string;
  onClose: () => void;
  onSave: (interests: string[], bio: string) => Promise<void>;
}) => {
  const [interests, setInterests] = useState<string[]>(currentInterests);
  const [bio, setBio] = useState(currentBio);
  const [saving, setSaving] = useState(false);

  const handleInterestToggle = (interest: string) => {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(interests, bio);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileModalShell
      eyebrow="Perfil"
      heading="Tus intereses"
      description="Contá qué te interesa y sumá una breve presentación para que sepan mejor con quién hablan."
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={() => void handleSubmit()} loading={saving} loadingLabel="Guardando...">
            <>
              <Icons.Check className="h-4 w-4" />
              Guardar cambios
            </>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <FormField label="Qué plan buscás" hint="Opcional">
          <div className="flex flex-wrap gap-2.5">
            {interestOptions.map((interest) => (
              <button
                type="button"
                key={interest}
                onClick={() => handleInterestToggle(interest)}
                className={cn(
                  'rounded-full border px-3 py-2 text-sm font-medium transition-all',
                  interests.includes(interest)
                    ? 'border-brand bg-brand text-white shadow-[var(--app-shadow-brand)]'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand/40 hover:bg-brand/5 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
                )}
              >
                {interest}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Presentación breve" hint="Opcional" htmlFor="profile-bio">
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="app-control resize-none px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="Contá en pocas líneas cómo viajás o qué valorás cuando elegís una propiedad."
          />
        </FormField>
      </div>
    </ProfileModalShell>
  );
};

const PreferencesModal = ({ currentPreferences, onClose, onSave }: {
  currentPreferences: UserPreferences | null;
  onClose: () => void;
  onSave: (prefs: UserPreferences) => Promise<void>;
}) => {
  const [zone, setZone] = useState(currentPreferences?.preferred_zone || '');
  const [price, setPrice] = useState(String(currentPreferences?.max_price || ''));
  const [type, setType] = useState(currentPreferences?.preferred_property_type || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave({
        preferred_zone: zone || null,
        max_price: price ? Number(price) : null,
        preferred_property_type: type || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileModalShell
      eyebrow="Preferencias"
      heading="Qué querés ver primero"
      description="Definí zona, presupuesto y tipo de propiedad para ordenar mejor lo que ves al explorar."
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={() => void handleSubmit()} loading={saving} loadingLabel="Guardando...">
            <>
              <Icons.Check className="h-4 w-4" />
              Guardar preferencias
            </>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <FormField label="Zona preferida" hint="Opcional" htmlFor="preferences-zone">
          <select
            id="preferences-zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="app-control appearance-none px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Sin preferencia</option>
            {VALID_ZONES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Presupuesto máximo" hint="Opcional" htmlFor="preferences-price">
          <Input
            id="preferences-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ej: 120000"
            disabled={saving}
          />
        </FormField>

        <FormField label="Tipo de propiedad" hint="Opcional" htmlFor="preferences-type">
          <select
            id="preferences-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="app-control appearance-none px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Cualquiera</option>
            {propertyTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </ProfileModalShell>
  );
};

export default ProfileViewNew;