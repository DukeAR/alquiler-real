import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-slate-200/80 bg-slate-50/80 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
  brand: 'border-brand/12 bg-brand/[0.06] text-brand-dark dark:border-brand/18 dark:bg-brand/[0.1] dark:text-brand-light',
  success: 'border-emerald-200/75 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/18 dark:text-emerald-400',
  warning: 'border-slate-200/80 bg-slate-50/75 text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300',
  danger: 'border-red-200/75 bg-red-50/80 text-red-700 dark:border-red-900/30 dark:bg-red-900/18 dark:text-red-400',
  info: 'border-brand/12 bg-brand/[0.06] text-brand-dark dark:border-brand/18 dark:bg-brand/[0.1] dark:text-brand-light',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'min-h-5.5 px-2.5 text-[10.5px]',
  md: 'min-h-6.5 px-3 text-[11px]',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'neutral', size = 'sm', children, ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-[var(--radius-badge)] border',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      style={{ fontFamily: 'var(--font-ui)' }}
      {...props}
    >
      {children}
    </span>
  );
};