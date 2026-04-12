import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { apiFetch, apiJson } from '../../lib/apiConfig';
import { VERIFICATION_PRIVACY_NOTICES } from '../../lib/privacyPolicy';
import { showToast } from '../../lib/toast';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

type VerificationFlowMode = 'documentary' | 'onsite';

const ONSITE_APPOINTMENT_OPTIONS = [
  'Lunes 10 de Marzo - 10:00 hs',
  'Lunes 10 de Marzo - 11:30 hs',
  'Martes 11 de Marzo - 09:00 hs',
  'Martes 11 de Marzo - 15:00 hs',
] as const;

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
  <div className="space-y-3 p-8">
    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
      <span className="text-slate-400">Paso {currentStep} de {totalSteps}</span>
      <span className="text-brand">{Math.round((currentStep / totalSteps) * 100)}%</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
      <motion.div
        className="h-full bg-brand"
        initial={{ width: 0 }}
        animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
        transition={{ type: 'spring', stiffness: 50 }}
      />
    </div>
  </div>
);

const DocumentaryIdentityStep: React.FC<{
  dni: string;
  setDni: (value: string) => void;
  idFile: File | null;
  setIdFile: (file: File | null) => void;
  showPurchaseHint: boolean;
}> = ({ dni, setDni, idFile, setIdFile, showPurchaseHint }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-brand/10">
        <Icons.FileText className="h-8 w-8 text-brand" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Comprobación documental adicional</h1>
      <p className="font-medium text-slate-500">Sumá DNI y selfie como información validada extra para tu perfil.</p>
    </div>

    {showPurchaseHint ? (
      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/20">
        <div className="flex gap-3">
          <Icons.Info className="h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-xs font-medium leading-relaxed text-amber-900 dark:text-amber-200">
            Si llegaste directo a esta pantalla, primero activá esta comprobación adicional desde tu perfil para continuar sin errores.
          </p>
        </div>
      </div>
    ) : null}

    <div className="space-y-8 rounded-[32px] border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-brand/10 p-3">
          <Icons.ShieldCheck className="h-6 w-6 text-brand" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Documento de identidad</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Número de documento</label>
          <input
            type="text"
            value={dni}
            onChange={(event) => setDni(event.target.value)}
            placeholder="Ej: 12345678"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/50 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <label className="group relative flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-[24px] border-2 border-dashed border-slate-200 transition-all hover:border-brand hover:bg-brand/5 dark:border-slate-800">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => setIdFile(event.target.files?.[0] || null)}
          />
          {idFile ? (
            <div className="text-center">
              <Icons.CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <span className="mt-2 block text-[10px] font-bold uppercase tracking-widest text-emerald-600">{idFile.name}</span>
            </div>
          ) : (
            <>
              <Icons.Camera className="h-6 w-6 text-slate-300 transition-colors group-hover:text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-brand">Cargá la foto del frente</span>
            </>
          )}
        </label>
      </div>

      <p className="text-center text-[10px] font-medium italic text-slate-400">Buscá buena iluminación y evitá reflejos.</p>
    </div>

    <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-900/20">
      <div className="flex gap-3">
        <Icons.Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-xs font-medium leading-relaxed text-amber-900 dark:text-amber-200">
          Esta comprobación no reemplaza la base visible de tu cuenta. Lo principal sigue construyéndose con email, teléfono, perfil, actividad e historial real.
        </p>
      </div>
    </div>
  </motion.div>
);

const BiometryStep: React.FC = () => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-brand/10">
        <Icons.Zap className="h-8 w-8 fill-brand text-brand" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Comprobación de presencia</h1>
      <p className="font-medium text-slate-500">Sirve para respaldar que la documentación cargada corresponde con vos.</p>
    </div>

    <div className="flex flex-col items-center gap-10">
      <div className="relative h-56 w-56 rounded-full border-4 border-brand/10 p-3">
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <Icons.User className="h-28 w-28 text-slate-200" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-full animate-pulse rounded-full border-4 border-brand opacity-20" />
            <div className="absolute inset-0 scale-90 rounded-full border-2 border-brand opacity-40" />
          </div>
        </div>
      </div>
      <div className="glass rounded-2xl border-brand/20 p-4">
        <p className="max-w-[250px] text-center text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
          Ubicá tu rostro dentro del círculo y <span className="font-bold text-brand">mantené la mirada fija</span> durante 3 segundos.
        </p>
      </div>
    </div>
  </motion.div>
);

