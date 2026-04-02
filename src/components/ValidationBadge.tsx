'use client';

import { Icons } from './Icons';
import { cn } from '../lib/utils';

export type ValidationLevel = 'BASICO' | 'VERIFICADO' | 'DESTACADO' | 'PREMIUM';

interface ValidationBadgeProps {
  level: ValidationLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const levelConfig = {
  BASICO: {
    label: 'Básico',
    color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    iconColor: 'text-slate-500',
    gradient: 'from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800',
    description: 'Perfil base listo para iniciar verificación documental',
    Icon: Icons.User,
  },
  VERIFICADO: {
    label: 'Verificado',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    iconColor: 'text-blue-500',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    description: 'Identidad verificada con DNI',
    Icon: Icons.ShieldCheck,
  },
  DESTACADO: {
    label: 'Destacado',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    iconColor: 'text-emerald-500',
    gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900',
    description: 'Usuario con excelentes reseñas',
    Icon: Icons.Award,
  },
  PREMIUM: {
    label: 'Avanzado',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    iconColor: 'text-amber-500',
    gradient: 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
    description: 'Anfitrión validado presencialmente',
    Icon: Icons.Crown,
  },
};

// Map lowercase to uppercase keys
const getNormalizedConfig = (level: string) => {
  const normalizedLevel = level.toUpperCase();
  if (normalizedLevel === 'BASIC') return levelConfig.BASICO;
  if (normalizedLevel === 'VERIFIED_DNI') return levelConfig.VERIFICADO;
  if (normalizedLevel === 'TRUSTED_USER' || normalizedLevel === 'TRUST') return levelConfig.DESTACADO;
  return levelConfig[normalizedLevel as keyof typeof levelConfig] || levelConfig.BASICO;
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
  const config = levelConfig[level as ValidationLevel] || levelConfig.BASICO;
  const { Icon } = config;

  return (
    <div className={cn(
      'relative p-6 rounded-2xl border-2 bg-gradient-to-br transition-all',
      config.gradient,
      level === 'BASICO' && 'border-slate-200 dark:border-slate-700',
      level === 'VERIFICADO' && 'border-blue-200 dark:border-blue-800',
      level === 'DESTACADO' && 'border-emerald-200 dark:border-emerald-800',
      level === 'PREMIUM' && 'border-amber-200 dark:border-amber-800',
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          'p-4 rounded-xl shrink-0',
          level === 'BASICO' && 'bg-slate-200 dark:bg-slate-800',
          level === 'VERIFICADO' && 'bg-blue-100 dark:bg-blue-900/30',
          level === 'DESTACADO' && 'bg-emerald-100 dark:bg-emerald-900/30',
          level === 'PREMIUM' && 'bg-amber-100 dark:bg-amber-900/30',
        )}>
          <Icon className={cn('w-10 h-10', config.iconColor)} />
        </div>
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Nivel {levelNumber}</span>
          <h3 className={cn('text-2xl font-black tracking-tight', config.iconColor)}>{config.label}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">{config.description}</p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Progreso de Perfil</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{progress}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-1000 ease-out',
              level === 'BASICO' && 'bg-slate-500',
              level === 'VERIFICADO' && 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
              level === 'DESTACADO' && 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
              level === 'PREMIUM' && 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default ValidationBadge;
