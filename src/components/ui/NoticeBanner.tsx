import React from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';

type NoticeTone = 'success' | 'error' | 'info' | 'warning';

const toneClasses: Record<NoticeTone, string> = {
  success: 'border-emerald-200/80 bg-emerald-50/92 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400',
  error: 'border-red-200/80 bg-red-50/92 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400',
  info: 'border-brand/15 bg-brand/5 text-slate-700 dark:border-brand/20 dark:bg-brand/10 dark:text-slate-200',
  warning: 'border-slate-200/90 bg-slate-50/92 text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300',
};

const toneIcons: Record<NoticeTone, React.ReactNode> = {
  success: <Icons.Check className="h-5 w-5" />,
  error: <Icons.AlertTriangle className="h-5 w-5" />,
  info: <Icons.Info className="h-5 w-5" />,
  warning: <Icons.ShieldAlert className="h-5 w-5" />,
};

export interface NoticeBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: NoticeTone;
  heading: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  className,
  tone = 'info',
  return (
    <div
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] border",
        {
          'bg-[var(--color-primary-soft)] border-[var(--color-primary-accent)] text-[var(--color-primary-accent)]': variant === 'info',
          'bg-[var(--color-success)] border-[var(--color-success)] text-white': variant === 'success',
          'bg-[var(--color-danger)] border-[var(--color-danger)] text-white': variant === 'danger',
          'bg-[var(--color-warning)] border-[var(--color-warning)] text-white': variant === 'warning',
        },
        className
      )}
      style={{ fontFamily: 'var(--font-ui)' }}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
        {description ? <p className="app-body-sm leading-6 text-current/80">{description}</p> : null}
      </div>
    </div>
  );
};

export default NoticeBanner;