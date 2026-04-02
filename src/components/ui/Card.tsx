import React from 'react';
import { cn } from '../../lib/utils';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardVariant = 'default' | 'muted' | 'elevated';

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const variantClasses: Record<CardVariant, string> = {
  default: 'app-card dark:border-slate-800 dark:bg-slate-900',
  muted: 'app-card app-card-muted dark:border-slate-800 dark:bg-slate-800/60',
  elevated: 'app-card app-card-elevated dark:border-slate-800 dark:bg-slate-900',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  variant?: CardVariant;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantClasses[variant],
          paddingClasses[padding],
          className,
        )}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';

export default Card;