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
      container: 'rounded-[10px] bg-[rgba(255,255,255,0.78)] px-1.5 py-1 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.16)] backdrop-blur-[4px] transition-transform duration-150 ease-out hover:scale-[1.01] group-hover:scale-[1.01]',
      mark: 'h-[47px] w-[41px]',
    },
    sm: {
      container: 'rounded-[10px] bg-[rgba(255,255,255,0.78)] px-1.5 py-1 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.16)] backdrop-blur-[4px] transition-transform duration-150 ease-out hover:scale-[1.01] group-hover:scale-[1.01]',
      mark: 'h-[54px] w-[47px]',
    },
    md: {
      container: 'rounded-[10px] bg-[rgba(255,255,255,0.78)] px-1.5 py-1 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.16)] backdrop-blur-[4px] transition-transform duration-150 ease-out hover:scale-[1.01] group-hover:scale-[1.01]',
      mark: 'h-[61px] w-[53px]',
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