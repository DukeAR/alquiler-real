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
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  className,
  contentClassName,
  heading,
  eyebrow,
  description,
  onBack,
  backLabel = 'Volver',
  sticky = true,
  action,
  ...props
}) => {
  return (
    <header
      className={cn(
        'border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80',
        sticky && 'sticky top-0 z-50',
        className,
      )}
      {...props}
    >
      <div className={cn('flex items-start gap-4 px-4 py-4', contentClassName)}>
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

        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
          <h1 className="app-title-4 dark:text-slate-50">{heading}</h1>
          {description ? <p className="app-body-sm app-text-muted dark:text-slate-400">{description}</p> : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
};

export default PageHeader;