import React from 'react';
import { cn } from '../../lib/utils';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4';

export interface SectionTitleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  heading: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  as?: HeadingTag;
  visualLevel?: HeadingTag;
  headingClassName?: string;
  eyebrowClassName?: string;
  descriptionClassName?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  className,
  heading,
  description,
  eyebrow,
  as = 'h2',
  visualLevel,
  headingClassName,
  eyebrowClassName,
  descriptionClassName,
  ...props
}) => {
  const Heading = as;
  const headingClassByTag: Record<HeadingTag, string> = {
    h1: 'app-title-1',
    h2: 'app-title-2',
    h3: 'app-title-3',
    h4: 'app-title-4',
  };
  const resolvedVisualLevel = visualLevel ?? as;

  return (
    <div className={cn('space-y-3', className)} {...props} style={{ fontFamily: 'var(--font-ui)', lineHeight: 'var(--line-height-title)' }}>
      {eyebrow ? <p className={cn('app-eyebrow', eyebrowClassName)}>{eyebrow}</p> : null}
      <Heading className={cn(headingClassByTag[resolvedVisualLevel], 'dark:text-slate-50', headingClassName)}>{heading}</Heading>
      {description ? <p className={cn('app-body-sm max-w-prose app-text-muted dark:text-slate-400', descriptionClassName)}>{description}</p> : null}
    </div>
  );
};

export default SectionTitle;