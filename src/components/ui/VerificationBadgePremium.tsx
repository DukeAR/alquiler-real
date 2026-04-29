import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/utils';
import { PresencialVerificationSealMark } from './PresencialVerificationSealMark';

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
    mark: 'h-[30px] w-[30px]',
    text: 'text-[13px]',
  },
  sm: {
    container: 'gap-2 px-3 py-1.5',
    mark: 'h-[34px] w-[34px]',
    text: 'text-[14px]',
    },
  md: {
    container: 'gap-3 px-4 py-2.5',
    mark: 'h-[40px] w-[40px]',
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
      <PresencialVerificationSealMark
        alt=""
        aria-hidden="true"
        className={cn('shrink-0', classes.mark)}
      />
      <span className={cn('font-semibold leading-none tracking-[-0.02em]', classes.text)}>
        Verificado presencialmente
      </span>
    </span>
  );
};

export default VerificationBadgePremium;