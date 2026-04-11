import React from 'react';
import { cn } from '../lib/utils';
import {
  formatGuestMemberSinceYear,
  getGuestRequestProfileBannerCopy,
  getGuestRequestProfileScenario,
} from '../lib/guestRequestProfile';
import type { GuestRequestProfile } from '../types';
import { TrustSignalsInline, getTrustSignalsFromInteractionHistory, getTrustSignalsFromItems } from './ui/TrustSignalsInline';
import { VerificationDetailsBlock } from './ui/VerificationDetailsBlock';

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
  const trustSignals = [
    ...getTrustSignalsFromItems(profile.verificationItems, { limit: 2, tone: 'success' }),
    ...getTrustSignalsFromInteractionHistory(profile.interactionHistory.publicSignals, { limit: 2, tone: 'neutral' }),
  ].slice(0, 3);
  const guestDataItems = [
    {
      label: 'Usuario desde',
      value: profile.dataAvailability.memberSince
        ? formatGuestMemberSinceYear(profile.memberSince)
        : 'Todavía no visible',
      muted: !profile.dataAvailability.memberSince,
    },
    {
      label: 'Estadías completadas',
      value: profile.dataAvailability.platformHistory
        ? String(profile.platformHistory.completedStays)
        : 'Todavía no visible',
      muted: !profile.dataAvailability.platformHistory,
    },
    {
      label: 'Cancelaciones',
      value: profile.dataAvailability.platformHistory
        ? String(profile.platformHistory.cancellationsCount)
        : 'Todavía no visible',
      muted: !profile.dataAvailability.platformHistory,
    },
    {
      label: 'Cierres compartidos',
      value: profile.interactionHistory.feedbackCount > 0
        ? String(profile.interactionHistory.feedbackCount)
        : 'Todavía no visible',
      muted: profile.interactionHistory.feedbackCount === 0,
    },
  ];
  const latestHostReference = profile.hostReviews[0] ?? null;

  return (
    <div data-testid="guest-request-profile-card" className={cn('rounded-[22px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_18px_32px_-30px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950 md:px-5', className)}>
      <div className="space-y-1">
        <p className={sectionLabelClass}>Ficha del huésped</p>
        <h4 className="text-[1rem] font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">Lo que ya podés revisar antes de aceptar</h4>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Huésped: <span className="font-semibold text-slate-900 dark:text-slate-100">{guestName}</span></p>
      </div>

      <div className="mt-4 space-y-4">
        {bannerCopy && (scenario === 'sync-pending' || scenario === 'new-guest' || (scenario === 'partial-profile' && missingSectionsCount > 0)) ? (
          <div className="rounded-[16px] bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-100">{bannerCopy.title}</p>
            <p className="mt-1">{bannerCopy.description}</p>
          </div>
        ) : null}

        <TrustSignalsInline
          title="Señales rápidas"
          signals={trustSignals}
          emptyText="Todavía no hay suficientes señales visibles para resumir esta cuenta."
        />

        <VerificationDetailsBlock
          summary={profile.verificationSummary}
          title="Comprobaciones del huésped"
          description="Mostramos qué ya está comprobado en esta cuenta y qué todavía no aparece como visible."
          showDescriptions={false}
        />

        <section className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className={sectionLabelClass}>Historial compartido</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {guestDataItems.map((item) => (
              <DataItem key={item.label} label={item.label} value={item.value} muted={item.muted} />
            ))}
          </div>

          {latestHostReference ? (
            <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Última referencia visible</p>
              <p className="mt-1">{latestHostReference.comment}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                {latestHostReference.authorName} • {formatReviewDate(latestHostReference.date)}
              </p>
            </div>
          ) : null}

          {!latestHostReference && profile.interactionHistory.feedbackCount === 0 ? (
            <SectionEmptyState message="Todavía no hay suficientes cierres compartidos para resumir esta cuenta." />
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default GuestRequestProfileCard;