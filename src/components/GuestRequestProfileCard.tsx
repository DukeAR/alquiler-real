import React from 'react';
import { cn } from '../lib/utils';
import {
  formatGuestMemberSinceYear,
  getGuestRequestProfileBannerCopy,
  getGuestRequestProfileOperationEmptyMessage,
  getGuestRequestProfileReviewsEmptyMessage,
  getGuestRequestProfileScenario,
} from '../lib/guestRequestProfile';
import type { GuestHostReviewSnippet, GuestRequestProfile } from '../types';
import { InteractionHistorySignals } from './ui/InteractionHistorySignals';
import { VerificationMeter, VerificationSnippetList } from './ui/VerificationMeter';

type GuestRequestProfileCardProps = {
  guestName: string;
  profile: GuestRequestProfile;
  className?: string;
};

const sectionLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';
const emptySectionClass = 'rounded-[16px] bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-500 dark:bg-slate-900/70 dark:text-slate-400';

const formatReviewDate = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', {
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
};

const DataItem = ({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) => (
  <div className="rounded-[16px] bg-slate-50/85 px-3 py-3 dark:bg-slate-900/70">
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{label}</p>
    <p className={cn('mt-1 text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50', muted && 'font-medium text-slate-500 dark:text-slate-400')}>{value}</p>
  </div>
);

const SignalItem = ({
  status,
  label,
}: {
  status: 'active' | 'inactive' | 'pending';
  label: string;
}) => (
  <div className="flex items-start gap-3 rounded-[16px] bg-slate-50/85 px-3 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
        status === 'active'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
          : status === 'pending'
            ? 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
      )}
    >
      {status === 'active' ? '✔' : status === 'pending' ? '…' : '○'}
    </span>
    <div>
      <p>{label}</p>
      {status === 'pending' ? (
        <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Todavía no disponible</p>
      ) : null}
    </div>
  </div>
);

const ReviewSnippet = ({ review }: { review: GuestHostReviewSnippet }) => (
  <li className="rounded-[18px] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950/80">
    <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{review.comment}</p>
    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
      {review.authorName} • {formatReviewDate(review.date)}
    </p>
  </li>
);

const SectionEmptyState = ({ message }: { message: string }) => (
  <p className={emptySectionClass}>{message}</p>
);

export const GuestRequestProfileCard: React.FC<GuestRequestProfileCardProps> = ({ guestName, profile, className }) => {
  const missingSectionsCount = [
    profile.dataAvailability.identity,
    profile.dataAvailability.platformHistory,
    profile.dataAvailability.hostReviews,
    profile.dataAvailability.profileCompletion,
    profile.dataAvailability.operationSignals,
    profile.dataAvailability.memberSince,
  ].filter((value) => !value).length;
  const bannerCopy = getGuestRequestProfileBannerCopy(profile);
  const scenario = getGuestRequestProfileScenario(profile);
  const visibleReviews = profile.hostReviews.slice(0, 2);
  const pendingSignals = profile.operationSignals.filter((signal) => signal.source === 'pending');
  const hasAnyActiveSignals = profile.operationSignals.some((signal) => signal.active);
  const guestDataItems = [
    {
      label: 'Identidad',
      value: profile.dataAvailability.identity
        ? profile.identityVerified
          ? 'Confirmada'
          : 'No verificada'
        : 'Todavía no disponible',
      muted: !profile.dataAvailability.identity,
    },
    {
      label: 'Usuario desde',
      value: profile.dataAvailability.memberSince
        ? formatGuestMemberSinceYear(profile.memberSince)
        : 'Todavía no disponible',
      muted: !profile.dataAvailability.memberSince,
    },
    {
      label: 'Estadías completadas',
      value: profile.dataAvailability.platformHistory
        ? String(profile.platformHistory.completedStays)
        : 'Todavía no disponible',
      muted: !profile.dataAvailability.platformHistory,
    },
    {
      label: 'Perfil',
      value: profile.dataAvailability.profileCompletion
        ? profile.profileCompletion.profileComplete
          ? 'Completo'
          : 'Incompleto'
        : 'Todavía no disponible',
      muted: !profile.dataAvailability.profileCompletion,
    },
  ];

  return (
    <div data-testid="guest-request-profile-card" className={cn('rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_18px_32px_-30px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950 md:px-5', className)}>
      <div className="space-y-1">
        <p className={sectionLabelClass}>Ficha del huésped</p>
        <h4 className="text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">Antes de aceptar, podés revisar esto</h4>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Huésped: <span className="font-semibold text-slate-900 dark:text-slate-100">{guestName}</span></p>
      </div>

      <div className="mt-4 space-y-4">
        {bannerCopy && (scenario === 'sync-pending' || scenario === 'new-guest' || (scenario === 'partial-profile' && missingSectionsCount > 0)) ? (
          <div className="rounded-[16px] bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{bannerCopy.title}</p>
            <p className="mt-1">{bannerCopy.description}</p>
          </div>
        ) : null}

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <VerificationMeter
            summary={profile.verificationSummary}
            eyebrow="Comprobaciones del huésped"
            helper="Mostramos qué ya está comprobado en esta cuenta."
            tone="neutral"
          />
          <VerificationSnippetList
            summary={profile.verificationSummary}
            status="complete"
            showDescriptions={false}
            emptyText="Todavía no hay comprobaciones visibles en esta cuenta."
          />
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Datos del huésped</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {guestDataItems.map((item) => (
              <DataItem key={item.label} label={item.label} value={item.value} muted={item.muted} />
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Historial compartido</p>
          <InteractionHistorySignals
            signals={profile.interactionHistory.publicSignals}
            emptyText="Todavía no hay suficientes cierres compartidos para resumir esta cuenta."
          />
          {profile.interactionHistory.feedbackCount > 0 ? (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Sobre {profile.interactionHistory.feedbackCount} {profile.interactionHistory.feedbackCount === 1 ? 'cierre compartido' : 'cierres compartidos'}.
            </p>
          ) : null}
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Señales de esta operación</p>
          {!profile.dataAvailability.operationSignals ? (
            <SectionEmptyState message="Todavía no hay una operación activa para mostrar acá." />
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {profile.operationSignals.map((signal) => (
                  <SignalItem
                    key={signal.id}
                    status={signal.source === 'pending' ? 'pending' : signal.active ? 'active' : 'inactive'}
                    label={signal.label}
                  />
                ))}
              </div>
              {!hasAnyActiveSignals && pendingSignals.length === 0 ? (
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{getGuestRequestProfileOperationEmptyMessage(profile)}</p>
              ) : null}
            </>
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Reseñas de anfitriones</p>
          {!profile.dataAvailability.hostReviews ? (
            <SectionEmptyState message="Todavía no hay reseñas visibles para esta cuenta." />
          ) : visibleReviews.length > 0 ? (
            <ul className="space-y-3">
              {visibleReviews.map((review) => (
                <ReviewSnippet key={review.id} review={review} />
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{getGuestRequestProfileReviewsEmptyMessage(profile)}</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default GuestRequestProfileCard;