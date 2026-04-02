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
    ? 'min-h-screen bg-slate-50 px-6 py-16 dark:bg-slate-950 flex items-center justify-center'
    : 'px-4 py-14 flex items-center justify-center';

  return (
    <div role="status" aria-live="polite" aria-busy="true" className={containerClass}>
      <div
        className={cn(
          'w-full max-w-lg rounded-[32px] border border-slate-200/80 bg-white/95 p-6 text-center shadow-[0_28px_60px_-38px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/95',
          compact && 'max-w-md p-5',
        )}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-brand/20 bg-brand/10 text-brand shadow-[0_18px_40px_-28px_rgba(14,165,233,0.45)] dark:border-brand/30 dark:bg-brand/15">
          <Icons.Loader2 className="h-8 w-8 animate-spin" />
        </div>

        <div className="mt-5 space-y-2">
          <p className="app-eyebrow text-brand/80">Un momento</p>
          <h2 className={cn('text-lg font-semibold tracking-tight text-slate-900 dark:text-white', compact && 'text-base')}>
            {message}
          </h2>
          {description ? (
            <p className="mx-auto max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
          ) : null}
        </div>

        <div className="mx-auto mt-6 grid max-w-xs gap-2" aria-hidden="true">
          <span className="h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/80 animate-pulse" />
          <span className="h-2 w-4/5 justify-self-center rounded-full bg-slate-200/70 dark:bg-slate-700/70 animate-pulse" />
          <span className="h-2 w-3/5 justify-self-center rounded-full bg-slate-200/60 dark:bg-slate-700/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
