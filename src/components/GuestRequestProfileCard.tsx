import React from 'react';
import { cn } from '../lib/utils';
import { formatGuestMemberSinceYear } from '../lib/guestRequestProfile';
import type { GuestHostReviewSnippet, GuestRequestProfile } from '../types';

type GuestRequestProfileCardProps = {
  guestName: string;
  profile: GuestRequestProfile;
  className?: string;
};

const sectionLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500';
const emptySectionClass = 'rounded-[18px] border border-dashed border-slate-200/90 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400';

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

const StatusItem = ({ checked, label }: { checked: boolean; label: string }) => (
  <div className="flex items-start gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
        checked
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
      )}
    >
      {checked ? '✔' : '○'}
    </span>
    <span>{label}</span>
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
  const historyItems = [
    { label: 'Estadías completadas', value: profile.platformHistory.completedStays },
    { label: 'Conflictos', value: profile.platformHistory.conflictsCount },
    { label: 'Cancelaciones', value: profile.platformHistory.cancellationsCount },
  ];

  const visibleSignals = profile.operationSignals.filter((signal) => signal.active);
  const missingSectionsCount = [
    profile.dataAvailability.identity,
    profile.dataAvailability.platformHistory,
    profile.dataAvailability.hostReviews,
    profile.dataAvailability.profileCompletion,
    profile.dataAvailability.operationSignals,
    profile.dataAvailability.memberSince,
  ].filter((value) => !value).length;

  return (
    <div data-testid="guest-request-profile-card" className={cn('rounded-[26px] border border-slate-200/85 bg-slate-50/85 p-5 shadow-[0_18px_32px_-26px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/80 md:p-6', className)}>
      <div className="space-y-1">
        <p className={sectionLabelClass}>Ficha del huésped</p>
        <h4 className="text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">{guestName}</h4>
      </div>

      <div className="mt-5 space-y-5">
        {profile.dataSource === 'fallback' ? (
          <div className="rounded-[18px] border border-dashed border-slate-200/90 bg-white/75 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
            Esta ficha todavía no tiene datos estructurados para mostrar.
          </div>
        ) : null}

        {profile.dataSource === 'mixed' && missingSectionsCount > 0 ? (
          <div className="rounded-[18px] border border-dashed border-slate-200/90 bg-white/75 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
            Algunos bloques de esta ficha todavía no tienen datos estructurados desde la plataforma.
          </div>
        ) : null}

        <section className="space-y-3 border-t border-slate-200/80 pt-4 first:border-t-0 first:pt-0 dark:border-slate-800">
          <p className={sectionLabelClass}>Identidad</p>
          {profile.dataAvailability.identity ? (
            <StatusItem checked={profile.identityVerified} label={profile.identityVerified ? 'Identidad confirmada' : 'Identidad no verificada'} />
          ) : (
            <SectionEmptyState message="Esta parte de la ficha todavía no tiene datos estructurados para mostrar." />
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Historial en la plataforma</p>
          {profile.dataAvailability.platformHistory ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {historyItems.map((item) => (
                <div key={item.label} className="rounded-[18px] border border-slate-200/80 bg-white/92 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/80">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <SectionEmptyState message="Esta parte de la ficha todavía no tiene datos estructurados para mostrar." />
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Reseñas de anfitriones</p>
          {!profile.dataAvailability.hostReviews ? (
            <SectionEmptyState message="Esta parte de la ficha todavía no tiene datos estructurados para mostrar." />
          ) : profile.hostReviews.length > 0 ? (
            <ul className="space-y-3">
              {profile.hostReviews.slice(0, 3).map((review) => (
                <ReviewSnippet key={review.id} review={review} />
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Todavía no hay reseñas cargadas para mostrar.</p>
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Perfil completo</p>
          {profile.dataAvailability.profileCompletion ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusItem checked={profile.profileCompletion.profileComplete} label="Perfil completo" />
              <StatusItem checked={profile.profileCompletion.photoUploaded} label="Foto cargada" />
              <StatusItem checked={profile.profileCompletion.basicDetailsComplete} label="Datos básicos completos" />
            </div>
          ) : (
            <SectionEmptyState message="Esta parte de la ficha todavía no tiene datos estructurados para mostrar." />
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Señales de esta operación</p>
          {!profile.dataAvailability.operationSignals ? (
            <SectionEmptyState message="Esta parte de la ficha todavía no tiene datos estructurados para mostrar." />
          ) : visibleSignals.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {visibleSignals.map((signal) => (
                <StatusItem key={signal.id} checked={signal.active} label={signal.label} />
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Todavía no hay señales registradas para esta operación.</p>
          )}
        </section>

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Antigüedad</p>
          {profile.dataAvailability.memberSince ? (
            <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">Usuario desde {formatGuestMemberSinceYear(profile.memberSince)}</p>
          ) : (
            <SectionEmptyState message="Esta parte de la ficha todavía no tiene datos estructurados para mostrar." />
          )}
        </section>
      </div>
    </div>
  );
};

export default GuestRequestProfileCard;