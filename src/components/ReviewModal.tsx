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
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Seleccioná una calificación');
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
          rating,
          comment,
          type
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icons.Star className="w-8 h-8 text-brand fill-current" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            Evaluá a {reviewedUserName}
          </h3>
          <p className="text-slate-500 text-sm">
            Tu reseña suma contexto real y ayuda a cuidar la comunidad.
          </p>
        </div>

        <div className="flex justify-center gap-2 py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="transition-transform active:scale-90 hover:scale-110"
            >
              <Icons.Star
                className={cn(
                  "w-10 h-10 transition-colors",
                  rating >= star ? "text-yellow-400 fill-current" : "text-slate-200 dark:text-slate-700"
                )}
              />
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-4 font-medium focus:ring-2 focus:ring-brand outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-400"
            placeholder="Contanos cómo fue la experiencia (opcional)..."
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
            {submitting ? 'Enviando...' : 'Enviar reseña'}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center italic">
          * Tu calificación impacta en el puntaje de confianza del usuario.
        </p>
      </div>
    </div>
  );
};
