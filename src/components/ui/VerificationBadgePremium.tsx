import { PRESENCIAL_VERIFICATION_LABEL } from '../../lib/propertyVerification';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

export type VerificationBadgePremiumSize = 'sm' | 'md';

type VerificationBadgePremiumProps = {
  className?: string;
  size?: VerificationBadgePremiumSize;
};

const sizeClasses: Record<VerificationBadgePremiumSize, string> = {
  sm: 'gap-2 px-4 py-2 text-[11.5px]',
  md: 'gap-2.5 px-4.5 py-2.5 text-[12.5px]',
};

const iconClasses: Record<VerificationBadgePremiumSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

export const VerificationBadgePremium = ({
  className,
  size = 'sm',
}: VerificationBadgePremiumProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-emerald-200/90 bg-emerald-50/96 font-medium tracking-[-0.01em] text-emerald-950 shadow-[0_14px_28px_-22px_rgba(5,150,105,0.28)]',
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