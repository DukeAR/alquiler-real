import React from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  heading: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  sticky?: boolean;
  action?: React.ReactNode;
  contentClassName?: string;
  headingClassName?: string;
  eyebrowClassName?: string;
  descriptionClassName?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  className,
  contentClassName,
  heading,
  eyebrow,
  description,
  onBack,
  backLabel = 'Volver',
  sticky = false,
  action,
  headingClassName,
  eyebrowClassName,
  descriptionClassName,
  ...props
}) => {
  return (
    <header
      className={cn(
        'flex items-center gap-4 py-4 px-2 sm:px-0',
        className
      )}
      style={{ fontFamily: 'var(--font-ui)' }}
      {...props}
    >
      {onBack ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={backLabel}
          className="shrink-0 rounded-full text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        >
          <Icons.ArrowLeft className="h-5 w-5" />
        </Button>
      ) : null}

      <div className={cn('min-w-0 flex-1 space-y-1', contentClassName)}>
        {eyebrow ? <p className={cn('app-eyebrow', eyebrowClassName)}>{eyebrow}</p> : null}
        <h1
          className={cn(
            'text-2xl font-bold text-[var(--color-primary)] leading-tight mb-1',
            headingClassName,
          )}
          style={{ lineHeight: 'var(--line-height-title)' }}
        >
          {heading}
        </h1>
        {description ? <p className={cn('text-[var(--color-text-soft)] text-base', descriptionClassName)}>{description}</p> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
};

export default PageHeader;
