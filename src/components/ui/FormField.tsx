import React from 'react';
import { cn } from '../../lib/utils';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  hint?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  helperTextId?: string;
  errorId?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  className,
  label,
  hint,
  helperText,
  error,
  htmlFor,
  helperTextId,
  errorId,
  children,
  ...props
}) => {
  return (
    <div className={cn("mb-4", className)} style={{ fontFamily: 'var(--font-ui)' }} {...props}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--color-primary)] mb-1">
          {label}
          {hint && <span className="ml-2 text-xs text-[var(--color-text-soft)]">{hint}</span>}
        </label>
      )}
      {children}
      {helperText && !error && (
        <p id={helperTextId} className="mt-1 text-xs text-[var(--color-text-soft)]">
          {helperText}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;