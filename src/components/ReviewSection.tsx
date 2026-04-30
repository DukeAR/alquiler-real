import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/apiConfig';
import { Icons } from './Icons';
import { Review, Booking, submitReview } from '../services/geminiService';

interface ReviewSectionProps {
  propertyId: string;
  reviews: Review[];
  bookings: Booking[];
  currentUserId: string;
  onAddReview: () => void;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  propertyId,
  reviews,
  bookings,
  currentUserId,
  onAddReview
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photosMatchReality, setPhotosMatchReality] = useState(true);
  const [pressureToBookFast, setPressureToBookFast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stayCode, setStayCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Check if user has a completed booking for this property
  const userBooking = bookings.find(
    b => b.propertyId === propertyId && b.userId === currentUserId && b.status === 'completed'
  );
  const hasCompletedBooking = !!userBooking;
  const isVerified = userBooking ? userBooking.verified === 1 : false;

  // Check if user already reviewed
  const alreadyReviewed = reviews.some(r => r.userName === 'Tú' || r.userId === currentUserId);

  const handleVerifyCode = async () => {
    if (!stayCode || !userBooking) return;
    setVerifyingCode(true);
    setCodeError('');
    try {
      const res = await apiFetch(`/api/reservations/verify-stay-code/${userBooking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: stayCode })
      });
      const data = await res.json();
      if (res.ok) {
        // Trigger a refresh of hooks so `bookings` gets updated
        onAddReview();
      } else {
        setCodeError(data.error || 'Código inválido');
      }
    } catch (err) {
      setCodeError('No pudimos verificar el código');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) return;
    setIsSubmitting(true);
    try {
      await submitReview({
        propertyId,
        userId: currentUserId,
        userName: 'Tú',
        rating,
        comment,
        photosMatchReality,
        pressureToBookFast
      });
      onAddReview();
      setIsFormOpen(false);
      setComment('');
      setRating(5);
      setPhotosMatchReality(true);
      setPressureToBookFast(false);
    } catch (error) {
      console.error("Failed to submit review", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-12 border-t border-white/10 pt-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">Opiniones de Huéspedes</h3>
          <div className="flex items-center gap-2">
            <div className="flex text-accent">
              {[...Array(5)].map((_, i) => (
                <Icons.Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / (reviews.length || 1)) ? 'fill-current' : 'opacity-30'}`}
                />
              ))}
            </div>
            <span className="text-white/60 text-sm">
              {reviews.length} {reviews.length === 1 ? 'opinión' : 'opiniones'}
            </span>
          </div>
        </div>

        {hasCompletedBooking && !alreadyReviewed && isVerified && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-6 py-3 bg-accent text-primary font-bold rounded-xl hover:bg-accent/90 transition-colors flex items-center gap-2"
          >
            <Icons.Sparkles className="w-5 h-5" />
            Dejá tu opinión
          </button>
        )}
      </div>

      {!hasCompletedBooking && (
        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-3">
          <Icons.Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-white/80">
            Solo pueden opinar los huéspedes que completaron la estadía y cerraron la reserva en la plataforma. Así cuidamos que cada reseña sea real.
          </p>
        </div>
      )}

      {hasCompletedBooking && !isVerified && !alreadyReviewed && (
        <div className="mb-8 p-6 bg-white/5 border border-amber-500/30 rounded-2xl flex flex-col items-start gap-4">
          <div className="flex items-start gap-3">
            <Icons.Key className="w-6 h-6 text-amber-400 shrink-0" />
            <div>
              <h4 className="font-bold text-white mb-1">Verificación de estadía requerida</h4>
              <p className="text-sm text-white/70">
                Para dejar una reseña, necesitás validar que realmente te alojaste acá. Pedile al anfitrión el <strong>código de estadía</strong>.
              </p>
            </div>
          </div>
          <div className="flex w-full max-w-sm gap-2 mt-2">
            <input
              type="text"
              placeholder="Ej: A8KF3X"
              value={stayCode}
              onChange={(e) => setStayCode(e.target.value.toUpperCase())}
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white font-mono uppercase tracking-widest focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleVerifyCode}
              disabled={verifyingCode || !stayCode}
              className="px-6 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {verifyingCode ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
          {codeError && <p className="text-red-400 text-sm font-bold">{codeError}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((review) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white/5 border border-white/10 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                  {review.userName[0]}
                </div>
                <div>
                  <div className="font-bold text-white">{review.userName}</div>
                  <div className="text-xs text-white/40">{review.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-accent">
                <Icons.Star className="w-4 h-4 fill-current" />
                <span className="font-bold">{review.rating}</span>
              </div>
            </div>
            <p className="text-white/80 leading-relaxed italic mb-4">"{review.comment}"</p>

            <div className="flex flex-wrap gap-2">
              {review.photosMatchReality && (
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1">
                  <Icons.Camera className="w-3 h-3" /> Fotos del huésped
                </span>
              )}
              {review.pressureToBookFast && (
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-lg border border-amber-500/20 flex items-center gap-1">
                  <Icons.Zap className="w-3 h-3" /> Presión para señar
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-primary border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Tu experiencia</h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Icons.ArrowLeft className="w-6 h-6 text-white" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-3">Calificación</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-lg transition-all ${rating >= star ? 'text-accent scale-110' : 'text-white/20'}`}
                      >
                        <Icons.Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Comentario</label>
                  <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-accent transition-colors resize-none"
                    placeholder="Contanos qué tal fue tu estadía..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-white/80">Cómo fue la estadía (obligatorio)</label>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <Icons.Camera className="w-5 h-5 text-white/40" />
                      <span className="text-sm text-white font-medium">¿Las fotos coincidían con la realidad?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhotosMatchReality(!photosMatchReality)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${photosMatchReality ? 'bg-emerald-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${photosMatchReality ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <Icons.Zap className="w-5 h-5 text-white/40" />
                      <span className="text-sm text-white font-medium">¿Hubo presión para señar rápido?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPressureToBookFast(!pressureToBookFast)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${pressureToBookFast ? 'bg-amber-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pressureToBookFast ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-accent text-primary font-bold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Publicando...' : 'Publicar opinión'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
