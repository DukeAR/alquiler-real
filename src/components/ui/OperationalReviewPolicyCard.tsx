import React from 'react';
import {
  CONFLICT_REVIEW_EVIDENCE_SOURCES,
  CONFLICT_REVIEW_FLOW_STEPS,
  CONFLICT_REVIEW_INTERVENTION_CASES,
  CONFLICT_REVIEW_OUT_OF_SCOPE_CASES,
  CONFLICT_REVIEW_POLICY_INTRO,
  CONFLICT_REVIEW_POLICY_LIMIT_NOTE,
  CONFLICT_REVIEW_POLICY_OBJECTIVE,
  CONFLICT_REVIEW_TRACEABILITY_FIELDS,
  type OperationalPolicyItem,
} from '../../lib/conflictReviewPolicy';
import { cn } from '../../lib/utils';

type OperationalReviewPolicyCardProps = {
  title?: string;
  className?: string;
  compact?: boolean;
  collapsible?: boolean;
};

const PolicySection = ({
  heading,
  items,
  compact,
}: {
  heading: string;
  items: OperationalPolicyItem[];
  compact: boolean;
}) => (
  <div className="space-y-2.5 rounded-[22px] border border-slate-200/80 bg-white/88 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/45">
    <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-400">{heading}</p>
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={`${heading}-${item.title}`} className="space-y-1">
          <p className={cn('text-sm font-semibold text-slate-900 dark:text-slate-100', compact && 'text-[0.82rem] leading-5')}>
            {item.title}
          </p>
          <p className={cn('text-sm leading-6 text-slate-600 dark:text-slate-300', compact && 'text-[0.8rem] leading-5')}>
            {item.description}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const PolicyCardBody = ({ compact }: { compact: boolean }) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <p className={cn('text-sm leading-6 text-slate-700 dark:text-slate-200', compact && 'text-[0.82rem] leading-5')}>
        {CONFLICT_REVIEW_POLICY_INTRO}
      </p>
      <p className={cn('text-xs leading-5 text-slate-500 dark:text-slate-400', compact && 'text-[0.76rem] leading-5')}>
        {CONFLICT_REVIEW_POLICY_LIMIT_NOTE}
      </p>
    </div>

    <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'xl:grid-cols-2')}>
      <PolicySection heading="Intervenimos cuando" items={CONFLICT_REVIEW_INTERVENTION_CASES} compact={compact} />
      <PolicySection heading="No intervenimos cuando" items={CONFLICT_REVIEW_OUT_OF_SCOPE_CASES} compact={compact} />
      <PolicySection heading="Flujo de revision" items={CONFLICT_REVIEW_FLOW_STEPS} compact={compact} />
      <PolicySection heading="Informacion que usamos" items={CONFLICT_REVIEW_EVIDENCE_SOURCES} compact={compact} />
      <PolicySection heading="Trazabilidad" items={CONFLICT_REVIEW_TRACEABILITY_FIELDS} compact={compact} />
    </div>

    <p className={cn('text-xs leading-5 text-slate-500 dark:text-slate-400', compact && 'text-[0.76rem] leading-5')}>
      {CONFLICT_REVIEW_POLICY_OBJECTIVE}
    </p>
  </div>
);

export const OperationalReviewPolicyCard: React.FC<OperationalReviewPolicyCardProps> = ({
  title = 'Politica operativa de conflictos y revisiones',
  className,
  compact = false,
  collapsible = false,
}) => {
  if (collapsible) {
    return (
      <details className={cn('rounded-[24px] border border-slate-200/85 bg-slate-50/75 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40', className)}>
        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </summary>
        <div className="mt-4">
          <PolicyCardBody compact={compact} />
        </div>
      </details>
    );
  }

  return (
    <div className={cn('rounded-[28px] border border-slate-200/85 bg-slate-50/78 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/40', className)}>
      <div className="space-y-2">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-slate-400">Politica operativa</p>
        <h2 className={cn('text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50', compact && 'text-lg')}>
          {title}
        </h2>
      </div>
      <div className="mt-4">
        <PolicyCardBody compact={compact} />
      </div>
    </div>
  );
};

export default OperationalReviewPolicyCard;