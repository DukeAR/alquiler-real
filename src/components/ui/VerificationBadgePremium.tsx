import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';

export type VerificationBadgePremiumSize = 'xs' | 'sm' | 'md';
export type VerificationBadgePremiumVariant = 'plain' | 'glass-card';

const PRESENCIAL_VERIFICATION_CARD_BADGE_SRC = '/verified-presencial-badge3.png';

type VerificationBadgePremiumProps = ComponentPropsWithoutRef<'span'> & {
  size?: VerificationBadgePremiumSize;
  alt?: string;
  variant?: VerificationBadgePremiumVariant;
};

const badgeClasses: Record<VerificationBadgePremiumVariant, Record<VerificationBadgePremiumSize, {
  container: string;
  mark: string;
}>> = {
  plain: {
    xs: {
      container: 'h-[50px] w-[44px]',
      mark: 'h-full w-full',
    },
    sm: {
      container: 'h-[58px] w-[51px]',
      mark: 'h-full w-full',
    },
    md: {
      container: 'h-[66px] w-[58px]',
      mark: 'h-full w-full',
    },
  },
  'glass-card': {
    xs: {
      container: 'rounded-[12px] bg-[rgba(255,255,255,0.85)] px-2 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-[6px] transition-transform duration-150 ease-out hover:scale-[1.03] group-hover:scale-[1.03]',
      mark: 'h-[56px] w-[49px]',
    },
    sm: {
      container: 'rounded-[12px] bg-[rgba(255,255,255,0.85)] px-2 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-[6px] transition-transform duration-150 ease-out hover:scale-[1.03] group-hover:scale-[1.03]',
      mark: 'h-[64px] w-[56px]',
    },
    md: {
      container: 'rounded-[12px] bg-[rgba(255,255,255,0.85)] px-2 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-[6px] transition-transform duration-150 ease-out hover:scale-[1.03] group-hover:scale-[1.03]',
      mark: 'h-[72px] w-[63px]',
    },
  },
};

export const VerificationBadgePremium = ({
  className,
  size = 'sm',
  alt = 'Verificado presencialmente',
  variant = 'plain',
  ...props
}: VerificationBadgePremiumProps) => {
  const classes = badgeClasses[variant][size];

  return (
    <span
      {...props}
      role="img"
      aria-label={alt}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        classes.container,
        className,
      )}
    >
      <img
        src={PRESENCIAL_VERIFICATION_CARD_BADGE_SRC}
        alt=""
        aria-hidden="true"
        className={cn('shrink-0 object-contain', classes.mark)}
      />
    </span>
  );
};

export default VerificationBadgePremium;