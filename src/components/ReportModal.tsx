import React, { useState } from 'react';
import { apiFetch } from '../lib/apiConfig';
import { Icons } from './Icons';
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

  const reasons = [
    'Fraude o estafa',
    'Información engañosa',
    'Mensajes agresivos',
    'Pedido de pago por fuera de la plataforma',
    'Otro'
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
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] p-8 space-y-6 shadow-2xl border border-red-500/10">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/30">
            <Icons.AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Reportar un problema
          </h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Ayudanos a cuidar la comunidad. Tu reporte es confidencial y lo revisa nuestro equipo.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Motivo del reporte</label>
          <div className="grid grid-cols-1 gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn(
                  "p-4 rounded-2xl text-left text-sm font-bold transition-all border",
                  reason === r 
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contanos qué pasó..."
            rows={3}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-red-500/20 outline-none resize-none dark:text-white"
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
            className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </div>
      </div>
    </div>
  );
};
