import type { ReactNode } from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';

export type TrustSignalTone = 'neutral' | 'brand' | 'success';

export type TrustSignal = {
  key: string;
  label: string;
  detail?: ReactNode;
  tone?: TrustSignalTone;
  icon?: ReactNode;
};

type TrustSignalSourceItem = {
  key: string;
  label: string;
  description?: string;
  status?: 'complete' | 'pending';
};

type InteractionSignalLike = {
  key: string;
  label: string;
  detail?: string;
};

type TrustSignalsInlineProps = {
  signals: TrustSignal[];
  title?: ReactNode;
  emptyText?: ReactNode;
  className?: string;
  compact?: boolean;
};

const toneClasses: Record<TrustSignalTone, { chip: string; dot: string }> = {
  neutral: {
    chip: 'border-slate-200/80 bg-slate-50/85 text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
  brand: {
    chip: 'border-brand/15 bg-brand/6 text-slate-800 dark:border-brand/25 dark:bg-brand/12 dark:text-slate-100',
    dot: 'bg-brand',
  },
  success: {
    chip: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
};

const withSignalTone = (signal: TrustSignal, fallbackTone: TrustSignalTone = 'neutral'): TrustSignal => ({
  ...signal,
  tone: signal.tone ?? fallbackTone,
});

export const getTrustSignalsFromItems = (
  items: TrustSignalSourceItem[],
  options?: { limit?: number; onlyComplete?: boolean; tone?: TrustSignalTone },
) => {
  const limit = Math.max(0, options?.limit ?? 3);
  const onlyComplete = options?.onlyComplete ?? true;

  return items
    .filter((item) => !onlyComplete || item.status === 'complete')
    .slice(0, limit)
    .map((item) => withSignalTone({ key: item.key, label: item.label }, options?.tone));
};

export const getTrustSignalsFromInteractionHistory = (
  signals: InteractionSignalLike[],
  options?: { limit?: number; tone?: TrustSignalTone },
) => {
  const limit = Math.max(0, options?.limit ?? 3);

  return signals
    .slice(0, limit)
    .map((signal) => withSignalTone({ key: signal.key, label: signal.label }, options?.tone));
};

export const TrustSignalsInline = ({
  signals,
  title,
  emptyText,
  className,
  compact = false,
}: TrustSignalsInlineProps) => {
  const visibleSignals = signals.filter((signal) => Boolean(signal?.label));

  if (visibleSignals.length === 0) {
    return emptyText ? (
      <div className={cn('space-y-2', className)}>
        {title ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{title}</p> : null}
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{emptyText}</p>
      </div>
    ) : null;
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      {title ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{title}</p> : null}

      <ul className={cn('flex flex-wrap', compact ? 'gap-2' : 'gap-2.5')} role="list">
        {visibleSignals.map((signal) => {
          const tone = signal.tone ?? 'neutral';

          return (
            <li
              key={signal.key}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm leading-5 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.2)]',
                compact ? 'text-[12px] font-medium' : 'font-semibold',
                toneClasses[tone].chip,
              )}
            >
              {signal.icon ? (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                  {signal.icon}
                </span>
              ) : tone === 'success' ? (
                <Icons.Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <span className={cn('h-2 w-2 shrink-0 rounded-full', toneClasses[tone].dot)} aria-hidden="true" />
              )}
              <span>{signal.label}</span>
              {signal.detail ? <span className="text-slate-400 dark:text-slate-500">{signal.detail}</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TrustSignalsInline;