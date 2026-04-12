import React from 'react';
import { cn } from '../../lib/utils';
import { FormField } from './FormField';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
  fieldClassName?: string;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    fieldClassName,
    wrapperClassName,
    label,
    hint,
    helperText,
    error,
    icon,
    endAdornment,
    type = 'text',
    id,
    disabled,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    ...props
  }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? `input-${generatedId}`;
    const helperTextId = helperText ? `${inputId}-helper` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, helperTextId, errorId].filter(Boolean).join(' ') || undefined;
    const hasError = Boolean(error) || ariaInvalid === true || ariaInvalid === 'true';
    const shouldWrapField = Boolean(label || hint || helperText || error);

    const control = (
      <div className={cn('relative', wrapperClassName)}>
        {icon ? (
          <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        ) : null}
            <input
              ref={ref}
              id={inputId}
              type={type}
              disabled={disabled}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              className={cn(
                'app-control px-4 py-3 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-900/80 dark:disabled:text-slate-500',
                icon && 'pl-12',
                endAdornment && 'pr-12',
                hasError && 'border-red-300 bg-red-50/60 text-slate-900 placeholder:text-red-300 hover:border-red-400 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(248,113,113,0.16)] dark:border-red-900/50 dark:bg-red-950/20 dark:text-white dark:hover:border-red-800/70',
                className,
              )}
              style={{ ...style, fontFamily: 'var(--font-ui)' }}
              {...props}
            />
        {endAdornment ? (
          <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">{endAdornment}</div>
        ) : null}
      </div>
    );

    if (shouldWrapField) {
      return (
        <FormField
          label={label ?? null}
          hint={hint}
          helperText={helperText}
          error={error}
          htmlFor={inputId}
          helperTextId={helperTextId}
          errorId={errorId}
          className={fieldClassName}
        >
          {control}
        </FormField>
      );
    }

    return control;
  },
);

Input.displayName = 'Input';

export default Input;