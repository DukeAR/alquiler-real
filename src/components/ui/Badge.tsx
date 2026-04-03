import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-slate-200/90 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
  brand: 'border-brand/15 bg-brand/10 text-brand-dark dark:border-brand/20 dark:bg-brand/15 dark:text-brand-light',
  success: 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400',
  warning: 'border-slate-200/90 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
  danger: 'border-red-200/80 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400',
  info: 'border-brand/15 bg-brand/10 text-brand-dark dark:border-brand/20 dark:bg-brand/15 dark:text-brand-light',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'min-h-6 px-2.5 text-[11px]',
  md: 'min-h-7 px-3.5 text-[11.5px]',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'neutral', size = 'sm', ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none tracking-[0.015em]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
};

export default Badge;