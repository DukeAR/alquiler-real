import type { ReactNode } from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';
import { getVerificationLevelSummaryLabel } from '../../lib/verificationPresentation';
import { Badge } from './Badge';
import { VerificationSeal } from './VerificationSeal';

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
type VerificationSummaryItemStatusFilter = 'complete' | 'pending' | 'all';

const toneClasses: Record<VerificationTone, { helper: string }> = {
  neutral: {
    helper: 'text-slate-500 dark:text-slate-400',
  },
  brand: {
    helper: 'text-slate-600 dark:text-slate-300',
  },
  success: {
    helper: 'text-emerald-700 dark:text-emerald-300',
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
  return getVerificationLevelSummaryLabel(score, maxScore);
};

export const getVerificationPendingCount = (summary: VerificationSummaryLike) => {
  const { score, maxScore } = getVerificationSummaryScore(summary);
  return Math.max(0, maxScore - score);
};

export const getVerificationSummaryItems = (
  summary: VerificationSummaryLike,
  options?: { status?: VerificationSummaryItemStatusFilter; limit?: number },
) => {
  const items = Array.isArray(summary.items) ? [...summary.items] : [];
  const status = options?.status ?? 'all';
  const filteredItems = status === 'all'
    ? items
    : items.filter((item) => item.status === status);

  if (typeof options?.limit === 'number') {
    return filteredItems.slice(0, Math.max(0, options.limit));
  }

  return filteredItems;
};

export const getVerificationHighlightItems = (
  summary: VerificationSummaryLike,
  options?: { limit?: number; order?: VerificationHighlightOrder },
) => {
  const items = getVerificationSummaryItems(summary);
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
  const { score, maxScore } = getVerificationSummaryScore(summary);
  const label = getVerificationSummaryLabel(summary);
  const compactLabel = getVerificationLevelSummaryLabel(score, maxScore, { includeCount: false });
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
        <div className="space-y-2">
          <VerificationSeal
            score={score}
            maxScore={maxScore}
            label={compactLabel}
            size="sm"
            ariaLabel={label}
          />
          {helper ? <p className={cn('text-xs leading-5', toneClass.helper, helperClassName)}>{helper}</p> : null}
        </div>
      ) : (
        <>
          <VerificationSeal
            score={score}
            maxScore={maxScore}
            label={compactLabel}
            size="md"
            ariaLabel={label}
            className={cn(labelClassName, visualClassName)}
          />
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

type VerificationSnippetListProps = {
  summary: VerificationSummaryLike;
  status?: VerificationSummaryItemStatusFilter;
  limit?: number;
  showDescriptions?: boolean;
  className?: string;
  itemClassName?: string;
  emptyText?: ReactNode;
};

export const VerificationSnippetList = ({
  summary,
  status = 'all',
  limit,
  showDescriptions = true,
  className,
  itemClassName,
  emptyText,
}: VerificationSnippetListProps) => {
  const items = getVerificationSummaryItems(summary, { status, limit });

  if (items.length === 0) {
    return emptyText ? (
      <p className={cn('rounded-[18px] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400', className)}>
        {emptyText}
      </p>
    ) : null;
  }

  return (
    <ul className={cn('grid gap-2.5', className)}>
      {items.map((item) => {
        const complete = item.status === 'complete';

        return (
          <li
            key={item.key}
            className={cn(
              'flex items-start gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/85 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70',
              itemClassName,
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                complete
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
              )}
              aria-hidden="true"
            >
              {complete ? '✔' : '○'}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-slate-900 dark:text-slate-50">{item.label}</p>
              {showDescriptions && item.description ? (
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default VerificationMeter;