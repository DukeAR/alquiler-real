import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-slate-200/80 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
  brand: 'border-brand/20 bg-brand/10 text-brand dark:border-brand/20 dark:bg-brand/15 dark:text-brand-light',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-400',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/30 dark:bg-sky-900/20 dark:text-sky-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'min-h-6 px-2.5 text-[11px]',
  md: 'min-h-7 px-3 text-xs',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'neutral', size = 'sm', ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium leading-none tracking-[0.01em]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
};

export default Badge;