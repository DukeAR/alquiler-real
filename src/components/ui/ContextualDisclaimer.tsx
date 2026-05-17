import React from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';

type ContextualDisclaimerTone = 'neutral' | 'brand';

const toneClasses: Record<ContextualDisclaimerTone, string> = {
  neutral: 'border-slate-200/85 bg-slate-50/88 text-slate-700 dark:border-slate-800 dark:bg-slate-900/68 dark:text-slate-300',
  brand: 'border-brand/14 bg-brand/5 text-slate-700 dark:border-brand/18 dark:bg-brand/8 dark:text-slate-200',
};

type ContextualDisclaimerProps = {
  eyebrow?: string | null;
  title?: string | null;
  body: React.ReactNode;
  supportingText?: React.ReactNode;
  tone?: ContextualDisclaimerTone;
  compact?: boolean;
  className?: string;
};

export const ContextualDisclaimer: React.FC<ContextualDisclaimerProps> = ({
  eyebrow,
  title,
  body,
  supportingText,
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
      <span className="mt-0.5 shrink-0 text-current/55">
        <Icons.Info className="h-4 w-4" />
      </span>
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-current/70">{eyebrow}</p>
        ) : null}
        {title ? (
          <p className={cn('text-sm font-semibold leading-6 text-slate-950 dark:text-slate-50', compact && 'text-[0.82rem] leading-5')}>
            {title}
          </p>
        ) : null}
        <p className={cn('text-sm leading-6 text-current/90', compact && 'text-[0.82rem] leading-5')}>
          {body}
        </p>
        {supportingText ? (
          <p className={cn('text-sm leading-6 text-current/75', compact && 'text-[0.8rem] leading-5')}>
            {supportingText}
          </p>
        ) : null}
      </div>
    </div>
  </div>
);

export default ContextualDisclaimer;