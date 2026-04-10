import React from 'react';
import { Link } from 'react-router-dom';
import {
  PLATFORM_TERMS_QUICK_GUIDE_INTRO,
  PLATFORM_TERMS_QUICK_GUIDE_SECTIONS,
  type PlatformTermsQuickGuideSectionId,
} from '../../lib/platformTerms';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';
import { Card } from './Card';
import { SectionTitle } from './SectionTitle';

type PlatformTermsQuickGuideProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  density?: 'default' | 'compact';
  showLink?: boolean;
  className?: string;
};

const sectionIcons: Record<PlatformTermsQuickGuideSectionId, React.ComponentType<{ className?: string }>> = {
  properties: Icons.Home,
  contact: Icons.MessageSquare,
  deposit: Icons.FileText,
  'platform-intervention': Icons.ShieldCheck,
  'no-intervention': Icons.ShieldAlert,
};

export const PlatformTermsQuickGuide: React.FC<PlatformTermsQuickGuideProps> = ({
  eyebrow = 'Resumen rápido',
  title = 'Cómo funciona la plataforma en 1 minuto',
  description = PLATFORM_TERMS_QUICK_GUIDE_INTRO,
  density = 'default',
  showLink = false,
  className,
}) => {
  const isCompact = density === 'compact';

  return (
    <Card
      padding="none"
      className={cn(
        'overflow-hidden border-slate-200/85 bg-white/98 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      <div className={cn('space-y-5', isCompact ? 'p-5' : 'p-6 md:p-7')}>
        <div className={cn('space-y-4', isCompact ? '' : 'max-w-3xl')}>
          <SectionTitle
            eyebrow={eyebrow}
            as="h2"
            heading={title}
            description={description}
            className={isCompact ? 'max-w-none' : 'max-w-3xl'}
          />

          {showLink ? (
            <Link
              to="/terms"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.18)] transition-colors hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              <Icons.FileText className="h-4 w-4" />
              Ver términos completos
            </Link>
          ) : null}
        </div>

        <div className={cn('grid gap-3', isCompact ? 'sm:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-2 xl:grid-cols-5')}>
          {PLATFORM_TERMS_QUICK_GUIDE_SECTIONS.map((section) => {
            const Icon = sectionIcons[section.id];

            return (
              <div
                key={section.id}
                className={cn(
                  'rounded-[22px] border border-slate-200/80 bg-slate-50/92',
                  isCompact ? 'p-4' : 'p-4 md:p-5',
                  'dark:border-slate-800 dark:bg-slate-950/70',
                )}
              >
                <div className="space-y-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-brand/10 text-brand dark:bg-brand/15 dark:text-brand-light">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold leading-6 tracking-[-0.015em] text-slate-950 dark:text-slate-50">
                      {section.title}
                    </h3>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {section.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};