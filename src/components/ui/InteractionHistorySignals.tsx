import React from 'react';
import type { InteractionHistorySignal } from '../../types';
import { cn } from '../../lib/utils';

type InteractionHistorySignalsProps = {
  signals: InteractionHistorySignal[];
  emptyText?: string;
  className?: string;
  compact?: boolean;
};

export const InteractionHistorySignals: React.FC<InteractionHistorySignalsProps> = ({
  signals,
  emptyText = 'Todavía no hay suficientes cierres compartidos para resumir este historial.',
  className,
  compact = false,
}) => {
  if (signals.length === 0) {
    return <p className={cn('text-sm leading-6 text-slate-500 dark:text-slate-400', className)}>{emptyText}</p>;
  }

  return (
    <ul className={cn('space-y-2.5', className)}>
      {signals.map((signal) => (
        <li
          key={signal.key}
          className={cn(
            'flex items-start gap-3 rounded-[18px] border px-4 py-3',
            compact ? 'bg-white/90 dark:bg-slate-950/70' : 'bg-slate-50/85 dark:bg-slate-900/60',
            signal.tone === 'positive'
              ? 'border-emerald-200/70 text-slate-700 dark:border-emerald-900/40 dark:text-slate-200'
              : 'border-slate-200/80 text-slate-600 dark:border-slate-800 dark:text-slate-300',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
              signal.tone === 'positive'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400',
            )}
          >
            {signal.tone === 'positive' ? '✔' : '○'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-6">{signal.label}</p>
            {signal.detail ? <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{signal.detail}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default InteractionHistorySignals;