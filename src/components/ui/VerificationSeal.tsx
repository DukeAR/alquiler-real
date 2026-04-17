import { cn } from '../../lib/utils';
import {
  getVerificationCountLabel,
  getVerificationIdentityTone,
  type VerificationIdentityTone,
} from '../../lib/verificationPresentation';
import { Icons } from '../Icons';

type VerificationSealSize = 'sm' | 'md' | 'lg';

type VerificationSealProps = {
  score: number;
  maxScore?: number;
  label: string;
  description?: string;
  className?: string;
  size?: VerificationSealSize;
  emphasized?: boolean;
  showCount?: boolean;
  ariaLabel?: string;
};

const sizeClasses: Record<VerificationSealSize, {
  wrapper: string;
  chip: string;
  icon: string;
  checkBubble: string;
  checkIcon: string;
  label: string;
  count: string;
  description: string;
}> = {
  sm: {
    wrapper: 'gap-2.5',
    chip: 'h-10 w-10 rounded-[14px]',
    icon: 'h-5 w-5',
    checkBubble: 'h-[18px] w-[18px] -bottom-1 -right-1 rounded-full',
    checkIcon: 'h-2.5 w-2.5',
    label: 'text-[13px]',
    count: 'text-[12px]',
    description: 'text-[11.5px] leading-4',
  },
  md: {
    wrapper: 'gap-3',
    chip: 'h-11 w-11 rounded-[16px]',
    icon: 'h-5.5 w-5.5',
    checkBubble: 'h-5 w-5 -bottom-1 -right-1 rounded-full',
    checkIcon: 'h-2.5 w-2.5',
    label: 'text-sm',
    count: 'text-[12.5px]',
    description: 'text-[12.5px] leading-5',
  },
  lg: {
    wrapper: 'gap-3.5',
    chip: 'h-12 w-12 rounded-[18px]',
    icon: 'h-6 w-6',
    checkBubble: 'h-5 w-5 -bottom-1 -right-1 rounded-full',
    checkIcon: 'h-2.5 w-2.5',
    label: 'text-[15px]',
    count: 'text-[13px]',
    description: 'text-sm leading-5',
  },
};

const toneClasses: Record<VerificationIdentityTone, {
  chip: string;
  icon: string;
  checkBubble: string;
  label: string;
  count: string;
  description: string;
}> = {
  high: {
    chip: 'border-emerald-200/90 bg-emerald-50/95',
    icon: 'text-emerald-700',
    checkBubble: 'border border-white/90 bg-emerald-600 text-white shadow-[0_10px_22px_-14px_rgba(5,150,105,0.6)]',
    label: 'text-emerald-900',
    count: 'text-emerald-700',
    description: 'text-slate-600',
  },
  medium: {
    chip: 'border-slate-200/90 bg-white/96',
    icon: 'text-slate-700',
    checkBubble: 'border border-white/90 bg-slate-700 text-white shadow-[0_10px_22px_-14px_rgba(15,23,42,0.35)]',
    label: 'text-slate-900',
    count: 'text-slate-500',
    description: 'text-slate-600',
  },
  low: {
    chip: 'border-slate-200/90 bg-slate-100/95',
    icon: 'text-slate-500',
    checkBubble: 'border border-white/90 bg-slate-500 text-white shadow-[0_10px_22px_-14px_rgba(15,23,42,0.3)]',
    label: 'text-slate-700',
    count: 'text-slate-500',
    description: 'text-slate-500',
  },
};

export const VerificationSeal = ({
  score,
  maxScore = 5,
  label,
  description,
  className,
  size = 'md',
  emphasized = false,
  showCount = true,
  ariaLabel,
}: VerificationSealProps) => {
  const tone = getVerificationIdentityTone(score, maxScore);
  const scale = sizeClasses[size];
  const palette = toneClasses[tone];
  const countLabel = getVerificationCountLabel(score, maxScore);
  const accessibleLabel = ariaLabel ? { 'aria-label': ariaLabel } : {};

  return (
    <div
      {...accessibleLabel}
      className={cn('inline-flex items-start', scale.wrapper, className)}
    >
      <span className={cn('relative inline-flex shrink-0 items-center justify-center border shadow-[0_16px_30px_-24px_rgba(15,23,42,0.28)]', scale.chip, palette.chip)}>
        <Icons.Shield className={cn(scale.icon, palette.icon, emphasized && tone === 'high' && 'text-emerald-800')} />
        <span className={cn('absolute inline-flex items-center justify-center', scale.checkBubble, palette.checkBubble)}>
          <Icons.Check className={scale.checkIcon} />
        </span>
      </span>

      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('font-semibold tracking-[-0.01em]', scale.label, palette.label, emphasized && tone === 'high' && 'text-emerald-950')}>
            {label}
          </span>
          {showCount ? (
            <span className={cn('font-medium', scale.count, palette.count)}>
              ({countLabel})
            </span>
          ) : null}
        </span>
        {description ? (
          <span className={cn('mt-1 block', scale.description, palette.description)}>
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
};

export default VerificationSeal;