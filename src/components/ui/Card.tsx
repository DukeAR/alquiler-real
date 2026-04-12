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
  default: 'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-md rounded-[var(--radius-card)]',
  muted: 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm rounded-[var(--radius-card)]',
  elevated: 'bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg rounded-[var(--radius-card)]',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  variant?: CardVariant;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'lg', variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantClasses[variant],
          paddingClasses[padding],
          'transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out',
          className,
        )}
        style={{ fontFamily: 'var(--font-ui)' }}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';

export default Card;