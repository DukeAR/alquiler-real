'use client';

import { Icons } from './Icons';
import { cn } from '../lib/utils';
import { USER_VERIFICATION_LEVEL_META, type UserVerificationLevel } from '../lib/userVerification';

export type ValidationLevel = UserVerificationLevel | 'BASICO' | 'VERIFICADO' | 'DESTACADO' | 'PREMIUM' | 'VERIFIED_DNI' | 'TRUSTED_USER';

interface ValidationBadgeProps {
  level: ValidationLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const levelConfig = {
  INICIAL: {
    label: USER_VERIFICATION_LEVEL_META.INICIAL.shortLabel,
    color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    iconColor: 'text-slate-500',
    gradient: 'from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800',
    description: USER_VERIFICATION_LEVEL_META.INICIAL.summary,
    Icon: Icons.User,
  },
  NIVEL_1: {
    label: USER_VERIFICATION_LEVEL_META.NIVEL_1.shortLabel,
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    iconColor: 'text-blue-500',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    description: USER_VERIFICATION_LEVEL_META.NIVEL_1.summary,
    Icon: Icons.ShieldCheck,
  },
  NIVEL_2: {
    label: USER_VERIFICATION_LEVEL_META.NIVEL_2.shortLabel,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800',
    iconColor: 'text-cyan-500',
    gradient: 'from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900',
    description: USER_VERIFICATION_LEVEL_META.NIVEL_2.summary,
    Icon: Icons.Sparkles,
  },
  NIVEL_3: {
    label: USER_VERIFICATION_LEVEL_META.NIVEL_3.shortLabel,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    iconColor: 'text-emerald-500',
    gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900',
    description: USER_VERIFICATION_LEVEL_META.NIVEL_3.summary,
    Icon: Icons.Award,
  },
  NIVEL_4: {
    label: USER_VERIFICATION_LEVEL_META.NIVEL_4.shortLabel,
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    iconColor: 'text-amber-500',
    gradient: 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
    description: USER_VERIFICATION_LEVEL_META.NIVEL_4.summary,
    Icon: Icons.Crown,
  },
};

// Map lowercase to uppercase keys
const getNormalizedConfig = (level: string) => {
  const normalizedLevel = level.toUpperCase();
  if (normalizedLevel === 'BASIC' || normalizedLevel === 'BASICO') return levelConfig.INICIAL;
  if (normalizedLevel === 'VERIFIED_DNI' || normalizedLevel === 'PREMIUM') return levelConfig.NIVEL_4;
  if (normalizedLevel === 'VERIFICADO') return levelConfig.NIVEL_1;
  if (normalizedLevel === 'TRUSTED_USER' || normalizedLevel === 'TRUST' || normalizedLevel === 'DESTACADO') return levelConfig.NIVEL_3;
  return levelConfig[normalizedLevel as keyof typeof levelConfig] || levelConfig.INICIAL;
};

const sizeConfig = {
  sm: { container: 'px-2 py-0.5 text-[10px] gap-1', icon: 'w-3.5 h-3.5' },
  md: { container: 'px-3 py-1 text-xs gap-1.5', icon: 'w-4 h-4' },
  lg: { container: 'px-4 py-2 text-sm gap-2', icon: 'w-5 h-5' },
};

export function ValidationBadge({ level, size = 'md', showLabel = true, className }: ValidationBadgeProps) {
  const config = getNormalizedConfig(level);
  const sizes = sizeConfig[size];
  const { Icon } = config;

  return (
    <div className={cn('inline-flex items-center rounded-full border font-medium', config.color, sizes.container, className)}>
      <Icon className={cn(sizes.icon, config.iconColor)} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}

interface ValidationBadgeLargeProps {
  level: ValidationLevel | string;
  levelNumber: number;
  progress: number;
}

export function ValidationBadgeLarge({ level, levelNumber, progress }: ValidationBadgeLargeProps) {
  const config = getNormalizedConfig(level);
  const normalizedLevel = level.toUpperCase();
  const { Icon } = config;

  return (
    <div className={cn(
      'relative p-6 rounded-2xl border-2 bg-gradient-to-br transition-all',
      config.gradient,
      normalizedLevel === 'INICIAL' && 'border-slate-200 dark:border-slate-700',
      normalizedLevel === 'NIVEL_1' && 'border-blue-200 dark:border-blue-800',
      normalizedLevel === 'NIVEL_2' && 'border-cyan-200 dark:border-cyan-800',
      normalizedLevel === 'NIVEL_3' && 'border-emerald-200 dark:border-emerald-800',
      normalizedLevel === 'NIVEL_4' && 'border-amber-200 dark:border-amber-800',
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          'p-4 rounded-xl shrink-0',
          normalizedLevel === 'INICIAL' && 'bg-slate-200 dark:bg-slate-800',
          normalizedLevel === 'NIVEL_1' && 'bg-blue-100 dark:bg-blue-900/30',
          normalizedLevel === 'NIVEL_2' && 'bg-cyan-100 dark:bg-cyan-900/30',
          normalizedLevel === 'NIVEL_3' && 'bg-emerald-100 dark:bg-emerald-900/30',
          normalizedLevel === 'NIVEL_4' && 'bg-amber-100 dark:bg-amber-900/30',
        )}>
          <Icon className={cn('w-10 h-10', config.iconColor)} />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{levelNumber > 0 ? 'Resumen actual' : 'Primeras validaciones'}</span>
          <h3 className={cn('text-2xl font-black tracking-tight', config.iconColor)}>{config.label}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">{config.description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estado visible</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{progress}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-out',
              normalizedLevel === 'INICIAL' && 'bg-slate-500',
              normalizedLevel === 'NIVEL_1' && 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
              normalizedLevel === 'NIVEL_2' && 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.45)]',
              normalizedLevel === 'NIVEL_3' && 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
              normalizedLevel === 'NIVEL_4' && 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default ValidationBadge;