const DocumentaryReadyStep: React.FC = () => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-100 dark:bg-emerald-900/20">
        <Icons.CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Todo listo para confirmar</h1>
      <p className="font-medium text-slate-500">Ya cargaste la base documental. El último paso deja activa esta comprobación adicional en tu cuenta.</p>
    </div>

    <div className="space-y-4">
      <div className="flex items-center gap-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
          <Icons.CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Documento cargado</p>
          <p className="text-xs font-medium text-emerald-600/70">Listo para usarse como respaldo documental.</p>
        </div>
      </div>
      <div className="flex items-center gap-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
          <Icons.CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Chequeo visual completado</p>
          <p className="text-xs font-medium text-emerald-600/70">Ya podés confirmar esta comprobación documental.</p>
        </div>
      </div>
    </div>
  </motion.div>
);

const OnsiteSchedulingStep: React.FC<{
  appointmentDate: string;
  onSelect: (value: string) => void;
  propertyTitle?: string | null;
}> = ({ appointmentDate, onSelect, propertyTitle }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-100 dark:bg-blue-900/30">
        <Icons.Calendar className="h-8 w-8 text-blue-600" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Coordiná la revisión presencial</h1>
      <p className="font-medium text-slate-500">
        {propertyTitle ? `${propertyTitle}: elegí un horario para confirmar la visita.` : 'Elegí un horario para confirmar la visita.'}
      </p>
    </div>

    <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="space-y-3">
        {ONSITE_APPOINTMENT_OPTIONS.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => onSelect(time)}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border p-4 text-left text-sm font-bold transition-all',
              appointmentDate === time
                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
            )}
          >
            {time}
            {appointmentDate === time ? <Icons.CheckCircle2 className="h-4 w-4" /> : null}
          </button>
        ))}
      </div>
    </div>

    <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-900/20">
      <div className="flex gap-3">
        <Icons.Info className="h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-xs font-medium leading-relaxed text-blue-800 dark:text-blue-200">
          Esta revisión suma una capa extra de contexto para el aviso. No reemplaza las otras verificaciones ni garantiza resultados concretos.
        </p>
      </div>
    </div>
  </motion.div>
);

const OnsiteSuccessStep: React.FC<{ appointmentDate: string; propertyTitle?: string | null }> = ({ appointmentDate, propertyTitle }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-100 dark:bg-emerald-900/20">
        <Icons.CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Revisión presencial confirmada</h1>
      <p className="font-medium text-slate-500">
        {propertyTitle ? `La comprobación adicional de ${propertyTitle} ya quedó lista.` : 'La comprobación adicional ya quedó lista para esta publicación.'}
      </p>
    </div>

    <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/10">
      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Horario elegido</p>
      <p className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-200">{appointmentDate}</p>
    </div>
  </motion.div>
);

type DocumentVerificationFlowProps = {
  onComplete: () => Promise<void> | void;
  mode?: VerificationFlowMode;
  orderId?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
};

