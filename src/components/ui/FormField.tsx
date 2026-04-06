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
  const LabelTag = htmlFor ? 'label' : 'div';
  const hasHeader = Boolean(label) || Boolean(hint);

  return (
    <div className={cn('space-y-2.5', className)} {...props}>
      {hasHeader ? (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          {label ? (
            <LabelTag htmlFor={htmlFor} className={cn('app-form-label', htmlFor && 'cursor-pointer')}>
              {label}
            </LabelTag>
          ) : <div />}
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