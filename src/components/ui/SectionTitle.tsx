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
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  className,
  heading,
  description,
  eyebrow,
  as = 'h2',
  visualLevel,
  headingClassName,
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
    <div className={cn('space-y-2.5', className)} {...props}>
      {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
      <Heading className={cn(headingClassByTag[resolvedVisualLevel], 'dark:text-slate-50', headingClassName)}>{heading}</Heading>
      {description ? <p className="app-body-sm app-text-muted dark:text-slate-400">{description}</p> : null}
    </div>
  );
};

export default SectionTitle;