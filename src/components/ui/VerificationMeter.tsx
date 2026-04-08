import type { ReactNode } from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';
import { Badge } from './Badge';

export type VerificationSummaryItemLike = {
  key: string;
  label: string;
  status: 'complete' | 'pending';
  description?: string;
};

export type VerificationSummaryLike = {
  score: number;
  maxScore?: number;
  items?: VerificationSummaryItemLike[];
};

type VerificationTone = 'neutral' | 'brand' | 'success';
type VerificationLayout = 'stacked' | 'inline';
type VerificationHighlightOrder = 'complete-first' | 'pending-first';

const toneClasses: Record<VerificationTone, { label: string; helper: string; visual: string }> = {
  neutral: {
    label: 'text-slate-950 dark:text-slate-50',
    helper: 'text-slate-500 dark:text-slate-400',
    visual: 'text-slate-500 dark:text-slate-300',
  },
  brand: {
    label: 'text-slate-950 dark:text-slate-50',
    helper: 'text-slate-600 dark:text-slate-300',
    visual: 'text-brand dark:text-brand-light',
  },
  success: {
    label: 'text-emerald-900 dark:text-emerald-200',
    helper: 'text-emerald-700 dark:text-emerald-300',
    visual: 'text-emerald-700 dark:text-emerald-300',
  },
};

const clampCount = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);

export const getVerificationSummaryScore = (summary: VerificationSummaryLike) => {
  const maxScore = clampCount(summary.maxScore || summary.items?.length || 0);
  const score = Math.min(clampCount(summary.score), maxScore || clampCount(summary.score));

  return {
    score,
    maxScore,
  };
};

export const getVerificationSummaryLabel = (summary: VerificationSummaryLike) => {
  const { score, maxScore } = getVerificationSummaryScore(summary);
  return `${score} de ${maxScore} comprobaciones`;
};

export const getVerificationSummaryVisual = (
  summary: VerificationSummaryLike,
  options?: { spaced?: boolean },
) => {
  const { score, maxScore } = getVerificationSummaryScore(summary);
  const visual = `${'✔'.repeat(score)}${'○'.repeat(Math.max(0, maxScore - score))}`;

  return options?.spaced ? visual.split('').join(' ') : visual;
};

export const getVerificationPendingCount = (summary: VerificationSummaryLike) => {
  const { score, maxScore } = getVerificationSummaryScore(summary);
  return Math.max(0, maxScore - score);
};

export const getVerificationHighlightItems = (
  summary: VerificationSummaryLike,
  options?: { limit?: number; order?: VerificationHighlightOrder },
) => {
  const items = Array.isArray(summary.items) ? [...summary.items] : [];
  const limit = Math.max(0, options?.limit ?? 3);
  const order = options?.order ?? 'complete-first';

  return items
    .sort((left, right) => {
      if (left.status === right.status) {
        return 0;
      }

      if (order === 'pending-first') {
        return left.status === 'pending' ? -1 : 1;
      }

      return left.status === 'complete' ? -1 : 1;
    })
    .slice(0, limit);
};

export type VerificationMeterProps = {
  summary: VerificationSummaryLike;
  eyebrow?: ReactNode;
  helper?: ReactNode;
  badgeLabel?: ReactNode;
  className?: string;
  tone?: VerificationTone;
  layout?: VerificationLayout;
  labelClassName?: string;
  helperClassName?: string;
  visualClassName?: string;
};

export const VerificationMeter = ({
  summary,
  eyebrow,
  helper,
  badgeLabel,
  className,
  tone = 'neutral',
  layout = 'stacked',
  labelClassName,
  helperClassName,
  visualClassName,
}: VerificationMeterProps) => {
  const label = getVerificationSummaryLabel(summary);
  const visual = getVerificationSummaryVisual(summary);
  const toneClass = toneClasses[tone];

  return (
    <div className={cn('min-w-0 space-y-2', className)}>
      {(eyebrow || badgeLabel) ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{eyebrow}</p> : <span />}
          {badgeLabel ? (
            <Badge
              variant="neutral"
              size="sm"
              className="border-indigo-200/80 bg-indigo-50/90 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              {badgeLabel}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {layout === 'inline' ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold', toneClass.label, labelClassName)}>{label}</p>
            {helper ? <p className={cn('mt-1 text-xs leading-5', toneClass.helper, helperClassName)}>{helper}</p> : null}
          </div>
          <span
            aria-label={label}
            className={cn('shrink-0 font-mono text-[11px] font-semibold tracking-[0.14em]', toneClass.visual, visualClassName)}
          >
            {visual}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <p className={cn('text-base font-semibold', toneClass.label, labelClassName)}>{label}</p>
            <span
              aria-label={label}
              className={cn('shrink-0 font-mono text-[12px] font-semibold tracking-[0.16em]', toneClass.visual, visualClassName)}
            >
              {visual}
            </span>
          </div>
          {helper ? <p className={cn('text-sm leading-6', toneClass.helper, helperClassName)}>{helper}</p> : null}
        </>
      )}
    </div>
  );
};

type VerificationHighlightsProps = {
  summary: VerificationSummaryLike;
  limit?: number;
  order?: VerificationHighlightOrder;
  className?: string;
};

export const VerificationHighlights = ({
  summary,
  limit = 3,
  order = 'complete-first',
  className,
}: VerificationHighlightsProps) => {
  const items = getVerificationHighlightItems(summary, { limit, order });

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => {
        const complete = item.status === 'complete';

        return (
          <span
            key={item.key}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium leading-none',
              complete
                ? 'border-emerald-200/90 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
                : 'border-slate-200/90 bg-slate-50/90 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
            )}
          >
            {complete ? <Icons.Check className="h-3.5 w-3.5" /> : <Icons.Circle className="h-3.5 w-3.5" />}
            <span>{item.label}</span>
          </span>
        );
      })}
    </div>
  );
};

export default VerificationMeter;