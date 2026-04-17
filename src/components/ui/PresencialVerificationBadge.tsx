import { PRESENCIAL_VERIFICATION_LABEL } from '../../lib/propertyVerification';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

type PresencialVerificationBadgeSize = 'sm' | 'md';

type PresencialVerificationBadgeProps = {
  className?: string;
  size?: PresencialVerificationBadgeSize;
};

const sizeClasses: Record<PresencialVerificationBadgeSize, string> = {
  sm: 'gap-1.5 px-2.5 py-1.5 text-[11px]',
  md: 'gap-2 px-3 py-2 text-[12px]',
};

const iconClasses: Record<PresencialVerificationBadgeSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
};

export const PresencialVerificationBadge = ({
  className,
  size = 'sm',
}: PresencialVerificationBadgeProps) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-emerald-200/90 bg-white/94 font-semibold text-slate-900 shadow-[0_14px_28px_-22px_rgba(15,23,42,0.22)] backdrop-blur-sm',
        sizeClasses[size],
        className,
      )}
    >
      <Icons.Shield className={cn(iconClasses[size], 'text-emerald-700')} />
      <span>{PRESENCIAL_VERIFICATION_LABEL}</span>
    </div>
  );
};

export default PresencialVerificationBadge;