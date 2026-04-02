'use client';

import { Icons } from './Icons';
import { cn } from '../lib/utils';

interface ValidationChecks {
  dniFrontUploaded: boolean;
  dniBackUploaded: boolean;
  selfieUploaded: boolean;
  dniVerified: boolean;
  utilityBillUploaded?: boolean;
  utilityBillVerified?: boolean;
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
  const documentItems = [
    { label: 'DNI frente cargado', isCompleted: checks.dniFrontUploaded, icon: <Icons.FileText className="w-4 h-4" /> },
    { label: 'DNI dorso cargado', isCompleted: checks.dniBackUploaded, icon: <Icons.FileText className="w-4 h-4" /> },
    { label: 'Selfie con DNI cargada', isCompleted: checks.selfieUploaded, icon: <Icons.Camera className="w-4 h-4" /> },
    {
      label: 'Identidad verificada',
      isCompleted: checks.dniVerified,
      isPending: checks.dniFrontUploaded && checks.dniBackUploaded && checks.selfieUploaded && !checks.dniVerified,
      icon: <Icons.UserCheck className="w-4 h-4" />
    },
  ];

  const hostItems = userRole === 'HOST' ? [
    { label: 'Comprobante de servicios cargado', isCompleted: checks.utilityBillUploaded || false, icon: <Icons.FileSpreadsheet className="w-4 h-4" /> },
    {
      label: 'Comprobante verificado',
      isCompleted: checks.utilityBillVerified || false,
      isPending: checks.utilityBillUploaded && !checks.utilityBillVerified,
      icon: <Icons.UserCheck className="w-4 h-4" />
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Avance de verificación documental</span>
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
            Verificación documental
          </h4>
          <div className="space-y-2">
            {documentItems.map((item) => (<ChecklistItem key={item.label} {...item} />))}
          </div>
        </div>

        {hostItems.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Verificación adicional del anfitrión
            </h4>
            <div className="space-y-2">
              {hostItems.map((item) => (<ChecklistItem key={item.label} {...item} />))}
            </div>
          </div>
        )}
      </div>

      {missingRequirements.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-sm font-medium text-amber-800 mb-2">Todavía te falta completar:</h4>
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
