import React from 'react';
import { Icons } from './Icons';
import { HostProfile } from '../services/geminiService';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface HostProfileViewProps {
  profile: HostProfile;
  onBack: () => void;
}

export const HostProfileView: React.FC<HostProfileViewProps> = ({ profile, onBack }) => {
  const getStatusLabel = (status: HostProfile['status']) => {
    switch (status) {
      case 'new': return 'Perfil nuevo';
      case 'active': return 'Perfil activo';
      case 'with_history': return 'Perfil con historial';
      case 'highly_traceable': return 'Validación avanzada';
      case 'with_warnings': return 'Perfil con advertencias';
      default: return 'Perfil activo';
    }
  };

  const getStatusColor = (status: HostProfile['status']) => {
    switch (status) {
      case 'highly_traceable': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'with_warnings': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'new': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  return (
    <div className="pb-24 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <header className="p-4 flex items-center gap-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <Icons.ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-bold text-lg">Perfil del anfitrión</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Header Block */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
              <Icons.User className="w-12 h-12 text-slate-400" />
            </div>
            {profile.identityValidated && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white dark:border-slate-900">
                <Icons.ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
            <div className={cn(
              "mt-2 inline-flex items-center gap-2 px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest border",
              getStatusColor(profile.status)
            )}>
              {getStatusLabel(profile.status)}
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-3">
              Miembro desde {new Date(profile.memberSince).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {profile.alerts.length > 0 && (
          <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-[24px] space-y-3">
            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
              <Icons.AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold uppercase tracking-tight">Señales para revisar</p>
            </div>
            <ul className="space-y-2">
              {profile.alerts.map((alert, i) => (
                <li key={i} className="text-xs text-amber-600/80 dark:text-amber-400/70 flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 bg-amber-400 rounded-full shrink-0" />
                  {alert}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-amber-500/60 italic font-medium pt-1">
              Este perfil registra señales que conviene revisar con más atención.
            </p>
          </div>
        )}

        {/* Block 1: Identidad y verificación */}
        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identidad y verificación</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Icons.MessageSquare className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Email verificado</span>
              </div>
              {profile.emailVerified ? <Icons.CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Icons.X className="w-5 h-5 text-slate-300" />}
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Icons.BadgeCheck className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Identidad validada (Renaper)</span>
              </div>
              {profile.identityValidated ? <Icons.CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Icons.X className="w-5 h-5 text-slate-300" />}
            </div>
            {profile.verificationMethod && (
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Icons.Shield className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Método de verificación</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand">
                  {profile.verificationMethod === 'presencial' ? 'Presencial' : 'Digital'}
                </span>
              </div>
            )}
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
            <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed font-medium italic">
              “La identidad del anfitrión se validó digitalmente. Alquiler Real no certifica la titularidad, el estado físico ni los servicios del inmueble.”
            </p>
          </div>
        </section>

        {/* Block 2: Historial de Actividad */}
        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Historial de actividad</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <p className="text-2xl font-black text-slate-900 dark:text-white">{profile.publishedPropertiesCount}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Propiedades publicadas</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <p className="text-2xl font-black text-slate-900 dark:text-white">{profile.completedStaysCount}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estadías concretadas</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <p className="text-lg font-black text-slate-900 dark:text-white">{profile.stayCompletionRate}%</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tasa de finalización</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
              <p className="text-lg font-black text-slate-900 dark:text-white">{profile.avgPublicationAgeMonths} meses</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Antigüedad promedio</p>
            </div>
          </div>
          
          <div className="space-y-4 pt-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interacción en la plataforma</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Consultas recibidas</span>
                <span className="font-bold text-slate-900 dark:text-white">{profile.queriesReceivedCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Tiempo de respuesta</span>
                <span className="font-bold text-slate-900 dark:text-white">~{profile.avgResponseTimeMinutes} min</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Cancelaciones del anfitrión</span>
                <span className={cn("font-bold", profile.hostCancellationsCount > 0 ? "text-red-500" : "text-emerald-500")}>
                  {profile.hostCancellationsCount}
                </span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <Icons.Info className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-500 font-medium">
                “Este anfitrión respondió el {Math.round((profile.chatsStartedCount / (profile.queriesReceivedCount || 1)) * 100)}% de las consultas en menos de 24 horas.”
              </p>
            </div>
          </div>
        </section>

        {/* Block 3: Reputación Quirúrgica */}
        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reputación según huéspedes</h3>
            <div className="group relative">
              <Icons.Info className="w-4 h-4 text-slate-300 cursor-help" />
              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                Datos basados exclusivamente en encuestas post-estadía obligatorias.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Fotos vs. realidad', value: profile.reputation.photosMatchRealityRate, icon: <Icons.Camera className="w-4 h-4" /> },
              { label: 'Claridad de la información', value: profile.reputation.infoClarityRate, icon: <Icons.Info className="w-4 h-4" /> },
              { label: 'Cumplimiento de lo acordado', value: profile.reputation.agreementComplianceRate, icon: <Icons.CheckCircle2 className="w-4 h-4" /> },
              { label: 'Comunicación durante la estadía', value: profile.reputation.communicationRate, icon: <Icons.MessageCircle className="w-4 h-4" /> },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {item.icon}
                    {item.label}
                  </div>
                  <span className="text-xs font-black text-brand">{item.value}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    className="h-full bg-brand"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Cambios de condiciones fuera de plataforma</span>
              {profile.reputation.attemptsToChangeConditionsOutside ? (
                <span className="px-2 py-1 bg-red-500/10 text-red-600 text-[10px] font-black rounded-lg border border-red-500/20">REPORTADO</span>
              ) : (
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-lg border border-emerald-500/20">SIN REPORTES</span>
              )}
            </div>
          </div>
        </section>

        {/* Block 4: Verificación de Propiedades */}
        <section className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verificación de propiedades</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Icons.Home className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Verificación presencial</span>
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-white">{profile.verificationsSummary.presencialCount}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Icons.Navigation className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Ubicación confirmada</span>
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-white">{profile.verificationsSummary.gpsProofCount}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Icons.Video className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Validación con foto o video</span>
              </div>
              <span className="text-sm font-black text-slate-900 dark:text-white">{profile.verificationsSummary.videoValidationCount}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic text-center">
            Cada propiedad hereda la reputación del anfitrión y suma sus propias verificaciones.
          </p>
        </section>

        {/* Block 5: Transparencia */}
        <div className="p-6 bg-slate-100 dark:bg-slate-900/50 rounded-[32px] border border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed text-center font-medium">
            Alquiler Real valida información declarada por el anfitrión y registra historial de uso. No actúa como intermediario financiero ni certifica condiciones del inmueble.
          </p>
        </div>
      </main>
    </div>
  );
};
