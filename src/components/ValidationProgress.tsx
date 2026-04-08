'use client';

import { Icons } from './Icons';
import { cn } from '../lib/utils';

interface ValidationChecks {
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  platformActivity: boolean;
  historyVerified: boolean;
  reviewsVerified: boolean;
  documentarySubmitted: boolean;
  documentaryVerified: boolean;
}

interface ValidationProgressProps {
  checks: ValidationChecks;
  progress: number;
  missingRequirements: string[];
  userRole?: 'TENANT' | 'HOST';
}

function ChecklistItem({ label, isCompleted, icon, isPending }: { label: string; isCompleted: boolean; icon: React.ReactNode; isPending?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg transition-colors',
      isCompleted ? 'bg-green-50' : isPending ? 'bg-amber-50' : 'bg-gray-50'
    )}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center',
        isCompleted ? 'bg-green-100 text-green-600' : isPending ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
      )}>
        {isCompleted ? <Icons.Check className="w-4 h-4" /> : isPending ? <Icons.Clock className="w-4 h-4" /> : <Icons.X className="w-4 h-4" />}
      </div>
      <div className="flex items-center gap-2 flex-1">
        <span className={cn('text-gray-400', isCompleted && 'text-green-600', isPending && 'text-amber-600')}>
          {icon}
        </span>
        <span className={cn('text-sm font-medium', isCompleted ? 'text-green-700' : isPending ? 'text-amber-700' : 'text-gray-500')}>
          {label}
        </span>
      </div>
      {isCompleted && <span className="text-xs text-green-600 font-medium">Listo</span>}
      {isPending && <span className="text-xs text-amber-600 font-medium">Pendiente</span>}
    </div>
  );
}

export function ValidationProgress({ checks, progress, missingRequirements, userRole = 'TENANT' }: ValidationProgressProps) {
  const primaryItems = [
    { label: 'Email confirmado', isCompleted: checks.emailVerified, icon: <Icons.MessageSquare className="w-4 h-4" /> },
    { label: 'Teléfono confirmado', isCompleted: checks.phoneVerified, icon: <Icons.Phone className="w-4 h-4" /> },
    { label: 'Perfil completo', isCompleted: checks.profileComplete, icon: <Icons.User className="w-4 h-4" /> },
    { label: 'Actividad en la plataforma', isCompleted: checks.platformActivity, icon: <Icons.Sparkles className="w-4 h-4" /> },
    {
      label: 'Historial de uso',
      isCompleted: checks.historyVerified,
      icon: <Icons.UserCheck className="w-4 h-4" />
    },
    {
      label: 'Reseñas en la plataforma',
      isCompleted: checks.reviewsVerified,
      icon: <Icons.Star className="w-4 h-4" />
    },
  ];

  const optionalItems = [
    {
      label: userRole === 'HOST' ? 'Respaldo documental del perfil' : 'Refuerzo documental opcional',
      isCompleted: checks.documentaryVerified,
      isPending: checks.documentarySubmitted && !checks.documentaryVerified,
      icon: userRole === 'HOST' ? <Icons.FileSpreadsheet className="w-4 h-4" /> : <Icons.FileText className="w-4 h-4" />
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Qué está comprobado en tu cuenta</span>
          <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Comprobaciones principales
          </h4>
          <div className="space-y-2">
            {primaryItems.map((item) => (<ChecklistItem key={item.label} {...item} />))}
          </div>
        </div>

        {optionalItems.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Comprobación documental opcional
            </h4>
            <div className="space-y-2">
              {optionalItems.map((item) => (<ChecklistItem key={item.label} {...item} />))}
            </div>
          </div>
        )}
      </div>

      {missingRequirements.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-medium text-amber-800 mb-2">Todavía podés completar estas comprobaciones:</h4>
          <ul className="space-y-1">
            {missingRequirements.map((req, index) => (
              <li key={index} className="text-sm text-amber-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ValidationProgress;
