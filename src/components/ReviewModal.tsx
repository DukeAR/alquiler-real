import React, { useState } from 'react';
import { apiFetch } from '../lib/apiConfig';
import { Icons } from './Icons';
import { cn } from '../lib/utils';

interface ReviewModalProps {
  bookingId: string;
  reviewedUserId: string;
  reviewedUserName: string;
  type: 'host_to_guest' | 'guest_to_host';
  onClose: () => void;
  onComplete: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  bookingId,
  reviewedUserId,
  reviewedUserName,
  type,
  onClose,
  onComplete
}) => {
  const [agreementKept, setAgreementKept] = useState<boolean | null>(null);
  const [wouldInteractAgain, setWouldInteractAgain] = useState<boolean | null>(null);
  const [hadIncident, setHadIncident] = useState<boolean | null>(null);
  const [photosMatchReality, setPhotosMatchReality] = useState<boolean | null>(type === 'guest_to_host' ? null : true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGuestToHost = type === 'guest_to_host';

  const QuestionBlock = ({
    question,
    value,
    onChange,
    yesLabel = 'Sí',
    noLabel = 'No',
  }: {
    question: string;
    value: boolean | null;
    onChange: (nextValue: boolean) => void;
    yesLabel?: string;
    noLabel?: string;
  }) => (
    <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/60">
      <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">{question}</p>
      <div className="flex gap-2">
        {[
          { label: yesLabel, nextValue: true },
          { label: noLabel, nextValue: false },
        ].map((option) => {
          const selected = value === option.nextValue;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(option.nextValue)}
              className={cn(
                'flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors',
                selected
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand/20 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand/30 dark:hover:text-brand-light',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (agreementKept === null || wouldInteractAgain === null || hadIncident === null || (isGuestToHost && photosMatchReality === null)) {
      setError('Respondé las preguntas obligatorias antes de guardar el cierre.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          reviewed_user_id: reviewedUserId,
          comment,
          type,
          agreement_kept: agreementKept,
          would_interact_again: wouldInteractAgain,
          had_incident: hadIncident,
          ...(isGuestToHost ? { photos_match_reality: photosMatchReality } : {}),
        }),
      });

      if (res.ok) {
        onComplete();
      } else {
        const data = await res.json();
        setError(data.error || 'No pudimos enviar la reseña. Intentá de nuevo.');
      }
    } catch (err) {
      setError('No pudimos conectarnos con el servidor. Intentá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.MessageSquare className="w-8 h-8 text-brand" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            Cierre de la estadía con {reviewedUserName}
          </h3>
          <p className="text-slate-500 text-sm">
            Este historial se muestra con señales suaves, sin estrellas ni puntajes públicos.
          </p>
        </div>

        <div className="space-y-4">
          <QuestionBlock question="¿Se cumplió lo acordado?" value={agreementKept} onChange={setAgreementKept} />
          <QuestionBlock question="¿Volverías a interactuar?" value={wouldInteractAgain} onChange={setWouldInteractAgain} />
          <QuestionBlock question="¿Hubo inconvenientes?" value={hadIncident} onChange={setHadIncident} yesLabel="Sí, hubo" noLabel="No hubo" />
          {isGuestToHost ? (
            <QuestionBlock question="¿El aviso coincidió con lo publicado?" value={photosMatchReality} onChange={setPhotosMatchReality} />
          ) : null}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 font-medium focus:ring-2 focus:ring-brand outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-400"
            placeholder="Si querés, dejá contexto breve para recordar cómo cerró la estadía (opcional)..."
          />
          {error && <p className="text-red-500 text-xs font-bold text-center mt-2">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
          >
            Cancelar
          </button>
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 py-4 bg-brand text-white rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar cierre'}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center italic">
          * La app resume estas respuestas en líneas suaves del historial, sin exponer detalles sensibles del cierre.
        </p>
      </div>
    </div>
  );
};
