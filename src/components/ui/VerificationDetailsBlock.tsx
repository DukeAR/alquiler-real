import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import {
  VerificationMeter,
  VerificationSnippetList,
  getVerificationSummaryItems,
  type VerificationSummaryLike,
} from './VerificationMeter';

type VerificationDetailsBlockProps = {
  summary: VerificationSummaryLike;
  title: ReactNode;
  description?: ReactNode;
  badgeLabel?: ReactNode;
  tone?: 'neutral' | 'brand' | 'success';
  className?: string;
  showDescriptions?: boolean;
};

export const VerificationDetailsBlock = ({
  summary,
  title,
  description,
  badgeLabel,
  tone = 'neutral',
  className,
  showDescriptions = true,
}: VerificationDetailsBlockProps) => {
  const completedItems = getVerificationSummaryItems(summary, { status: 'complete' });
  const pendingItems = getVerificationSummaryItems(summary, { status: 'pending' });

  return (
    <section className={cn('rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_22px_54px_-42px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/92 sm:p-6', className)}>
      <VerificationMeter
        summary={summary}
        eyebrow={title}
        helper={description}
        badgeLabel={badgeLabel}
        tone={tone}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Ya visible</p>
          <VerificationSnippetList
            summary={summary}
            status="complete"
            showDescriptions={showDescriptions}
            emptyText="Todavia no hay comprobaciones visibles en este momento."
          />
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Todavia no visible</p>
          {pendingItems.length > 0 ? (
            <VerificationSnippetList
              summary={summary}
              status="pending"
              showDescriptions={showDescriptions}
            />
          ) : (
            <p className="rounded-[18px] border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-200">
              Este bloque ya muestra todas las comprobaciones disponibles.
            </p>
          )}
        </div>
      </div>

      {completedItems.length === 0 && pendingItems.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">Todavia no hay datos estructurados para mostrar en este bloque.</p>
      ) : null}
    </section>
  );
};

export default VerificationDetailsBlock;