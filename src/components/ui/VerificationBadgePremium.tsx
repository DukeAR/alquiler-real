import { PRESENCIAL_VERIFICATION_LABEL } from '../../lib/propertyVerification';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

export type VerificationBadgePremiumSize = 'sm' | 'md';

type VerificationBadgePremiumProps = {
  className?: string;
  size?: VerificationBadgePremiumSize;
};

const sizeClasses: Record<VerificationBadgePremiumSize, string> = {
  sm: 'gap-1.5 px-3 py-1.5 text-[11px]',
  md: 'gap-2 px-3.5 py-2 text-[12px]',
};

const iconClasses: Record<VerificationBadgePremiumSize, string> = {
  sm: 'h-3.25 w-3.25',
  md: 'h-3.75 w-3.75',
};

export const VerificationBadgePremium = ({
  className,
  size = 'sm',
}: VerificationBadgePremiumProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50/92 font-medium tracking-[-0.01em] text-emerald-950 shadow-[0_10px_20px_-18px_rgba(5,150,105,0.22)]',
        sizeClasses[size],
        className,
      )}
    >
      <Icons.ShieldCheck className={cn(iconClasses[size], 'shrink-0 text-emerald-700')} />
      <span>{PRESENCIAL_VERIFICATION_LABEL}</span>
    </div>
  );
};

export default VerificationBadgePremium;