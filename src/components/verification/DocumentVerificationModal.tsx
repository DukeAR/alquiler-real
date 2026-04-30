import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { type ValidationData } from '../../hooks/useUserProfile';
import { apiJson } from '../../lib/apiConfig';
import { VERIFICATION_PRIVACY_NOTICES } from '../../lib/privacyPolicy';
import { showToast } from '../../lib/toast';
import { Icons } from '../Icons';

export interface DocumentaryVerificationData {
  dniFront: string | null;
  dniBack: string | null;
  selfie: string | null;
  proofOfAddress: string | null;
  submittedAt: string | null;
}

interface DocumentVerificationModalProps {
  userType: 'tenant' | 'host';
  verificationStatus?: ValidationData | null;
  onSubmitted: (data: DocumentaryVerificationData) => Promise<void> | void;
  onClose: () => void;
}

const EMPTY_DOCUMENTARY_DATA: DocumentaryVerificationData = {
  dniFront: null,
  dniBack: null,
  selfie: null,
  proofOfAddress: null,
  submittedAt: null,
};

export const DocumentVerificationModal: React.FC<DocumentVerificationModalProps> = ({
  userType,
  verificationStatus,
  onSubmitted,
  onClose,
}) => {
  const [verification, setVerification] = useState<DocumentaryVerificationData>(EMPTY_DOCUMENTARY_DATA);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const dniFrontRef = useRef<HTMLInputElement>(null);
  const dniBackRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);

  const hasRequiredDocuments = Boolean(verification.dniFront && verification.dniBack && verification.selfie);
  const documentarySubmitted = verificationStatus?.checks?.documentarySubmitted ?? false;
  const documentaryVerified = verificationStatus?.checks?.documentaryVerified ?? false;
  const currentLevelLabel = verificationStatus?.levelLabel ?? 'En progreso';
  const summary = verificationStatus?.summary ?? 'La base visible de tu cuenta depende de contacto, perfil, actividad e historial dentro de la plataforma.';
  const optionalUpgrade = verificationStatus?.optionalUpgrade
    ?? (userType === 'host'
      ? 'Como anfitrión, podés sumar un comprobante de domicilio para reforzar todavía más tu perfil.'
      : 'La documentación queda como una capa extra de respaldo, no como requisito base para usar tu cuenta.');

  const statusCards = [
    {
      id: 'progressive',
      title: 'Validaciones base',
      status: currentLevelLabel,
      icon: Icons.ShieldCheck,
      color: 'bg-brand/10 text-brand',
      requirements: ['Email y teléfono confirmados', 'Perfil completo y actividad', 'Historial y reseñas dentro de la plataforma'],
      benefits: verificationStatus?.benefits?.current?.length
        ? verificationStatus.benefits.current
        : ['Tu cuenta ya acumula confianza con señales reales, aunque todavía no subas documentos.'],
    },
    {
      id: 'documents',
      title: 'Refuerzo documental opcional',
      status: documentaryVerified ? 'Reforzado' : documentarySubmitted ? 'En revisión' : hasRequiredDocuments ? 'Listo para enviar' : 'Opcional',
      icon: Icons.FileText,
      color: documentaryVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
      requirements: ['Frente y dorso del documento', 'Selfie con el documento visible'],
      benefits: ['Suma una capa extra de respaldo', 'Deja registro de la documentación enviada', 'No reemplaza reputación ni actividad: las complementa'],
    },
    ...(userType === 'host' ? [{
      id: 'proof',
      title: 'Respaldo extra para anfitriones',
      status: verification.proofOfAddress ? 'Cargado' : 'Opcional',
      icon: Icons.Home,
      color: 'bg-sky-100 text-sky-700',
      requirements: ['Comprobante de servicios o domicilio a tu nombre'],
      benefits: ['Ayuda a respaldar tu perfil de anfitrión', 'Puede dar más contexto cuando revisamos la cuenta'],
    }] : []),
  ] as const;

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
      showToast('Verificación', 'Subí frente y dorso del documento, más la selfie, para enviar el refuerzo documental.', 'warning');
      return;
    }

    setSubmitting(true);

    const finalVerification: DocumentaryVerificationData = {
      ...verification,
      submittedAt: new Date().toISOString(),
    };

    try {
      await apiJson('/api/verification/submit', {
        method: 'POST',
        body: JSON.stringify(finalVerification),
        includeCredentials: true,
      });

      await onSubmitted(finalVerification);
      showToast('Verificación', 'Recibimos tu documentación opcional. La vamos a revisar como refuerzo extra.', 'success');
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
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="max-h-[90vh] w-full max-w-4xl space-y-6 overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Refuerzo documental opcional</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              {userType === 'tenant' ? 'Huésped' : 'Anfitrión'}: esta capa sirve para sumar respaldo extra. La base visible sigue dependiendo de información real dentro de la cuenta, no solo de documentos.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icons.X className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Resumen actual</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{currentLevelLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Estado documental</p>
            <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {documentaryVerified ? 'Reforzado' : documentarySubmitted ? 'En revisión' : 'Sin enviar'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Qué cambia</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{optionalUpgrade}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm leading-6 text-slate-700 dark:border-brand/25 dark:bg-brand/10 dark:text-slate-200">
          <div className="flex items-start gap-3">
            <Icons.Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
            <p>{summary}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
          <div className="flex items-start gap-3">
            <Icons.Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
            <p>{VERIFICATION_PRIVACY_NOTICES.documentary}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Cómo se suma esta validación</h3>

          <div className="grid gap-4 lg:grid-cols-3">
            {statusCards.map((card) => {
              const CardIcon = card.icon;

              return (
                <div key={card.id} className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <div className="mb-4 flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.color}`}>
                      <CardIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{card.title}</h4>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{card.status}</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Qué mira</p>
                      <div className="space-y-2">
                        {card.requirements.map((requirement) => (
                          <div key={requirement} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                            <Icons.Check className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                            <span>{requirement}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Para qué sirve</p>
                      <div className="space-y-2">
                        {card.benefits.map((benefit) => (
                          <div key={benefit} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                            <Icons.Star className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-brand" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Subí documentación si querés sumar respaldo extra</h3>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Opcional
            </span>
          </div>

          <UploadCard
            label="Documento frente"
            value={verification.dniFront}
            inputRef={dniFrontRef}
            onSelect={(file) => void handleFileUpload(file, 'dniFront')}
            placeholder="Subí la foto del frente del documento"
            alt="Documento frente"
            icon={<Icons.ImagePlus className="h-6 w-6 text-slate-400" />}
          />

          <UploadCard
            label="Documento dorso"
            value={verification.dniBack}
            inputRef={dniBackRef}
            onSelect={(file) => void handleFileUpload(file, 'dniBack')}
            placeholder="Subí la foto del dorso del documento"
            alt="Documento dorso"
            icon={<Icons.ImagePlus className="h-6 w-6 text-slate-400" />}
          />

          <UploadCard
            label="Selfie con documento"
            value={verification.selfie}
            inputRef={selfieRef}
            onSelect={(file) => void handleFileUpload(file, 'selfie')}
            placeholder="Subí una selfie sosteniendo el documento"
            alt="Selfie con documento"
            icon={<Icons.User className="h-6 w-6 text-slate-400" />}
          />

          {userType === 'host' ? (
            <UploadCard
              label="Comprobante de domicilio"
              description="Opcional. Puede ser una factura de luz, agua, gas o teléfono a tu nombre."
              value={verification.proofOfAddress}
              inputRef={proofRef}
              onSelect={(file) => void handleFileUpload(file, 'proofOfAddress')}
              placeholder="Subí un comprobante si querés sumar ese respaldo"
              alt="Comprobante de domicilio"
              icon={<Icons.Home className="h-6 w-6 text-slate-400" />}
            />
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <Icons.Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
            <p>
              Este envío no es requisito para registrarte ni para avanzar en los primeros niveles. Solo suma una validación adicional cuando querés reforzar tu perfil.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            Cerrar
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
            {uploading || submitting ? <Icons.Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Enviar respaldo documental'}
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
              <p className="font-bold text-emerald-700">Archivo cargado</p>
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