export const DocumentVerificationFlow: React.FC<DocumentVerificationFlowProps> = ({
  onComplete,
  mode = 'documentary',
  orderId = null,
  propertyId = null,
  propertyTitle = null,
}) => {
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [dni, setDni] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);

  const totalSteps = mode === 'onsite' ? 2 : 3;
  const showPurchaseHint = mode === 'documentary' && !orderId;
  const primaryButtonLabel = useMemo(() => {
    if (mode === 'onsite') {
      return step === 1 ? 'Confirmar horario' : 'Volver';
    }

    return step === 3 ? 'Finalizar comprobación' : 'Continuar';
  }, [mode, step]);

  const handleDocumentaryNext = async () => {
    if (step === 1) {
      if (!dni || !idFile) {
        showToast('Verificación', 'Ingresá tu documento y subí la foto del frente para continuar.', 'warning');
        return;
      }

      setIsVerifying(true);
      try {
        const formData = new FormData();
        formData.append('dni', dni);
        formData.append('idImage', idFile);

        if (orderId) {
          formData.append('orderId', orderId);
        }

        const response = await apiFetch('/api/verification/validate-id', {
          method: 'POST',
          body: formData,
          includeCredentials: true,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(typeof body?.error === 'string' ? body.error : 'Documento no válido');
        }

        setStep(2);
      } catch (error) {
        showToast('Verificación', error instanceof Error ? error.message : 'No pudimos validar ese documento.', 'error');
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    setIsVerifying(true);
    try {
      await apiJson('/api/verification/complete', {
        method: 'POST',
        body: JSON.stringify(orderId ? { orderId } : {}),
        includeCredentials: true,
      });
      await onComplete();
    } catch (error) {
      showToast('Verificación', error instanceof Error ? error.message : 'No pudimos completar esta comprobación documental.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOnsiteNext = async () => {
    if (step === 1) {
      if (!propertyId) {
        showToast('Verificación', 'No encontramos la propiedad para esta revisión presencial.', 'error');
        return;
      }

      if (!appointmentDate) {
        showToast('Verificación', 'Elegí un horario para continuar.', 'warning');
        return;
      }

      setIsVerifying(true);
      try {
        await apiJson('/api/verification/onsite/complete', {
          method: 'POST',
          body: JSON.stringify({ propertyId, orderId, appointmentDate }),
          includeCredentials: true,
        });
        setStep(2);
      } catch (error) {
        showToast('Verificación', error instanceof Error ? error.message : 'No pudimos confirmar la revisión presencial.', 'error');
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    await onComplete();
  };

  const handleNext = async () => {
    if (mode === 'onsite') {
      await handleOnsiteNext();
      return;
    }

    await handleDocumentaryNext();
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((currentStep) => currentStep - 1);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="glass rounded-2xl p-2.5 text-slate-600 disabled:opacity-40 dark:text-slate-400"
        >
          <Icons.ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-extrabold tracking-tighter">Alquiler Real</h2>
        <div className="w-10" />
      </div>

      <StepIndicator currentStep={step} totalSteps={totalSteps} />

      <div className="flex-1 px-8 py-4">
        <AnimatePresence mode="wait">
          {mode === 'documentary' && step === 1 ? (
            <DocumentaryIdentityStep
              key="documentary-step-1"
              dni={dni}
              setDni={setDni}
              idFile={idFile}
              setIdFile={setIdFile}
              showPurchaseHint={showPurchaseHint}
            />
          ) : null}
          {mode === 'documentary' && step === 2 ? <BiometryStep key="documentary-step-2" /> : null}
          {mode === 'documentary' && step === 3 ? <DocumentaryReadyStep key="documentary-step-3" /> : null}
          {mode === 'onsite' && step === 1 ? (
            <OnsiteSchedulingStep
              key="onsite-step-1"
              appointmentDate={appointmentDate}
              onSelect={setAppointmentDate}
              propertyTitle={propertyTitle}
            />
          ) : null}
          {mode === 'onsite' && step === 2 ? (
            <OnsiteSuccessStep key="onsite-step-2" appointmentDate={appointmentDate} propertyTitle={propertyTitle} />
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-8 p-8">
        <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4">
          <div className="flex items-start gap-3">
            <Icons.Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <p className="text-sm leading-6 text-slate-600">
              {mode === 'documentary' ? VERIFICATION_PRIVACY_NOTICES.documentary : VERIFICATION_PRIVACY_NOTICES.bookingSupport}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleNext()}
          disabled={isVerifying}
          className={cn(
            'flex w-full items-center justify-center gap-3 rounded-[24px] py-5 font-bold text-white shadow-xl transition-all disabled:opacity-70 active:scale-95',
            mode === 'onsite' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-brand shadow-brand/30 hover:bg-brand-dark',
          )}
        >
          {isVerifying ? (
            <>
              <Icons.Loader2 className="h-5 w-5 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <span className="text-lg">{primaryButtonLabel}</span>
              <Icons.ChevronRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DocumentVerificationFlow;