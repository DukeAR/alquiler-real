import React from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';

type ContextualTipTone = 'neutral' | 'brand' | 'success';

const toneClasses: Record<ContextualTipTone, string> = {
  neutral: 'border-slate-200/80 bg-slate-50/75 text-slate-600 dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-300',
  brand: 'border-brand/12 bg-brand/[0.045] text-slate-600 dark:border-brand/18 dark:bg-brand/[0.08] dark:text-slate-200',
  success: 'border-emerald-200/75 bg-emerald-50/75 text-emerald-800 dark:border-emerald-900/35 dark:bg-emerald-900/18 dark:text-emerald-200',
};

const toneIconMap: Record<ContextualTipTone, React.ReactNode> = {
  neutral: <Icons.Info className="h-4 w-4" />,
  brand: <Icons.ShieldCheck className="h-4 w-4" />,
  success: <Icons.CheckCircle2 className="h-4 w-4" />,
};

type ContextualTipProps = {
  eyebrow?: string | null;
  body: React.ReactNode;
  tone?: ContextualTipTone;
  compact?: boolean;
  className?: string;
};

export const ContextualTip: React.FC<ContextualTipProps> = ({
  eyebrow,
  body,
  tone = 'neutral',
  compact = false,
  className,
}) => (
  <div
    className={cn(
      'rounded-[18px] border px-3.5 py-2.5',
      toneClasses[tone],
      compact && 'rounded-[16px] px-3 py-2.5',
      className,
    )}
  >
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-current/68">{toneIconMap[tone]}</span>
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-current/62">{eyebrow}</p>
        ) : null}
        <p className={cn('text-[0.84rem] leading-5 text-current/88', compact && 'text-[0.78rem] leading-[1.35rem]')}>
          {body}
        </p>
      </div>
    </div>
  </div>
);

export default ContextualTip;