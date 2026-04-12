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
  return (
    <div className={clsx("mb-4", className)} style={{ fontFamily: 'var(--font-ui)' }}>
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
          {hint ? <p className="app-form-hint sm:text-right">{hint}</p> : null}
        </div>
      ) : null}
      {children}
      {helperText ? <p id={helperTextId} className="app-form-hint">{helperText}</p> : null}
      {error ? <p id={errorId} className="app-form-error" role="alert">{error}</p> : null}
    </div>
  );
};

export default FormField;