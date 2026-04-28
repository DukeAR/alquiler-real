import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';

export type VerificationBadgePremiumSize = 'xs' | 'sm' | 'md';

type VerificationBadgePremiumProps = ComponentPropsWithoutRef<'span'> & {
  size?: VerificationBadgePremiumSize;
  alt?: string;
};

const badgeClasses: Record<VerificationBadgePremiumSize, {
  container: string;
  mark: string;
  text: string;
}> = {
  xs: {
    container: 'gap-1.5 px-2.5 py-[5px]',
    mark: 'h-[30px] w-[34px]',
    text: 'text-[13px]',
  },
  sm: {
    container: 'gap-2 px-3 py-1.5',
    mark: 'h-[34px] w-[39px]',
    text: 'text-[14px]',
    },
  md: {
    container: 'gap-3 px-4 py-2.5',
    mark: 'h-[40px] w-[46px]',
    text: 'text-base',
  },
};

export const VerificationBadgePremium = ({
  className,
  size = 'sm',
  alt = 'Verificado presencialmente',
  ...props
}: VerificationBadgePremiumProps) => {
  const classes = badgeClasses[size];

  return (
    <span
      {...props}
      role="img"
      aria-label={alt}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full bg-[rgba(253,253,253,0.76)] text-slate-700 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.55)] transition-transform duration-200 hover:-translate-y-0.5',
        classes.container,
        className,
      )}
    >
      <img
        src="/verified-presencial-badge3.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className={cn('shrink-0 object-contain', classes.mark)}
      />
      <span className={cn('font-semibold leading-none tracking-[-0.02em]', classes.text)}>
        Verificado presencialmente
      </span>
    </span>
  );
};

export default VerificationBadgePremium;