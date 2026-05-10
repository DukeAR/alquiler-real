import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Icons } from './Icons';
import { LoadingState } from './LoadingState';
import { Button } from './ui/Button';
import {
  type NotificationCategory,
  type NotificationEmailPolicy,
  type NotificationItem,
  useSharedNotifications,
} from '../hooks/useNotifications';
import { cn } from '../lib/utils';

const CATEGORY_COPY: Record<NotificationCategory, { label: string; tone: string; icon: React.ComponentType<{ className?: string }> }> = {
  info: {
    label: 'Información',
    tone: 'border-sky-200/80 bg-sky-50 text-sky-700',
    icon: Icons.Info,
  },
  action_required: {
    label: 'Acción requerida',
    tone: 'border-amber-200/90 bg-amber-50 text-amber-800',
    icon: Icons.ShieldAlert,
  },
  important_alert: {
    label: 'Alerta importante',
    tone: 'border-red-200/90 bg-red-50 text-red-700',
    icon: Icons.AlertTriangle,
  },
};

const AUDIENCE_COPY = {
  guest: 'Huésped',
  host: 'Anfitrión',
  account: 'Cuenta',
} as const;

const EMAIL_POLICY_COPY: Record<Exclude<NotificationEmailPolicy, 'none'>, string> = {
  important: 'También por email',
  critical: 'Email crítico',
  recovery: 'Email de recuperación',
};

const formatNotificationDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Ahora';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const SummaryCard = ({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  tone: string;
}) => (
  <article className={cn('rounded-[24px] border px-5 py-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.24)]', tone)}>
    <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
  </article>
);

const NotificationCard = ({ notification }: { notification: NotificationItem }) => {
  const category = CATEGORY_COPY[notification.category];
  const CategoryIcon = category.icon;

  return (
    <article className="rounded-[28px] border border-slate-200/90 bg-white/96 p-5 shadow-[0_24px_55px_-38px_rgba(15,23,42,0.22)] transition-colors hover:border-slate-300 hover:bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn('mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border', category.tone)}>
            <CategoryIcon className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em]', category.tone)}>
                {category.label}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500">
                {AUDIENCE_COPY[notification.audience]}
              </span>
              {notification.unread ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-emerald-700">
                  Nuevo
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{notification.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{notification.message}</p>
          </div>
        </div>

        <p className="shrink-0 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {formatNotificationDate(notification.createdAt)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        {notification.emailPolicy !== 'none' ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
            <Icons.Mail className="h-3.5 w-3.5" />
            {EMAIL_POLICY_COPY[notification.emailPolicy]}
          </span>
        ) : null}

        {notification.actionHref && notification.actionLabel ? (
          <Link
            to={notification.actionHref}
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            {notification.actionLabel}
            <Icons.ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
};

export const NotificationsCenter: React.FC = () => {
  const navigate = useNavigate();
  const {
    status,
    notifications,
    unreadCount,
    errorMessage,
    hasLoaded,
    isMarkingAllRead,
    loadNotifications,
    markAllAsRead,
  } = useSharedNotifications();

  const summary = useMemo(() => ({
    info: notifications.filter((notification) => notification.category === 'info').length,
    actionRequired: notifications.filter((notification) => notification.category === 'action_required').length,
    important: notifications.filter((notification) => notification.category === 'important_alert').length,
  }), [notifications]);

  if (status === 'auth-loading' || status === 'loading' || (!hasLoaded && status === 'ready')) {
    return (
      <LoadingState
        fullScreen
        message="Cargando tu centro de notificaciones..."
        description="Estamos ordenando tu actividad reciente para que entiendas qué pasó y qué sigue."
      />
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eff6ff_48%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <ErrorState
            title="No pudimos abrir tus notificaciones"
            description={errorMessage || 'Reintentá en unos segundos para recuperar la actividad más reciente.'}
            onRetry={() => void loadNotifications()}
            onDismiss={() => navigate(-1)}
            dismissLabel="Volver"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eff6ff_40%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/90 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-6 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.25)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.74rem] font-black uppercase tracking-[0.22em] text-sky-700/80">Centro de notificaciones</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Todo lo importante para entender qué pasó y qué hacer.
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                Ordenamos tu actividad por tiempo, destacamos lo urgente y evitamos ruido promocional. Si algo necesita acción, lo vas a ver claro acá.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => void loadNotifications()}>
                Actualizar
              </Button>
              <Button type="button" variant="primary" onClick={() => void markAllAsRead()} disabled={unreadCount === 0} loading={isMarkingAllRead} loadingLabel="Marcando...">
                Marcar revisadas
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Acción requerida"
              value={summary.actionRequired}
              description="Pasos pendientes para que la operación siga sin trabas."
              tone="border-amber-200/90 bg-white/82"
            />
            <SummaryCard
              label="Alertas importantes"
              value={summary.important}
              description="Eventos sensibles que conviene revisar cuanto antes."
              tone="border-red-200/90 bg-white/82"
            />
            <SummaryCard
              label="Información"
              value={summary.info}
              description="Confirmaciones y avances ya registrados en la app."
              tone="border-sky-200/90 bg-white/82"
            />
          </div>
        </section>

        {notifications.length === 0 ? (
          <EmptyState
            tone="soft"
            icon={<Icons.Bell className="h-10 w-10" />}
            eyebrow="Sin pendientes"
            title="No tenés notificaciones activas"
            description="Cuando haya una respuesta, una actualización de reserva o una acción para resolver, la vas a ver acá en orden cronológico."
            action={{
              label: 'Explorar propiedades',
              onClick: () => navigate('/explore'),
            }}
          />
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-400">Actividad reciente</p>
                <p className="mt-1 text-sm text-slate-600">Lista cronológica con acciones rápidas para seguir cada operación.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.2)]">
                {unreadCount} {unreadCount === 1 ? 'novedad sin revisar' : 'novedades sin revisar'}
              </span>
            </div>

            <div className="space-y-4">
              {notifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default NotificationsCenter;