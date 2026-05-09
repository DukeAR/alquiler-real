import { type ReservationFlowTimeline } from '../../lib/reservationFlow';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

type ReservationOperationTimelineProps = {
  timeline: ReservationFlowTimeline;
  title?: string;
  className?: string;
};

const statusToneClasses = {
  neutral: 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  brand: 'border-brand/15 bg-brand/8 text-brand dark:border-brand/20 dark:bg-brand/10 dark:text-brand-light',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300',
} as const;

const currentMarkerToneClasses = {
  neutral: 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  brand: 'border-brand/20 bg-brand/10 text-brand dark:border-brand/25 dark:bg-brand/12 dark:text-brand-light',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300',
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
    <div className={cn('rounded-[24px] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/40', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{title}</p>
        <p className={cn('inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[11px] font-semibold', statusToneClasses[timeline.status.tone])}>
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

      <ol className="mt-4 space-y-3">
        {timeline.steps.map((step, index) => {
          const isCompleted = step.state === 'completed';
          const isCurrent = step.state === 'current';
          const isLast = index === timeline.steps.length - 1;
          const markerTone = isCurrent ? timeline.status.tone : isCompleted ? 'success' : 'neutral';
          const markerLabel = isCurrent ? 'Actual' : isCompleted ? 'Completado' : 'Pendiente';

          return (
            <li key={step.key} className="relative pl-10">
              {!isLast ? (
                <span
                  className={cn(
                    'absolute left-[15px] top-8 bottom-[-14px] w-px',
                    isCompleted ? connectorToneClasses.success : isCurrent ? connectorToneClasses[markerTone] : connectorToneClasses.neutral,
                  )}
                />
              ) : null}

              <span
                className={cn(
                  'absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                  isCompleted
                    ? currentMarkerToneClasses.success
                    : isCurrent
                      ? currentMarkerToneClasses[markerTone]
                      : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500',
                )}
              >
                {isCompleted ? <Icons.Check className="h-3.5 w-3.5" /> : <span className="h-2.5 w-2.5 rounded-full bg-current" />}
              </span>

              <div className="flex min-h-8 items-center justify-between gap-3 rounded-[18px] border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
                <p className={cn('text-sm', isCurrent || isCompleted ? 'font-semibold text-slate-900 dark:text-slate-50' : 'text-slate-500 dark:text-slate-400')}>
                  {step.label}
                </p>
                <span className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.12em]',
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