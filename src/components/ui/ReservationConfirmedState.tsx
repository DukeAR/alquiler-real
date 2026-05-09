import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

type ReservationConfirmedDetail = {
  label: ReactNode;
  value: ReactNode;
};

type ReservationConfirmedStateTone = 'brand' | 'warning';

type ReservationConfirmedStateProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  details?: ReservationConfirmedDetail[];
  nextStep?: ReactNode;
  className?: string;
  tone?: ReservationConfirmedStateTone;
  icon?: ReactNode;
};

const toneContainerClassName: Record<ReservationConfirmedStateTone, string> = {
  brand: 'border-brand/10 bg-brand/5 dark:border-brand/20 dark:bg-brand/10',
  warning: 'border-amber-200/80 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10',
};

const toneIconClassName: Record<ReservationConfirmedStateTone, string> = {
  brand: 'bg-white text-brand dark:bg-slate-900 dark:text-brand-light',
  warning: 'bg-white text-amber-600 dark:bg-slate-900 dark:text-amber-300',
};

const toneEyebrowClassName: Record<ReservationConfirmedStateTone, string> = {
  brand: 'text-brand',
  warning: 'text-amber-700 dark:text-amber-300',
};

export const ReservationConfirmedState = ({
  eyebrow,
  title,
  description,
  details = [],
  nextStep,
  className,
  tone = 'brand',
  icon,
}: ReservationConfirmedStateProps) => (
  <div className={cn('rounded-[24px] border p-4', toneContainerClassName[tone], className)}>
    <div className="flex flex-wrap items-center gap-3">
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl shadow-[var(--app-shadow-subtle)]', toneIconClassName[tone])}>
        {icon ?? <Icons.CheckCircle2 className="h-5 w-5" />}
      </div>
      <div className="min-w-0 space-y-1">
        {eyebrow ? <p className={cn('text-[11px] font-semibold uppercase tracking-[0.16em]', toneEyebrowClassName[tone])}>{eyebrow}</p> : null}
        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</p>
        {description ? <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
      </div>
    </div>

    {details.length > 0 ? (
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {details.map((detail) => (
          <div key={String(detail.label)} className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{detail.label}</p>
            <p className="mt-1 font-semibold text-slate-950 dark:text-slate-50">{detail.value}</p>
          </div>
        ))}
      </div>
    ) : null}

    {nextStep ? (
      <div className="mt-4 rounded-[20px] border border-white/80 bg-white/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
        {nextStep}
      </div>
    ) : null}
  </div>
);

export default ReservationConfirmedState;