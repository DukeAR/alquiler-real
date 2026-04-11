import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export type SystemEventTone = 'neutral' | 'brand' | 'warning' | 'success';

type SystemEventAction = {
  label: ReactNode;
  onClick: () => void;
  loading?: boolean;
  loadingLabel?: ReactNode;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
};

type SystemEventMessageProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: SystemEventAction;
  tone?: SystemEventTone;
  compact?: boolean;
  align?: 'center' | 'left';
  className?: string;
};

const toneClasses: Record<SystemEventTone, string> = {
  neutral: 'border-slate-200/80 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
  brand: 'border-brand/15 bg-brand/6 text-slate-800 dark:border-brand/25 dark:bg-brand/12 dark:text-slate-100',
  warning: 'border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/30 dark:text-amber-100',
  success: 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-100',
};

export const SystemEventMessage = ({
  eyebrow,
  title,
  description,
  action,
  tone = 'neutral',
  compact = false,
  align = 'center',
  className,
}: SystemEventMessageProps) => (
  <div className={cn('mx-auto w-full max-w-xl rounded-[24px] border shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]', align === 'left' ? 'text-left' : 'text-center', toneClasses[tone], compact ? 'px-4 py-3' : 'px-4 py-4', className)}>
    {eyebrow ? (
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{eyebrow}</p>
    ) : null}
    <p className={cn('whitespace-pre-line font-semibold leading-6', eyebrow ? 'mt-1.5 text-sm' : compact ? 'text-xs' : 'text-sm')}>
      {title}
    </p>
    {description ? (
      <p className={cn('leading-5 text-slate-500 dark:text-slate-300', compact ? 'mt-1 text-xs' : 'mt-1.5 text-xs font-medium')}>
        {description}
      </p>
    ) : null}
    {action ? (
      <div className={cn('mt-3 flex', align === 'left' ? 'justify-start' : 'justify-center')}>
        <Button
          type="button"
          size="sm"
          variant={action.variant ?? (tone === 'neutral' ? 'secondary' : 'primary')}
          onClick={action.onClick}
          loading={action.loading}
          loadingLabel={action.loadingLabel ?? 'Procesando...'}
          className="rounded-full"
        >
          <>
            {action.icon}
            {action.label}
          </>
        </Button>
      </div>
    ) : null}
  </div>
);

export default SystemEventMessage;