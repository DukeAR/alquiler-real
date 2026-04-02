import React from 'react';
import { Icons } from './Icons';
import { cn } from '../lib/utils';
import { Button, type ButtonProps } from './ui/Button';
import { Card } from './ui/Card';
import { SectionTitle } from './ui/SectionTitle';

type EmptyStateTone = 'default' | 'soft' | 'danger';

type EmptyStateAction = {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
};

const toneClasses: Record<EmptyStateTone, { card: string; visual: string }> = {
  default: {
    card: 'shadow-[var(--app-shadow-soft)]',
    visual: 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
  },
  soft: {
    card: 'bg-slate-50/90',
    visual: 'border-white bg-white text-brand shadow-[var(--app-shadow-subtle)] dark:border-slate-700 dark:bg-slate-900 dark:text-brand-light',
  },
  danger: {
    card: 'border-red-100 bg-red-50/70 dark:border-red-900/30 dark:bg-red-950/10',
    visual: 'border-red-200 bg-white text-red-500 dark:border-red-900/30 dark:bg-slate-900 dark:text-red-400',
  },
};

export interface EmptyStateProps {
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  visual?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: EmptyStateTone;
  className?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  eyebrow,
  icon,
  visual,
  title,
  description,
  tone = 'default',
  className,
  action,
  secondaryAction,
}) => {
  const resolvedVisual = visual ?? icon ?? <Icons.Home className="h-10 w-10" />;

  return (
    <Card
      padding="lg"
      variant={tone === 'soft' ? 'muted' : 'default'}
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      className={cn('flex flex-col items-center justify-center px-6 py-16 md:px-10 md:py-20', toneClasses[tone].card, className)}
    >
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <div className={cn('flex h-20 w-20 items-center justify-center rounded-[28px] border', toneClasses[tone].visual)}>
          {resolvedVisual}
        </div>

        <SectionTitle
          eyebrow={eyebrow}
          as="h3"
          visualLevel="h3"
          heading={title}
          description={description}
          headingClassName="font-semibold tracking-tight"
          className="max-w-md"
        />

        {(action || secondaryAction) && (
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {action ? (
              <Button onClick={action.onClick} aria-label={`${action.label}. ${typeof title === 'string' ? title : 'Estado vacío'}`} variant={action.variant ?? 'primary'}>
                {action.label}
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button
                onClick={secondaryAction.onClick}
                aria-label={`${secondaryAction.label}. ${typeof title === 'string' ? title : 'Estado vacío'}`}
                variant={secondaryAction.variant ?? 'secondary'}
              >
                {secondaryAction.label}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
};
