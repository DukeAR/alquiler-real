import React from 'react';
import { Icons } from './Icons';
import { HostProfile } from '../services/geminiService';
import { getHostResponseSignal } from '../lib/positiveIncentives';
import { InteractionHistorySignals } from './ui/InteractionHistorySignals';
import { TrustSignalsInline, getTrustSignalsFromItems, type TrustSignal } from './ui/TrustSignalsInline';

interface HostProfileViewProps {
  profile: HostProfile;
  onBack: () => void;
}

const formatMonthYear = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
};

const formatCountLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

const MetricCard = ({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) => (
  <div className="rounded-[26px] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
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

export const HostProfileView: React.FC<HostProfileViewProps> = ({ profile, onBack }) => {
  const memberSinceLabel = formatMonthYear(profile.memberSince);
  const responseSignal = getHostResponseSignal(profile.interactionHistory);
  const responseTimeLabel = profile.avgResponseTimeMinutes > 0
    ? profile.avgResponseTimeMinutes < 60
      ? `~${profile.avgResponseTimeMinutes} min`
      : 'Dentro del día'
    : 'Sin dato';
  const headerSignals: TrustSignal[] = [];
  const seenLabels = new Set<string>();
  const pushHeaderSignal = (signal: TrustSignal | null) => {
    if (!signal?.label || seenLabels.has(signal.label) || headerSignals.length >= 4) {
      return;
    }

    seenLabels.add(signal.label);
    headerSignals.push(signal);
  };

  getTrustSignalsFromItems(Array.isArray(profile.hostTrust?.items) ? profile.hostTrust.items : [], { limit: 4, tone: 'brand' }).forEach((signal) => {
    pushHeaderSignal({
      ...signal,
      tone: signal.key === 'identity' || signal.key === 'onsite' ? 'success' : 'brand',
    });
  });

  if (profile.emailVerified) {
    pushHeaderSignal({ key: 'email', label: 'Email confirmado', tone: 'neutral' });
  }

  if (responseSignal?.label) {
    pushHeaderSignal({ key: 'response', label: responseSignal.label, tone: 'neutral' });
  }

  if (profile.completedStaysCount > 0) {
    pushHeaderSignal({
      key: 'stays',
      label: formatCountLabel(profile.completedStaysCount, '1 estadía cerrada', `${profile.completedStaysCount} estadías cerradas`),
      tone: 'neutral',
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 sm:px-6">
          <button onClick={onBack} className="rounded-2xl p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <Icons.ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Perfil del anfitrión</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">Historial de interacción</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <Icons.User className="h-10 w-10" />
                  {profile.identityValidated ? (
                    <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 text-white dark:border-slate-900">
                      <Icons.ShieldCheck className="h-4 w-4" />
                    </span>
                  ) : null}
                </div>

                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{profile.name}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Miembro desde {memberSinceLabel}</p>
                </div>
              </div>

              <p className="max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                Mostramos actividad real, tiempos de respuesta y cierres compartidos. No usamos etiquetas públicas de resultado.
              </p>
            </div>

            <TrustSignalsInline
              title="Qué deja claro este perfil"
              signals={headerSignals}
              emptyText="Todavía no hay suficientes señales visibles para resumir este perfil."
            />
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Identidad y validación</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Lo que ya está validado en este perfil</h3>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Email"
              value={profile.emailVerified ? 'Confirmado' : 'Pendiente'}
              helper="La cuenta ya tiene un email validado dentro de la app."
              icon={<Icons.MessageSquare className="h-5 w-5" />}
            />
            <MetricCard
              label="Respaldo"
              value={profile.identityValidated ? 'Validado' : 'Pendiente'}
              helper="Suma respaldo documental, sin prometer condiciones del inmueble."
              icon={<Icons.BadgeCheck className="h-5 w-5" />}
            />
            <MetricCard
              label="Método"
              value={profile.verificationMethod === 'presencial' ? 'Presencial' : 'Digital'}
              helper="Indica cómo se hizo la validación más fuerte disponible hoy."
              icon={<Icons.Shield className="h-5 w-5" />}
            />
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Actividad real</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Cómo se mueve este perfil en la plataforma</h3>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Avisos activos"
              value={String(profile.activePropertiesCount)}
              helper={formatCountLabel(profile.publishedPropertiesCount, 'publicación visible', 'publicaciones visibles')}
              icon={<Icons.Home className="h-5 w-5" />}
            />
            <MetricCard
              label="Reservas cerradas"
              value={String(profile.completedStaysCount)}
              helper="Son estadías que ya terminaron dentro de la app."
              icon={<Icons.Calendar className="h-5 w-5" />}
            />
            <MetricCard
              label={responseSignal?.label ?? 'Tiempo de respuesta'}
              value={responseTimeLabel}
              helper="Responder ayuda a avanzar más rápido y este promedio sale de la primera respuesta visible del anfitrión en cada conversación."
              icon={<Icons.Clock className="h-5 w-5" />}
            />
            <MetricCard
              label="Consultas"
              value={String(profile.queriesReceivedCount)}
              helper={formatCountLabel(profile.chatsStartedCount, 'chat iniciado', 'chats iniciados')}
              icon={<Icons.MessageCircle className="h-5 w-5" />}
            />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Acuerdos finalizados</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{formatCountLabel(profile.agreementsFinalizedCount, 'acuerdo cerrado', 'acuerdos cerrados')}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Reservas no completadas</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{formatCountLabel(profile.hostCancellationsCount, 'reserva', 'reservas')}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Antigüedad promedio</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{profile.avgPublicationAgeMonths} {profile.avgPublicationAgeMonths === 1 ? 'mes' : 'meses'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Historial compartido</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Señales que dejan huéspedes al cerrar la estadía</h3>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {profile.interactionHistory.feedbackCount > 0
                ? `Este resumen sale de ${formatCountLabel(profile.interactionHistory.feedbackCount, 'cierre compartido', 'cierres compartidos')} y se muestra sin detalles sensibles.`
                : 'Todavía no hay suficientes cierres compartidos para resumir este historial.'}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <InteractionHistorySignals signals={profile.interactionHistory.publicSignals} />
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Validaciones del aviso</p>
            <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Qué propiedades ya tienen verificación presencial o respaldo interno</h3>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricCard
              label="Presencial"
              value={String(profile.verificationsSummary.presencialCount)}
              helper="Propiedades con verificación presencial registrada."
              icon={<Icons.Home className="h-5 w-5" />}
            />
            <MetricCard
              label="Ubicación"
              value={String(profile.verificationsSummary.gpsProofCount)}
              helper="Avisos donde la ubicación ya quedó confirmada."
              icon={<Icons.Navigation className="h-5 w-5" />}
            />
            <MetricCard
              label="Foto o video"
              value={String(profile.verificationsSummary.videoValidationCount)}
              helper="Avisos con material validado para ver mejor el lugar."
              icon={<Icons.Video className="h-5 w-5" />}
            />
          </div>
        </section>

        <div className="rounded-[32px] border border-slate-200/80 bg-slate-100/90 px-6 py-5 text-center text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
          Alquiler Real valida información declarada por el anfitrión y registra historial de uso. No certifica titularidad y no evaluamos estado, calidad ni amenities del inmueble.
        </div>
      </main>
    </div>
  );
};