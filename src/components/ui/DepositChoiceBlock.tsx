import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

type DepositChoiceAction = {
  label: ReactNode;
  onClick: () => void;
  loading?: boolean;
  loadingLabel?: ReactNode;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
};

type DepositChoicePriceLine = {
  label: ReactNode;
  value: ReactNode;
  emphasize?: boolean;
};

export type DepositChoiceOption = {
  key: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  tone?: 'brand' | 'neutral';
  priceLines?: DepositChoicePriceLine[];
  helper?: ReactNode;
  action?: DepositChoiceAction;
  secondaryAction?: DepositChoiceAction;
};

type DepositChoiceBlockProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  options: DepositChoiceOption[];
  className?: string;
};

const toneClasses: Record<'brand' | 'neutral', string> = {
  brand: 'border-brand/15 bg-white/96 shadow-[0_20px_44px_-34px_rgba(67,56,202,0.34)] dark:border-brand/20 dark:bg-slate-950/90',
  neutral: 'border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70',
};

export const DepositChoiceBlock = ({
  eyebrow,
  title,
  description,
  options,
  className,
}: DepositChoiceBlockProps) => {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {(eyebrow || title || description) ? (
        <div className="space-y-1.5">
          {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{eyebrow}</p> : null}
          {title ? <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</p> : null}
          {description ? <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p> : null}
        </div>
      ) : null}

      <div className={cn('grid gap-3', options.length > 1 && 'xl:grid-cols-2')}>
        {options.map((option) => {
          const tone = option.tone ?? 'neutral';

          return (
            <div key={option.key} className={cn('rounded-[24px] border p-4', toneClasses[tone])}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <p className={cn('text-[10px] font-black uppercase tracking-[0.14em]', tone === 'brand' ? 'text-brand' : 'text-slate-400 dark:text-slate-500')}>
                    {option.eyebrow}
                  </p>
                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{option.title}</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{option.description}</p>
                </div>
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tone === 'brand' ? 'bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300')}>
                  {option.icon}
                </div>
              </div>

              {option.priceLines && option.priceLines.length > 0 ? (
                <div className={cn('mt-4 grid gap-2 rounded-[20px] px-4 py-3 text-xs leading-5', tone === 'brand' ? 'border border-brand/10 bg-brand/5 text-slate-600 dark:border-brand/15 dark:bg-brand/10 dark:text-slate-300' : 'border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300')}>
                  {option.priceLines.map((line) => (
                    <div key={`${option.key}-${String(line.label)}`} className={cn('flex items-center justify-between gap-3', line.emphasize && 'border-t border-slate-200/80 pt-2 text-slate-950 dark:border-slate-700 dark:text-slate-50')}>
                      <span className={line.emphasize ? 'font-semibold' : undefined}>{line.label}</span>
                      <span className={line.emphasize ? 'font-semibold' : undefined}>{line.value}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {option.helper ? <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{option.helper}</p> : null}

              {(option.action || option.secondaryAction) ? (
                <div className={cn('mt-4 flex flex-wrap gap-2', option.action && !option.secondaryAction && 'flex-col')}>
                  {option.secondaryAction ? (
                    <Button
                      type="button"
                      variant={option.secondaryAction.variant ?? 'ghost'}
                      size="sm"
                      onClick={option.secondaryAction.onClick}
                      loading={option.secondaryAction.loading}
                      loadingLabel={option.secondaryAction.loadingLabel ?? 'Procesando...'}
                      className="rounded-full"
                    >
                      <>
                        {option.secondaryAction.icon}
                        {option.secondaryAction.label}
                      </>
                    </Button>
                  ) : null}

                  {option.action ? (
                    <Button
                      type="button"
                      variant={option.action.variant ?? (tone === 'brand' ? 'primary' : 'outline')}
                      size="sm"
                      fullWidth={!option.secondaryAction}
                      onClick={option.action.onClick}
                      loading={option.action.loading}
                      loadingLabel={option.action.loadingLabel ?? 'Procesando...'}
                      className="rounded-full"
                    >
                      <>
                        {option.action.icon}
                        {option.action.label}
                      </>
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DepositChoiceBlock;