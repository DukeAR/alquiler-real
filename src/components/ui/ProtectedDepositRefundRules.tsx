import React from 'react';
import {
  PROTECTED_DEPOSIT_REFUND_EXCLUSIONS,
  PROTECTED_DEPOSIT_REFUND_PRIMARY,
  PROTECTED_DEPOSIT_REFUND_SCOPE_NOTE,
} from '../../lib/platformTerms';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

type ProtectedDepositRefundRulesProps = {
  className?: string;
  detailLabel?: string;
};

export const ProtectedDepositRefundRules: React.FC<ProtectedDepositRefundRulesProps> = ({
  className,
  detailLabel = 'Ver detalle de devolución y alcance',
}) => {
  return (
    <div className={cn('rounded-[24px] border border-brand/15 bg-brand/5 p-4 text-slate-700', className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <Icons.ShieldAlert className="h-4 w-4" />
        </span>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Reglas de devolución</p>
          <p className="text-sm font-semibold leading-6 text-slate-950">{PROTECTED_DEPOSIT_REFUND_PRIMARY}</p>
        </div>
      </div>

      <details className="mt-4 rounded-[20px] border border-white/90 bg-white/95 px-4 py-3 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.16)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900">
          <span>{detailLabel}</span>
          <Icons.ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </summary>

        <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3 text-sm leading-6 text-slate-600">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">No corresponde devolución si</p>
            <ul className="mt-2 space-y-1.5">
              {PROTECTED_DEPOSIT_REFUND_EXCLUSIONS.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[16px] border border-slate-200/80 bg-slate-50 px-3.5 py-3 text-sm leading-6 text-slate-600">
            {PROTECTED_DEPOSIT_REFUND_SCOPE_NOTE}
          </div>
        </div>
      </details>
    </div>
  );
};

export default ProtectedDepositRefundRules;