import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { apiFetch, apiJson } from '../../lib/apiConfig';
import { showToast } from '../../lib/toast';
import { cn } from '../../lib/utils';
import { Icons } from '../Icons';

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
  <div className="space-y-3 p-8">
    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
      <span className="text-slate-400">{currentStep === 4 ? 'Cita presencial' : `Paso ${currentStep} de ${totalSteps}`}</span>
      {currentStep !== 4 && <span className="text-brand">{Math.round((currentStep / totalSteps) * 100)}%</span>}
    </div>
    {currentStep !== 4 && (
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
        <motion.div
          className="h-full bg-brand"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ type: 'spring', stiffness: 50 }}
        />
      </div>
    )}
  </div>
);

const IdentityStep: React.FC<{
  dni: string;
  setDni: (value: string) => void;
  idFile: File | null;
  setIdFile: (file: File | null) => void;
  isPresencial: boolean;
  setIsPresencial: (value: boolean) => void;
}> = ({ dni, setDni, idFile, setIdFile, isPresencial, setIsPresencial }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
  >
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-brand/10">
        <Icons.Smartphone className="h-8 w-8 text-brand" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Validá tu identidad</h1>
      <p className="font-medium text-slate-500">Usamos Renaper para validar que sos vos.</p>
    </div>

    <div className="space-y-8 rounded-[32px] border border-slate-200 bg-slate-50 p-8 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-brand/10 p-3">
          <Icons.ShieldCheck className="h-6 w-6 text-brand" />
        </div>
        <h3 className="text-lg font-bold">DNI argentino</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Número de DNI</label>
          <input
            type="text"
            value={dni}
            onChange={(event) => setDni(event.target.value)}
            placeholder="Ej: 12345678"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/50 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
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
      </div>
      <p className="text-center text-[10px] font-medium italic text-slate-400">Buscá buena iluminación y evitá reflejos.</p>
    </div>

    <div className="space-y-4 rounded-[24px] border border-blue-100 bg-blue-50 p-6 dark:border-blue-900/30 dark:bg-blue-900/20">
      <div className="flex gap-3">
        <Icons.Info className="h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-xs font-medium leading-relaxed text-blue-800 dark:text-blue-200">
          ¿Preferís hacerlo en persona? Si estás en <span className="font-bold">San Clemente del Tuyú</span>, podés pedir una validación presencial para sumar la comprobación más fuerte de tu perfil.
        </p>
      </div>
      <button
        onClick={() => setIsPresencial(!isPresencial)}
        className={cn(
          'w-full rounded-xl py-3 text-xs font-bold uppercase tracking-widest transition-all',
          isPresencial
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'border border-blue-200 bg-white text-blue-600 dark:border-blue-800 dark:bg-slate-800',
        )}
      >
        {isPresencial ? '✓ Elegiste validación presencial' : 'Quiero validación presencial'}
      </button>
    </div>
  </motion.div>
);

const BiometryStep: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="space-y-8"
  >
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-brand/10">
        <Icons.Zap className="h-8 w-8 fill-brand text-brand" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Validación facial</h1>
      <p className="font-medium text-slate-500">Estamos validando que sos vos</p>
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

const SuccessStep: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-8"
  >
    <div className="space-y-3 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-accent/10">
        <Icons.CheckCircle2 className="h-8 w-8 text-accent" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Ya recibimos tus datos</h1>
      <p className="font-medium text-slate-500">Ahora los estamos revisando</p>
    </div>

    <div className="space-y-4">
      <div className="flex items-center gap-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
          <Icons.CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">DNI cargado</p>
          <p className="text-xs font-medium text-emerald-600/70">Se subió correctamente</p>
        </div>
      </div>
      <div className="flex items-center gap-5 rounded-[24px] border border-emerald-100 bg-emerald-50 p-6 dark:border-emerald-900/30 dark:bg-emerald-900/10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
          <Icons.CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Validación facial</p>
          <p className="text-xs font-medium text-emerald-600/70">Prueba de vida aprobada</p>
        </div>
      </div>
    </div>
  </motion.div>
);

