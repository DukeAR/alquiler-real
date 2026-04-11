import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { TrustSignalsInline, type TrustSignal } from './TrustSignalsInline';

type ChatContextStatusTone = 'neutral' | 'brand' | 'success' | 'warning';

type ChatContextStatus = {
  label: string;
  tone: ChatContextStatusTone;
};

type ChatContextBarProps = {
  summary?: ReactNode;
  helper?: ReactNode;
  status?: ChatContextStatus | null;
  signals?: TrustSignal[];
  className?: string;
};

const statusClasses: Record<ChatContextStatusTone, { chip: string; dot: string }> = {
  neutral: {
    chip: 'border-slate-200/80 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  brand: {
    chip: 'border-brand/15 bg-brand/8 text-brand-dark dark:border-brand/25 dark:bg-brand/12 dark:text-brand-light',
    dot: 'bg-brand',
  },
  success: {
    chip: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  warning: {
    chip: 'border-amber-200/80 bg-amber-50/90 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
};

export const ChatContextBar = ({
  summary,
  helper,
  status,
  signals = [],
  className,
}: ChatContextBarProps) => {
  if (!summary && !helper && !status && signals.length === 0) {
    return null;
  }

  return (
    <div className={cn('border-b border-slate-100 bg-slate-50/75 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40 sm:px-6', className)}>
      <div className="mx-auto max-w-4xl space-y-3">
        {(summary || helper || status) ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              {summary ? <p className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-100">{summary}</p> : null}
              {helper ? <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{helper}</p> : null}
            </div>

            {status ? (
              <p className={cn('inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[11px] font-semibold', statusClasses[status.tone].chip)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', statusClasses[status.tone].dot)} />
                <span>Estado: {status.label}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {signals.length > 0 ? (
          <TrustSignalsInline signals={signals} compact />
        ) : null}
      </div>
    </div>
  );
};

export default ChatContextBar;