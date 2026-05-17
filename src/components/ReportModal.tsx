import React, { useState } from 'react';
import { apiFetch } from '../lib/apiConfig';
import {
  REPORT_INCONSISTENCY_SCOPE_DISCLAIMER,
  REPORT_INTERVENTION_DISCLAIMER,
  REPORT_INTERVENTION_LIMIT,
} from '../lib/uxDisclaimers';
import { Icons } from './Icons';
import { ContextualDisclaimer } from './ui/ContextualDisclaimer';
import { cn } from '../lib/utils';

interface ReportModalProps {
  reportedUserId?: string;
  propertyId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  reportedUserId,
  propertyId,
  onClose,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reportTargetLabel = propertyId ? 'publicación' : 'perfil';

  const reasons = [
    { value: 'suspicious_listing', label: 'Publicación sospechosa' },
    { value: 'false_information', label: 'Datos falsos' },
    { value: 'off_platform_attempt', label: 'Intento de operar por fuera' },
    { value: 'inappropriate_conduct', label: 'Maltrato o conducta inapropiada' },
    { value: 'not_as_listed', label: 'No coincidencia con lo publicado' },
    { value: 'other', label: 'Otro' },
  ];

  const handleSubmit = async () => {
    if (!reason) {
      setError('Seleccioná un motivo para continuar.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_user_id: reportedUserId,
          property_id: propertyId,
          reason,
          description
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'No pudimos enviar el reporte. Intentá de nuevo.');
      }
    } catch (err) {
      setError('No pudimos conectarnos con el servidor. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-6 rounded-[32px] border border-slate-200/80 bg-white p-7 shadow-[0_36px_88px_-46px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center space-y-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
            <Icons.Info className="h-8 w-8 text-slate-500 dark:text-slate-300" />
          </div>
          <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Reportar {reportTargetLabel}
          </h3>
          <p className="mx-auto max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-300">
            Contanos qué inconsistencia viste. Tu reporte queda asociado al contexto disponible dentro de Alquiler Real.
          </p>
        </div>

        <ContextualDisclaimer
          eyebrow="Cómo interviene Alquiler Real"
          compact
          body={REPORT_INTERVENTION_DISCLAIMER}
          supportingText={REPORT_INCONSISTENCY_SCOPE_DISCLAIMER}
        />

        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Motivo del reporte</label>
          <div className="grid grid-cols-1 gap-2">
            {reasons.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={cn(
                  "p-4 rounded-2xl text-left text-sm font-bold transition-all border",
                  reason === r.value 
                    ? "bg-brand/8 border-brand/20 text-brand dark:bg-brand/10 dark:border-brand/30 dark:text-brand-light"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <p className="rounded-[18px] border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/55 dark:text-slate-300">
            {REPORT_INTERVENTION_LIMIT}
          </p>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contanos qué pasó para que podamos revisarlo..."
            rows={3}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium outline-none focus:border-brand/25 focus:ring-2 focus:ring-brand/10 dark:border-slate-800 dark:bg-slate-800/50 dark:text-white"
          />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
        </div>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 rounded-2xl bg-brand py-4 font-bold text-white transition-all shadow-[0_18px_38px_-24px_rgba(67,56,202,0.42)] hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </div>
      </div>
    </div>
  );
};