export const DocumentVerificationFlow: React.FC<{ onComplete: () => Promise<void> | void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPresencial, setIsPresencial] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [dni, setDni] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);

  const handleNext = async () => {
    if (isPresencial && step === 1) {
      setStep(4);
      return;
    }

    if (step === 1) {
      if (!dni || !idFile) {
        showToast('Verificación', 'Ingresá tu DNI y subí la foto del frente para continuar.', 'warning');
        return;
      }

      setIsVerifying(true);
      try {
        const formData = new FormData();
        formData.append('dni', dni);
        formData.append('idImage', idFile);

        const response = await apiFetch('/api/verification/validate-id', {
          method: 'POST',
          body: formData,
          includeCredentials: true,
        });

        if (!response.ok) {
          throw new Error('DNI no válido');
        }

        setStep(2);
      } catch (_error) {
        showToast('Verificación', 'No pudimos validar el DNI. Revisá la foto y probá de nuevo.', 'error');
      } finally {
        setIsVerifying(false);
      }
      return;
    }

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setIsVerifying(true);
    try {
      await apiJson('/api/verification/complete', { method: 'POST', includeCredentials: true });
      await onComplete();
    } catch (error) {
      console.error('Verification failed', error);
      showToast('Verificación', 'No pudimos completar la verificación. Intentá de nuevo.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
        <button
          onClick={() => {
            if (step === 4) {
              setStep(1);
            } else if (step > 1) {
              setStep(step - 1);
            }
          }}
          className="glass rounded-2xl p-2.5 text-slate-600 dark:text-slate-400"
        >
          <Icons.ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-extrabold tracking-tighter">Alquiler Real</h2>
        <div className="w-10" />
      </div>

      <StepIndicator currentStep={step} totalSteps={3} />

      <div className="flex-1 px-8 py-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <IdentityStep
              key="step1"
              dni={dni}
              setDni={setDni}
              idFile={idFile}
              setIdFile={setIdFile}
              isPresencial={isPresencial}
              setIsPresencial={setIsPresencial}
            />
          )}
          {step === 2 && <BiometryStep key="step2" />}
          {step === 3 && <SuccessStep key="step3" />}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-100 dark:bg-blue-900/30">
                  <Icons.Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Elegí tu cita</h1>
                <p className="font-medium text-slate-500">Presencial en San Clemente del Tuyú</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-3">
                  {['Lunes 10 de Marzo - 10:00hs', 'Lunes 10 de Marzo - 11:30hs', 'Martes 11 de Marzo - 09:00hs', 'Martes 11 de Marzo - 15:00hs'].map((time) => (
                    <button
                      key={time}
                      onClick={() => setAppointmentDate(time)}
                      className={cn(
                        'flex items-center justify-between rounded-2xl border p-4 text-left text-sm font-bold transition-all',
                        appointmentDate === time
                          ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
                      )}
                    >
                      {time}
                      {appointmentDate === time && <Icons.CheckCircle2 className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={!appointmentDate || isVerifying}
                className="flex w-full items-center justify-center gap-3 rounded-[24px] bg-blue-600 py-5 font-bold text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isVerifying ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar cita'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step !== 4 && (
        <div className="space-y-8 p-8">
          <button
            onClick={handleNext}
            disabled={isVerifying}
            className="flex w-full items-center justify-center gap-3 rounded-[24px] bg-brand py-5 font-bold text-white shadow-xl shadow-brand/30 transition-all hover:bg-brand-dark disabled:opacity-70 active:scale-95"
          >
            {isVerifying ? (
              <>
                <Icons.Loader2 className="h-5 w-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <span className="text-lg">{step === 3 ? 'Finalizar verificación' : 'Continuar'}</span>
                <Icons.ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentVerificationFlow;