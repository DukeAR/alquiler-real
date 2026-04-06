import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { apiJson } from '../../lib/apiConfig';
import { showToast } from '../../lib/toast';
import { Icons } from '../Icons';

type VerificationLevel = 'basic' | 'verified' | 'premium';

export interface DocumentaryVerificationData {
  level: VerificationLevel;
  dniFront: string | null;
  dniBack: string | null;
  selfie: string | null;
  proofOfAddress: string | null;
  submittedAt: string | null;
}

interface DocumentVerificationModalProps {
  userType: 'tenant' | 'host';
  currentVerification: DocumentaryVerificationData;
  onSubmitted: (data: DocumentaryVerificationData) => Promise<void> | void;
  onClose: () => void;
}

const getVerificationLevel = (userType: 'tenant' | 'host', verification: DocumentaryVerificationData): VerificationLevel => {
  if (verification.dniFront && verification.dniBack && verification.selfie) {
    if (userType === 'host' && verification.proofOfAddress) {
      return 'premium';
    }

    return 'verified';
  }

  return 'basic';
};

export const DocumentVerificationModal: React.FC<DocumentVerificationModalProps> = ({
  userType,
  currentVerification,
  onSubmitted,
  onClose,
}) => {
  const [verification, setVerification] = useState<DocumentaryVerificationData>(currentVerification);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dniFrontRef = useRef<HTMLInputElement>(null);
  const dniBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVerification(currentVerification);
  }, [currentVerification]);

  const derivedLevel = getVerificationLevel(userType, verification);
  const levels = [
    {
      id: 'basic',
      name: 'Documentos pendientes',
      color: 'bg-slate-100 text-slate-700',
      icon: Icons.User,
      requirements: ['DNI frente y dorso', 'Selfie con DNI'],
      benefits: ['Podés reunir la documentación antes de enviarla'],
    },
    {
      id: 'verified',
      name: 'Documentación cargada',
      color: 'bg-blue-100 text-blue-700',
      icon: Icons.ShieldCheck,
      requirements: ['DNI frente y dorso', 'Selfie con DNI'],
      benefits: ['La identidad queda lista para revisión', 'Se ve que ya enviaste la documentación', 'Tu perfil queda más completo'],
    },
    {
      id: 'premium',
      name: 'Revisión adicional',
      color: 'bg-emerald-100 text-emerald-700',
      icon: Icons.ShieldCheck,
      requirements: userType === 'host'
        ? ['Documentacion enviada', 'Comprobante de servicios']
        : ['Documentacion enviada'],
      benefits: userType === 'host'
        ? ['Podés publicar con más datos comprobados', 'Se ve mejor qué ya revisamos', 'Tu perfil suma respaldo documental']
        : ['Se ve mejor qué ya revisamos', 'Tu perfil suma más respaldo documental', 'La identidad queda más completa'],
    },
  ] as const;

  const currentLevelIndex = levels.findIndex((level) => level.id === derivedLevel);
  const hasRequiredDocuments = Boolean(verification.dniFront && verification.dniBack && verification.selfie);

  const handleFileUpload = async (
    file: File,
    field: 'dniFront' | 'dniBack' | 'selfie' | 'proofOfAddress',
  ) => {
    setUploading(true);

    const reader = new FileReader();
    reader.onload = () => {
      setVerification((prev) => ({
        ...prev,
        [field]: typeof reader.result === 'string' ? reader.result : null,
      }));
      setUploading(false);
    };
    reader.onerror = () => {
      setUploading(false);
      showToast('Verificación', 'No pudimos leer ese archivo. Probá con otra imagen.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!hasRequiredDocuments) {
      showToast('Verificación', 'Subí el frente y dorso del DNI, más la selfie con DNI.', 'warning');
      return;
    }

    setSubmitting(true);

    const finalVerification: DocumentaryVerificationData = {
      ...verification,
      level: getVerificationLevel(userType, verification),
      submittedAt: new Date().toISOString(),
    };

    try {
      await apiJson('/api/verification/submit', {
        method: 'POST',
        body: JSON.stringify(finalVerification),
        includeCredentials: true,
      });

      await onSubmitted(finalVerification);
      showToast('Verificación', 'Recibimos tu documentación. Ahora la revisamos.', 'success');
      onClose();
    } catch (error) {
      showToast('Verificación', error instanceof Error ? error.message : 'No pudimos guardar la documentación.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="max-h-[90vh] w-full max-w-3xl space-y-6 overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Verificación documental</h2>
            <p className="text-sm text-slate-500">
              {userType === 'tenant' ? 'Huésped' : 'Anfitrión'} - subí la documentación necesaria para que quede claro qué ya pudimos validar.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icons.X className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Qué falta y qué ya cargaste</h3>

          <div className="grid gap-4">
            {levels.map((level, index) => {
              const LevelIcon = level.icon;
              const isReached = index <= currentLevelIndex;
              const isCurrent = level.id === derivedLevel;

              return (
                <div
                  key={level.id}
                  className={`rounded-2xl border-2 p-4 transition-all ${isCurrent
                    ? 'border-brand bg-brand/5'
                    : isReached
                      ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-700'
                    }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${level.color}`}>
                      <LevelIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">{level.name}</h4>
                      <p className="text-xs text-slate-500">{isReached ? 'Listo' : 'Pendiente'}</p>
                    </div>
                    {isCurrent ? (
                      <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">Actual</span>
                    ) : null}
                  </div>

                  <div className="grid gap-4 text-xs sm:grid-cols-2">
                    <div>
                      <p className="mb-1 font-bold uppercase text-slate-500">Requisitos</p>
                      <ul className="space-y-1">
                        {level.requirements.map((requirement) => (
                          <li key={requirement} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Icons.Check className="h-3 w-3 text-emerald-500" />
                            {requirement}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 font-bold uppercase text-slate-500">Beneficios</p>
                      <ul className="space-y-1">
                        {level.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <Icons.Star className="h-3 w-3 text-brand" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Subí tu documentación</h3>

          <UploadCard
            label="DNI frente"
            value={verification.dniFront}
            inputRef={dniFrontRef}
            onSelect={(file) => void handleFileUpload(file, 'dniFront')}
            placeholder="Subí la foto del frente del DNI"
            alt="DNI frente"
            icon={<Icons.ImagePlus className="h-6 w-6 text-slate-400" />}
          />

          <UploadCard
            label="DNI dorso"
            value={verification.dniBack}
            inputRef={dniBackRef}
            onSelect={(file) => void handleFileUpload(file, 'dniBack')}
            placeholder="Subí la foto del dorso del DNI"
            alt="DNI dorso"
            icon={<Icons.ImagePlus className="h-6 w-6 text-slate-400" />}
          />

          <UploadCard
            label="Selfie con DNI"
            value={verification.selfie}
            inputRef={selfieRef}
            onSelect={(file) => void handleFileUpload(file, 'selfie')}
            placeholder="Subí una selfie sosteniendo tu DNI"
            alt="Selfie con DNI"
            icon={<Icons.User className="h-6 w-6 text-slate-400" />}
          />

          {userType === 'host' ? (
            <UploadCard
              label="Comprobante de servicios"
              description="Factura de luz, agua, gas o teléfono a tu nombre."
              value={verification.proofOfAddress}
              inputRef={proofRef}
              onSelect={(file) => void handleFileUpload(file, 'proofOfAddress')}
              placeholder="Subí un comprobante de servicios"
              alt="Comprobante de servicios"
              icon={<Icons.Home className="h-6 w-6 text-slate-400" />}
            />
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <Icons.Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
            <p>
              Este flujo solo valida identidad y documentación: frente y dorso del DNI, selfie con el documento y, para anfitriones, comprobante adicional.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || submitting || !hasRequiredDocuments}
            className={`flex-1 rounded-xl py-3 font-bold transition-all ${uploading || submitting || !hasRequiredDocuments
              ? 'cursor-not-allowed bg-slate-200 text-slate-400'
              : 'bg-brand text-white hover:bg-brand/90'
              }`}
          >
            {uploading || submitting ? <Icons.Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Enviar verificación'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

type UploadCardProps = {
  label: string;
  description?: string;
  value: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (file: File) => void;
  placeholder: string;
  alt: string;
  icon: React.ReactNode;
};

const UploadCard = ({ label, description, value, inputRef, onSelect, placeholder, alt, icon }: UploadCardProps) => {
  return (
    <div>
      <label className="text-xs font-bold uppercase text-slate-500">{label}</label>
      {description ? <p className="mb-1 text-xs text-slate-400">{description}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onSelect(file);
          }
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`mt-1 flex w-full items-center gap-4 rounded-xl border-2 border-dashed p-4 text-left ${value
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-slate-300 hover:border-brand'
          }`}
      >
        {value ? (
          <>
            <img src={value} className="h-16 w-16 rounded-lg object-cover" alt={alt} />
            <div className="flex-1">
              <p className="font-bold text-emerald-700">Documento cargado</p>
              <p className="text-xs text-slate-500">Tocá para cambiar</p>
            </div>
            <Icons.Check className="h-6 w-6 text-emerald-500" />
          </>
        ) : (
          <>
            {icon}
            <span className="text-slate-500">{placeholder}</span>
          </>
        )}
      </button>
    </div>
  );
};

export default DocumentVerificationModal;