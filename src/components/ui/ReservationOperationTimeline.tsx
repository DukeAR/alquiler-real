import { type ReservationFlowTimeline } from '../../lib/reservationFlow';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

type ReservationOperationTimelineProps = {
  timeline: ReservationFlowTimeline;
  title?: string;
  className?: string;
};

const statusToneClasses = {
  neutral: 'border-slate-200/85 bg-white/85 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300',
  brand: 'border-brand/12 bg-brand/[0.05] text-brand dark:border-brand/18 dark:bg-brand/[0.09] dark:text-brand-light',
  success: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/18 dark:text-emerald-300',
  warning: 'border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/18 dark:text-amber-300',
} as const;

const currentMarkerToneClasses = {
  neutral: 'border-slate-300 bg-slate-100/90 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  brand: 'border-brand/15 bg-brand/[0.07] text-brand dark:border-brand/20 dark:bg-brand/[0.1] dark:text-brand-light',
  success: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/18 dark:text-emerald-300',
  warning: 'border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/18 dark:text-amber-300',
} as const;

const connectorToneClasses = {
  neutral: 'bg-slate-200 dark:bg-slate-800',
  brand: 'bg-brand/20 dark:bg-brand/25',
  success: 'bg-emerald-200 dark:bg-emerald-900/30',
  warning: 'bg-amber-200 dark:bg-amber-900/30',
} as const;

export const ReservationOperationTimeline = ({
  timeline,
  title = 'Timeline operativo',
  className,
}: ReservationOperationTimelineProps) => {
  return (
    <div className={cn('rounded-[22px] border border-slate-200/70 bg-slate-50/58 p-3.5 dark:border-slate-800 dark:bg-slate-950/35', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{title}</p>
        <p className={cn('inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[10px] font-semibold', statusToneClasses[timeline.status.tone])}>
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            timeline.status.tone === 'brand'
              ? 'bg-brand'
              : timeline.status.tone === 'success'
                ? 'bg-emerald-500'
                : timeline.status.tone === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-slate-400',
          )} />
          <span>{timeline.status.label}</span>
        </p>
      </div>

      <ol className="mt-3.5 space-y-2.5">
        {timeline.steps.map((step, index) => {
          const isCompleted = step.state === 'completed';
          const isCurrent = step.state === 'current';
          const isLast = index === timeline.steps.length - 1;
          const markerTone = isCurrent ? timeline.status.tone : isCompleted ? 'success' : 'neutral';
          const markerLabel = isCurrent ? 'Actual' : isCompleted ? 'Completado' : 'Pendiente';

          return (
            <li key={step.key} className="relative pl-9">
              {!isLast ? (
                <span
                  className={cn(
                    'absolute left-[13px] top-7 bottom-[-12px] w-px',
                    isCompleted ? connectorToneClasses.success : isCurrent ? connectorToneClasses[markerTone] : connectorToneClasses.neutral,
                  )}
                />
              ) : null}

              <span
                className={cn(
                  'absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold',
                  isCompleted
                    ? currentMarkerToneClasses.success
                    : isCurrent
                      ? currentMarkerToneClasses[markerTone]
                      : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500',
                )}
              >
                {isCompleted ? <Icons.Check className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>

              <div className="flex min-h-7 items-center justify-between gap-3 rounded-[16px] border border-slate-200/65 bg-white/72 px-3 py-1.75 dark:border-slate-800 dark:bg-slate-950/45">
                <p className={cn('text-[0.88rem]', isCurrent || isCompleted ? 'font-medium text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400')}>
                  {step.label}
                </p>
                <span className={cn(
                  'text-[10px] font-semibold uppercase tracking-[0.11em]',
                  isCompleted
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : isCurrent
                      ? timeline.status.tone === 'warning'
                        ? 'text-amber-600 dark:text-amber-300'
                        : timeline.status.tone === 'success'
                          ? 'text-emerald-600 dark:text-emerald-300'
                          : timeline.status.tone === 'brand'
                            ? 'text-brand dark:text-brand-light'
                            : 'text-slate-500 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-500',
                )}>
                  {markerLabel}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};