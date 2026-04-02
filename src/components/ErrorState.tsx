import React from 'react';
import { Icons } from './Icons';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

export interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  fullScreen?: boolean;
  retryLabel?: string;
  dismissLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  onRetry,
  onDismiss,
  fullScreen = false,
  retryLabel = 'Intentar de nuevo',
  dismissLabel = 'Cerrar',
}) => {
  const containerClass = fullScreen
    ? 'min-h-screen bg-slate-50 px-6 py-16 dark:bg-slate-950 flex items-center justify-center'
    : 'py-8';

  return (
    <div role="alert" aria-live="assertive" className={containerClass}>
      <Card
        variant="elevated"
        padding="lg"
        className={cn(
          'w-full max-w-xl border border-red-100/90 bg-white/96 text-center shadow-[0_32px_72px_-42px_rgba(127,29,29,0.34)] dark:border-red-900/30 dark:bg-slate-900',
          !fullScreen && 'bg-red-50/55 dark:bg-red-950/12',
        )}
      >
        <div className="space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-red-200 bg-red-50 text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400">
            <Icons.AlertTriangle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <p className="app-eyebrow text-red-500/80">Algo no salió como esperábamos</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-3xl">{title}</h1>
            {description ? (
              <p className="mx-auto max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400 md:text-base">
                {description}
              </p>
            ) : null}
          </div>

          {(onRetry || onDismiss) ? (
            <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
              {onRetry ? (
                <Button onClick={onRetry} aria-label={`${retryLabel}: ${title}`}>
                  {retryLabel}
                </Button>
              ) : null}
              {onDismiss ? (
                <Button
                  onClick={onDismiss}
                  aria-label={`${dismissLabel}: ${title}`}
                  variant="secondary"
                >
                  {dismissLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
};
