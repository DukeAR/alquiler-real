import React from 'react';
import { Icons } from './Icons';
import { cn } from '../lib/utils';

export interface LoadingStateProps {
  message?: string;
  description?: string;
  fullScreen?: boolean;
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando información...',
  description,
  fullScreen = false,
  compact = false,
}) => {
  const containerClass = fullScreen
    ? 'min-h-screen bg-[var(--color-bg)] px-6 py-16 flex items-center justify-center'
    : 'px-4 py-14 flex items-center justify-center';

  return (
    <div role="status" aria-live="polite" aria-busy="true" className={containerClass}>
      <div
        className={cn(
          'w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-lg',
          compact && 'max-w-md p-5',
        )}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] text-[var(--color-primary-accent)] shadow-md">
          <Icons.Loader2 className="h-8 w-8 animate-spin" />
        </div>

        <div className="mt-5 space-y-2">
          <p className="app-eyebrow text-[var(--color-primary-accent)]/80">Un momento</p>
          <h2 className={cn('text-lg font-semibold tracking-tight text-[var(--color-text)]', compact && 'text-base')}>
            {message}
          </h2>
          {description ? (
            <p className="mx-auto max-w-md text-sm leading-6 text-[var(--color-text-soft)]">{description}</p>
          ) : null}
        </div>

        <div className="mx-auto mt-6 grid max-w-xs gap-2" aria-hidden="true">
          <span className="h-2 rounded-full bg-[var(--color-border)] animate-pulse" />
          <span className="h-2 w-4/5 justify-self-center rounded-full bg-[var(--color-border)]/80 animate-pulse" />
          <span className="h-2 w-3/5 justify-self-center rounded-full bg-[var(--color-border)]/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
