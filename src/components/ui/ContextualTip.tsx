import React from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';

type ContextualTipTone = 'neutral' | 'brand' | 'success';

const toneClasses: Record<ContextualTipTone, string> = {
  neutral: 'border-slate-200/90 bg-slate-50/92 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300',
  brand: 'border-brand/15 bg-brand/6 text-slate-700 dark:border-brand/20 dark:bg-brand/10 dark:text-slate-200',
  success: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200',
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
      'rounded-[20px] border px-4 py-3',
      toneClasses[tone],
      compact && 'rounded-[18px] px-3.5 py-3',
      className,
    )}
  >
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{toneIconMap[tone]}</span>
      <div>
        {eyebrow ? (
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-current/70">{eyebrow}</p>
        ) : null}
        <p className={cn('text-sm leading-6 text-current/90', compact && 'text-[0.82rem] leading-5')}>
          {body}
        </p>
      </div>
    </div>
  </div>
);

export default ContextualTip;