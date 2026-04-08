import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  formatPremiumPriceLabel,
  type PremiumVerificationOffer,
} from '../../lib/premiumVerification';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icons } from '../Icons';

type PremiumVerificationCheckoutModalProps = {
  offer: PremiumVerificationOffer;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  processing?: boolean;
};

export const PremiumVerificationCheckoutModal = ({
  offer,
  onClose,
  onConfirm,
  processing = false,
}: PremiumVerificationCheckoutModalProps) => {
  const [step, setStep] = useState<'details' | 'checkout'>(offer.purchased || offer.completed ? 'checkout' : 'details');
  const priceLabel = formatPremiumPriceLabel(offer.priceArs, offer.isComplimentary);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-8 shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{offer.title}</h2>
              {offer.isComplimentary ? <Badge variant="success" size="md">Sin cargo</Badge> : null}
              {offer.completed ? <Badge variant="brand" size="md">Activa</Badge> : null}
            </div>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">{offer.summary}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <Icons.X className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        {step === 'details' ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-[24px] border border-brand/15 bg-brand/5 p-5 text-sm leading-6 text-slate-700 dark:border-brand/25 dark:bg-brand/10 dark:text-slate-200">
              <div className="flex items-start gap-3">
                <Icons.Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <p>{offer.contextHint}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Costo actual</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{priceLabel}</p>
                {offer.complimentaryReason ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{offer.complimentaryReason}</p> : null}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Qué suma</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">Una comprobación extra visible para que otros entiendan mejor tu perfil o tu aviso.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Qué se muestra</p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{offer.visibilityHint}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Cómo sigue</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                <p>1. Confirmás el costo o el cupo sin cargo.</p>
                <p>2. Registramos esta comprobación adicional en tu cuenta o en tu aviso.</p>
                <p>3. Te llevamos al paso necesario para completarla.</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
              <Button type="button" onClick={() => setStep('checkout')}>
                <Icons.ChevronRight className="h-4 w-4" />
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Confirmación</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{offer.purchased || offer.completed ? offer.processLabel : offer.checkoutLabel}</p>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {offer.purchased || offer.completed
                      ? 'La comprobación ya está activa. Podés seguir directo al proceso correspondiente.'
                      : 'Confirmamos el costo y te llevamos directo al proceso, sin pasos extra.'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-[var(--app-shadow-subtle)] dark:bg-slate-900">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Total</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{priceLabel}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              {!offer.purchased && !offer.completed ? (
                <Button type="button" variant="secondary" onClick={() => setStep('details')}>Volver</Button>
              ) : null}
              <Button type="button" onClick={() => void onConfirm()} loading={processing} loadingLabel="Procesando...">
                <Icons.ShieldCheck className="h-4 w-4" />
                {offer.purchased || offer.completed ? offer.processLabel : offer.checkoutLabel}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PremiumVerificationCheckoutModal;