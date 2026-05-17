import React, { useState } from 'react';
import { apiFetch } from '../lib/apiConfig';
import { Icons } from './Icons';
import { cn } from '../lib/utils';
import type { ReviewType } from '../types';
import { ContextualSupportDialog } from './ContextualSupportDialog';

interface ReviewModalProps {
  bookingId: string;
  reviewedUserId: string;
  reviewedUserName: string;
  type: ReviewType;
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
  const activeCategories = type === 'guest_review'
    ? [
        { key: 'communication', label: 'Comunicación' },
        { key: 'listing_clarity', label: 'Claridad del aviso' },
        { key: 'agreement_fulfillment', label: 'Cumplimiento de lo acordado' },
        { key: 'overall_experience', label: 'Experiencia general' },
      ]
    : [
        { key: 'respectful_treatment', label: 'Trato respetuoso' },
        { key: 'agreement_fulfillment', label: 'Cumplimiento de acuerdos' },
        { key: 'property_care', label: 'Cuidado del lugar' },
        { key: 'platform_history', label: 'Historial en la plataforma' },
      ];
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = activeCategories.every((category) => Number.isFinite(scores[category.key]));
  const averageScore = activeCategories.reduce((sum, category) => sum + (scores[category.key] ?? 0), 0) / Math.max(activeCategories.length, 1);

  const ScoreBlock = ({
    label,
    score,
    onChange,
  }: {
    label: string;
    score?: number;
    onChange: (nextScore: number) => void;
  }) => (
    <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/60">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-slate-50">{label}</p>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {score ? `${score}/5` : 'Sin puntuar'}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((value) => {
          const selected = score === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              className={cn(
                'rounded-2xl border px-0 py-2.5 text-sm font-semibold transition-colors',
                selected
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand/20 hover:text-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand/30 dark:hover:text-brand-light',
              )}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );

  const handleSubmit = async () => {
    if (!isComplete) {
      setError('Puntuá cada categoría antes de guardar la reseña.');
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
          categories: activeCategories.map((category) => ({
            key: category.key,
            label: category.label,
            score: scores[category.key],
          })),
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
            {type === 'guest_review' ? 'Contá tu experiencia' : 'Dejá una referencia'} con {reviewedUserName}
          </h3>
          <p className="text-slate-500 text-sm">
            Tu opinión solo se habilita sobre interacciones reales y ayuda a ordenar mejor futuras decisiones.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-900 dark:text-slate-50">Promedio general</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <Icons.Star className="h-4 w-4 text-amber-500" />
                {isComplete ? averageScore.toFixed(1).replace('.', ',') : 'Completá las categorías'}
              </span>
            </div>
          </div>

          {activeCategories.map((category) => (
            <ScoreBlock
              key={category.key}
              label={category.label}
              score={scores[category.key]}
              onChange={(nextScore) => setScores((current) => ({ ...current, [category.key]: nextScore }))}
            />
          ))}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 font-medium focus:ring-2 focus:ring-brand outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-400"
            placeholder="Si querés, dejá contexto breve para complementar la reseña..."
          />
          {error && <p className="text-red-500 text-xs font-bold text-center mt-2">{error}</p>}
        </div>

        <div className="flex gap-3">
          <ContextualSupportDialog
            entryPoint="review"
            bookingId={bookingId}
            reviewType={type}
            triggerVariant="secondary"
            triggerSize="lg"
            triggerClassName="flex-1 justify-center rounded-2xl"
          />
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
          * La plataforma usa esta información para ordenar mejor, moderar casos sensibles y mostrar contexto útil sin exponer señales internas.
        </p>
      </div>
    </div>
  );
};
