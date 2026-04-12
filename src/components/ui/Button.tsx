import React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'auto';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-[var(--app-shadow-brand)] hover:bg-brand-dark hover:shadow-[0_22px_42px_-28px_rgba(55,48,163,0.42)] disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none',
  secondary: 'border border-slate-200/90 bg-white text-slate-700 shadow-[var(--app-shadow-subtle)] hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-[var(--app-shadow-soft)] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800',
  outline: 'border border-slate-200/90 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-[var(--app-shadow-subtle)] disabled:text-slate-400 disabled:shadow-none dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800/80',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 disabled:text-slate-300 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-4 text-[0.925rem]',
  lg: 'h-12 px-5 text-[0.98rem]',
  icon: 'h-10 w-10 p-0',
  auto: 'h-auto px-0 py-0',
};

const loadingClasses: Record<ButtonVariant, string> = {
  primary: 'disabled:bg-brand disabled:text-white disabled:opacity-90 disabled:shadow-[var(--app-shadow-brand)]',
  secondary: 'disabled:border-slate-200 disabled:bg-white disabled:text-slate-700 disabled:opacity-80 dark:disabled:border-slate-700 dark:disabled:bg-slate-900 dark:disabled:text-slate-100',
  outline: 'disabled:border-slate-200 disabled:bg-white/80 disabled:text-slate-700 disabled:opacity-80 dark:disabled:border-slate-700 dark:disabled:bg-slate-800/80 dark:disabled:text-slate-100',
  ghost: 'disabled:bg-transparent disabled:text-slate-600 disabled:opacity-80 dark:disabled:text-slate-300',
};


export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
	loading?: boolean;
	loadingLabel?: React.ReactNode;
	success?: boolean;
	successLabel?: React.ReactNode;
}


export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      loadingLabel,
      success = false,
      successLabel,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={props.type || 'button'}
        disabled={props.disabled || loading}
        aria-busy={loading || undefined}
        data-loading={loading ? 'true' : undefined}
        data-success={success ? 'true' : undefined}
        className={cn(
          'app-button-base shrink-0 whitespace-nowrap rounded-[var(--app-radius-control)] focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
          variantClasses[variant],
          loading && loadingClasses[variant],
          success && 'bg-emerald-500 text-white shadow-[0_22px_50px_-28px_rgba(16,185,129,0.58)] hover:bg-emerald-500 hover:shadow-[0_22px_50px_-28px_rgba(16,185,129,0.58)] disabled:bg-emerald-500 disabled:text-white disabled:opacity-100 disabled:shadow-[0_22px_50px_-28px_rgba(16,185,129,0.58)]',
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        style={{ ...(props.style || {}), fontFamily: 'var(--font-ui)' }}
        {...props}
      >
        {loading
          ? loadingLabel || <span className="loader mr-2" />
          : success
          ? successLabel || <span className="inline-block align-middle mr-2">✓</span>
          : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';