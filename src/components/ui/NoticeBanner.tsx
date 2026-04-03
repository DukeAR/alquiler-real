import React from 'react';
import { Icons } from '../Icons';
import { cn } from '../../lib/utils';

type NoticeTone = 'success' | 'error' | 'info' | 'warning';

const toneClasses: Record<NoticeTone, string> = {
  success: 'border-emerald-200/80 bg-emerald-50/92 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400',
  error: 'border-red-200/80 bg-red-50/92 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400',
  info: 'border-blue-200/80 bg-blue-50/92 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-400',
  warning: 'border-amber-200/80 bg-amber-50/92 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400',
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
  heading,
  description,
  icon,
  ...props
}) => {
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-[24px] border p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.16)] md:p-5',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="mt-0.5 shrink-0">{icon ?? toneIcons[tone]}</div>
      <div className="space-y-1">
        <p className="text-[0.95rem] font-semibold leading-6 tracking-[-0.01em]">{heading}</p>
        {description ? <p className="app-body-sm leading-6 text-current/80">{description}</p> : null}
      </div>
    </div>
  );
};

export default NoticeBanner;