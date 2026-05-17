import React from 'react';
import {
  PROTECTED_DEPOSIT_SCOPE_DISCLAIMER,
  PROTECTED_DEPOSIT_SCOPE_LIMIT,
  PROTECTED_DEPOSIT_SCOPE_SUPPORT,
} from '../../lib/uxDisclaimers';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';
import { ContextualDisclaimer } from './ContextualDisclaimer';

type ProtectedDepositRefundRulesProps = {
  className?: string;
  detailLabel?: string;
};

export const ProtectedDepositRefundRules: React.FC<ProtectedDepositRefundRulesProps> = ({
  className,
  detailLabel = 'Ver alcance y revisión manual',
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      <ContextualDisclaimer
        eyebrow="Seña Protegida"
        title="Alcance operativo"
        tone="brand"
        body={PROTECTED_DEPOSIT_SCOPE_DISCLAIMER}
        supportingText={PROTECTED_DEPOSIT_SCOPE_SUPPORT}
      />

      <details className="rounded-[20px] border border-slate-200/85 bg-white/96 px-4 py-3 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900/72">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900">
          <span>{detailLabel}</span>
          <Icons.ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </summary>

        <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <div className="rounded-[16px] border border-slate-200/80 bg-slate-50 px-3.5 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/62 dark:text-slate-300">
            {PROTECTED_DEPOSIT_SCOPE_LIMIT}
          </div>
        </div>
      </details>
    </div>
  );
};

export default ProtectedDepositRefundRules;