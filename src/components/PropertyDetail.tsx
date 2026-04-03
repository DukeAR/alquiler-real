import React, { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, apiJson } from '../lib/apiConfig';
import { LoadingState } from './LoadingState';
import { Icons } from './Icons';
import BookingConfirmationModal from './BookingConfirmationModal';
import DateRangePicker from './DateRangePicker';
import { showToast } from '../lib/toast';
import { cn, formatCurrency } from '../lib/utils';
import { type Property as AppProperty, type TraceabilityLevel } from '../types';
import { useFavorites } from '../hooks/useFavorites';
import { useBookings } from '../hooks/useBookings';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { FormField } from './ui/FormField';
import { NoticeBanner } from './ui/NoticeBanner';
import { SectionTitle } from './ui/SectionTitle';

const FALLBACK = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80&auto=format&fit=crop';

type IconComponent = React.ComponentType<{ className?: string }>;

type PropertyHost = {
  name?: string;
  avatarUrl?: string;
  bio?: string;
};

type PropertyDetailData = Partial<AppProperty> & {
  id?: string;
  title: string;
  location: string;
  propertyType?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
  images?: string[];
  amenities?: string[];
  host?: PropertyHost | null;
};

type PropertyReviewItem = {
  id: string;
  reviewer_id?: string;
  userName?: string;
  rating: number;
  comment: string;
  date?: string;
};

type IconBadge = {
  label: string;
  variant: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
  icon: IconComponent;
};

type DetailStatProps = {
  icon: IconComponent;
  label: string;
  value: string;
};

type TrustSignal = {
  icon: IconComponent;
  label: string;
  description: string;
};

type BookingFieldKey = 'dates' | 'guests';

type BookingErrorState = {
  field: BookingFieldKey;
  message: string;
};

type BookingSnapshotCardProps = {
  icon: IconComponent;
  label: string;
  value: string;
  helper: string;
  emphasis?: boolean;
};

type BookingNoticeState = {
  tone: NonNullable<React.ComponentProps<typeof NoticeBanner>['tone']>;
  heading: string;
  description: string;
};

type BookingConfirmationNotice = {
  tone: NonNullable<React.ComponentProps<typeof NoticeBanner>['tone']>;
  heading: string;
  description: string;
};

type BookingSuccessState = {
  bookingId: string;
  nights: number;
  total: number;
  guestSummary: string;
  stayCode?: string;
};

const formatMonthYear = (value?: string) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
};

const formatLocalIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalIso = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatReviewCount = (count: number) => {
  if (count <= 0) return 'Sin reseñas';
  return count === 1 ? '1 reseña' : `${count} reseñas`;
};

const formatGuestCapacity = (maxGuests?: number) => {
  if (!maxGuests) return null;
  return `Hasta ${maxGuests} ${maxGuests === 1 ? 'huésped' : 'huéspedes'}`;
};

const formatReviewDate = (value?: string) => {
  if (!value) return 'Reseña publicada';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Reseña publicada';

  return parsed.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatBookingDate = (value?: string) => {
  if (!value) return 'Elegir fecha';

  const parsed = parseLocalIso(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
};

const formatGuestSelection = (adults: number, childrenCount: number) => {
  const totalGuests = adults + childrenCount;

  if (childrenCount === 0) {
    return `${totalGuests} ${totalGuests === 1 ? 'huésped' : 'huéspedes'}`;
  }

  return `${adults} ${adults === 1 ? 'adulto' : 'adultos'} · ${childrenCount} ${childrenCount === 1 ? 'menor' : 'menores'}`;
};

const getHostName = (property: PropertyDetailData) => property.host?.name || property.hostName || 'Anfitrión';

const getHostTenureLabel = (property: PropertyDetailData) => {
  if (property.hostExperienceYears && property.hostExperienceYears > 0) {
    return `${property.hostExperienceYears} ${property.hostExperienceYears === 1 ? 'año' : 'años'} hospedando`;
  }

  const hostSince = formatMonthYear(property.hostSince);
  if (hostSince) {
    return `Recibe huéspedes desde ${hostSince}`;
  }

  return null;
};

const getReviewerLabel = (review: PropertyReviewItem) => {
  if (review.userName) return review.userName;
  if (review.reviewer_id) return `Huésped ${review.reviewer_id}`;
  return 'Huésped verificado';
};

const getInitial = (value?: string) => value?.trim().charAt(0).toUpperCase() || 'A';

const getPropertyTypeLabel = (property: PropertyDetailData) => {
  const explicitType = property.propertyType?.toLowerCase();

  if (explicitType?.includes('house') || explicitType?.includes('casa')) return 'Casa';
  if (explicitType?.includes('apartment') || explicitType?.includes('depto') || explicitType?.includes('depart')) return 'Departamento';
  if (explicitType?.includes('cabin') || explicitType?.includes('caba')) return 'Cabaña';

  const title = property.title.toLowerCase();

  if (title.includes('casa')) return 'Casa';
  if (title.includes('depto') || title.includes('depart')) return 'Departamento';
  if (title.includes('caba')) return 'Cabaña';

  return 'Alojamiento';
};

const getDecisionAmenityLabel = (amenities?: string[]) => {
  if (!amenities || amenities.length === 0) {
    return null;
  }

  const prioritizedAmenities = ['wifi', 'parrilla', 'cochera', 'pileta', 'aire', 'vista'];
  const selected: string[] = [];

  prioritizedAmenities.forEach((keyword) => {
    const match = amenities.find((amenity) => amenity.toLowerCase().includes(keyword));

    if (match && !selected.includes(match)) {
      selected.push(match);
    }
  });

  amenities.forEach((amenity) => {
    if (selected.length >= 3 || selected.includes(amenity)) {
      return;
    }

    selected.push(amenity);
  });

  return selected.slice(0, 3).join(' · ');
};

const getReviewUsefulnessScore = (review: PropertyReviewItem) => {
  const comment = review.comment.toLowerCase();
  const usefulKeywords = ['ubic', 'wifi', 'limp', 'ruido', 'tranqui', 'céntr', 'parrilla', 'cochera', 'playa', 'precio', 'anfitri', 'detalle'];

  return usefulKeywords.reduce((score, keyword) => score + (comment.includes(keyword) ? 20 : 0), Math.min(review.comment.length, 140))
    + (comment.split(/\s+/).length >= 12 ? 20 : 0)
    + (/\d/.test(comment) ? 10 : 0);
};

const getTraceabilityConfig = (level?: TraceabilityLevel) => {
  if (level === 'high') {
    return {
      label: 'Verificación alta',
      badgeVariant: 'success' as const,
      noticeTone: 'success' as const,
      description: 'La publicación reúne varias señales verificadas para ayudarte a decidir con más seguridad.',
      noticeHeading: 'Publicación con señales fuertes de confianza',
      noticeDescription: 'Entre fotos, ubicación y validaciones, hay más contexto real para comparar antes de reservar.',
    };
  }

  if (level === 'medium') {
    return {
      label: 'Verificación media',
      badgeVariant: 'info' as const,
      noticeTone: 'info' as const,
      description: 'Hay información útil para decidir, aunque conviene revisar detalles y despejar dudas con el anfitrión.',
      noticeHeading: 'La publicación ya tiene una base confiable',
      noticeDescription: 'Revisá comodidades, reseñas y validaciones para terminar de evaluar si te cierra.',
    };
  }

  if (level === 'low') {
    return {
      label: 'Verificación inicial',
      badgeVariant: 'warning' as const,
      noticeTone: 'warning' as const,
      description: 'Todavía hay pocas señales verificadas, así que conviene mirar la publicación con más atención.',
      noticeHeading: 'Hay menos contexto verificado para decidir',
      noticeDescription: 'Tomate un minuto para revisar reseñas, ubicación y hablar con el anfitrión antes de avanzar.',
    };
  }

  return null;
};

const factorImpactClasses = {
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  negative: 'border-red-200 bg-red-50 text-red-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-600',
} as const;

const factorImpactLabels = {
  positive: 'A favor',
  negative: 'A revisar',
  neutral: 'Dato útil',
} as const;

const DetailStat: React.FC<DetailStatProps> = ({ icon: Icon, label, value }) => {
  return (
    <Card padding="sm" variant="muted" className="rounded-[28px] border-slate-200/80 bg-white/90">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.7)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
};

const TrustSignalCard: React.FC<TrustSignal> = ({ icon: Icon, label, description }) => {
  return (
    <Card padding="sm" variant="muted" className="rounded-[28px] border-slate-200/80 bg-white/90">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-[0_18px_36px_-26px_rgba(14,116,144,0.45)]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </Card>
  );
};

const ReviewPreviewCard: React.FC<{ review: PropertyReviewItem }> = ({ review }) => {
  const reviewerLabel = getReviewerLabel(review);

  return (
    <Card padding="md" className="rounded-[28px] border-slate-200/80 bg-white shadow-[0_22px_60px_-44px_rgba(15,23,42,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {getInitial(reviewerLabel)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{reviewerLabel}</p>
            <p className="text-xs text-slate-500">{formatReviewDate(review.date)}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
          <Icons.Star className="h-4 w-4 fill-current" />
          <span>{review.rating.toFixed(1)}</span>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fragmento útil</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{review.comment}</p>
    </Card>
  );
};

const BookingSnapshotCard: React.FC<BookingSnapshotCardProps> = ({
  icon: Icon,
  label,
  value,
  helper,
  emphasis = false,
}) => {
  return (
    <Card
      padding="sm"
      variant="muted"
      className={cn(
        'rounded-[24px] border-slate-200/80 bg-slate-50/80 transition-colors',
        emphasis && 'border-brand/20 bg-brand/5 shadow-[0_18px_40px_-34px_rgba(14,116,144,0.45)]',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', emphasis ? 'bg-brand text-white' : 'bg-white text-slate-700')}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
      </div>
    </Card>
  );
};

export const PropertyDetailShell: React.FC<{
  property: PropertyDetailData;
  images: string[];
  mainIndex: number;
  setMainIndex: (i: number) => void;
  isFav: boolean;
  toggleFav: () => void;
  onContact: () => void;
  reviews?: PropertyReviewItem[];
}> = ({ property, images, mainIndex, setMainIndex, isFav, toggleFav, onContact, reviews = [] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createBooking } = useBookings({ autoLoad: false });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;
    if (dx > threshold && mainIndex > 0) setMainIndex(mainIndex - 1);
    if (dx < -threshold && mainIndex < images.length - 1) setMainIndex(mainIndex + 1);
    touchStartX.current = null;
  };

  const openLightbox = () => { setLightboxOpen(true); setZoomed(false); };
  const closeLightbox = () => { setLightboxOpen(false); setZoomed(false); };
  const onKeyDownThumb = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMainIndex(idx); }
  };

  // Booking widget state (frontend-only)
  const [checkIn, setCheckIn] = useState<string>('');
  const [checkOut, setCheckOut] = useState<string>('');
  const [adults, setAdults] = useState<number>(1);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [bookingError, setBookingError] = useState<BookingErrorState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSubmitNotice, setBookingSubmitNotice] = useState<BookingConfirmationNotice | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessState | null>(null);
  const [availabilityRefreshToken, setAvailabilityRefreshToken] = useState(0);

  const reviewCount = Math.max(Number(property.reviewsCount) || 0, reviews.length);
  const ratingValue = Number(property.rating) || 0;
  const guestCapacity = formatGuestCapacity(property.maxGuests);
  const nightly = Number(property?.price) || 0;
  const hostName = getHostName(property);
  const hostTenureLabel = getHostTenureLabel(property);
  const unresolvedReviewsCount = Number(property.unresolvedReviewsCount) || 0;
  const traceability = getTraceabilityConfig(property.traceabilityLevel);
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const decisionAmenityLabel = getDecisionAmenityLabel(property.amenities);

  const heroBadges = [
    property.isSuperHost ? { label: 'Superanfitrión', variant: 'warning', icon: Icons.Crown } : null,
    property.isVerifiedProperty ? { label: 'Propiedad verificada', variant: 'success', icon: Icons.BadgeCheck } : null,
    property.identityValidated ? { label: 'Anfitrión validado', variant: 'brand', icon: Icons.ShieldCheck } : null,
    property.locationVerified ? { label: 'Ubicación verificada', variant: 'info', icon: Icons.MapPin } : null,
    traceability ? { label: traceability.label, variant: traceability.badgeVariant, icon: Icons.Target } : null,
  ].filter(Boolean).slice(0, 3) as IconBadge[];

  const decisionSummaryStats = [
    { label: 'Ubicación', value: property.location, icon: Icons.MapPin },
    guestCapacity ? { label: 'Para', value: guestCapacity.replace('Hasta ', ''), icon: Icons.Users } : null,
    nightly ? { label: 'Precio por noche', value: formatCurrency(nightly), icon: Icons.FileSpreadsheet } : null,
    { label: 'Rating', value: ratingValue > 0 ? `${ratingValue.toFixed(1)} · ${formatReviewCount(reviewCount)}` : 'Sin reseñas todavía', icon: Icons.Star },
  ].filter(Boolean) as DetailStatProps[];

  const sidebarBadges = [
    traceability ? { label: traceability.label, variant: traceability.badgeVariant, icon: Icons.Shield } : null,
    property.isVerifiedProperty ? { label: 'Verificada', variant: 'success', icon: Icons.BadgeCheck } : null,
    property.locationVerified ? { label: 'Ubicación confirmada', variant: 'info', icon: Icons.Map } : null,
  ].filter(Boolean) as IconBadge[];

  const hostSignalBadges = [
    property.identityValidated ? { label: 'Identidad validada', variant: 'brand', icon: Icons.ShieldCheck } : null,
    property.hasDigitalVerification || property.videoValidated ? { label: 'Validación digital', variant: 'info', icon: Icons.Video } : null,
    property.hasPresencialVerification ? { label: 'Chequeo presencial', variant: 'success', icon: Icons.Home } : null,
  ].filter(Boolean) as IconBadge[];

  const trustSignals = [
    property.isVerifiedProperty ? {
      icon: Icons.BadgeCheck,
      label: 'Propiedad verificada',
      description: 'La publicación suma controles adicionales para que puedas contrastar mejor la información visible.',
    } : null,
    property.locationVerified ? {
      icon: Icons.Map,
      label: 'Ubicación verificada',
      description: 'La ubicación publicada ya fue confirmada dentro de la plataforma.',
    } : null,
    property.identityValidated ? {
      icon: Icons.ShieldCheck,
      label: 'Identidad del anfitrión',
      description: 'El anfitrión validó su identidad para que sepas con quién estás hablando.',
    } : null,
    property.hasPresencialVerification ? {
      icon: Icons.Home,
      label: 'Verificación presencial',
      description: 'Hubo una visita al lugar para sumar una señal presencial sobre la publicación.',
    } : null,
    property.hasDigitalVerification || property.videoValidated ? {
      icon: Icons.Video,
      label: 'Validación digital',
      description: property.videoValidated
        ? 'La publicación cuenta con material visual adicional para revisar mejor el estado real del lugar.'
        : 'La publicación sumó una señal digital para que puedas revisar mejor el anuncio.',
    } : null,
  ].filter(Boolean) as TrustSignal[];

  const traceabilityFactors = property.traceabilityReport?.factors?.slice(0, 4) ?? [];
  const hasAmenities = (property.amenities?.length ?? 0) > 0;
  const maxGuestsNumber = typeof property.maxGuests === 'number' && property.maxGuests > 0 ? property.maxGuests : null;

  const todayISO = formatLocalIso(new Date());

  const guestCount = adults + childrenCount;
  const nights = (checkIn && checkOut) ? Math.max(0, Math.round((parseLocalIso(checkOut).getTime() - parseLocalIso(checkIn).getTime()) / (1000*60*60*24))) : 0;
  const total = nights * nightly;
  const decisionHighlights = [
    property.location ? `Ubicación: ${property.location}.` : null,
    guestCapacity ? `${guestCapacity}.` : null,
    decisionAmenityLabel ? `Comodidades clave: ${decisionAmenityLabel}.` : null,
    `Tipo de propiedad: ${propertyTypeLabel}.`,
  ].filter(Boolean) as string[];
  const visibleReviews = [...reviews]
    .sort((left, right) => {
      const scoreDifference = getReviewUsefulnessScore(right) - getReviewUsefulnessScore(left);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return new Date(right.date ?? 0).getTime() - new Date(left.date ?? 0).getTime();
    })
    .slice(0, 4);
  const hasCompleteDates = Boolean(checkIn && checkOut);
  const hasPartialDates = Boolean((checkIn && !checkOut) || (!checkIn && checkOut));
  const guestCapacityReached = Boolean(maxGuestsNumber && guestCount >= maxGuestsNumber);
  const guestCapacityExceeded = Boolean(maxGuestsNumber && guestCount > maxGuestsNumber);
  const canReserve = hasCompleteDates && nights > 0 && !guestCapacityExceeded;

  const bookingNotice: BookingNoticeState = bookingError
    ? {
        tone: bookingError.field === 'guests' ? 'warning' : 'error',
        heading: bookingError.field === 'guests' ? 'Revisá la cantidad de huéspedes' : 'Revisá las fechas',
        description: bookingError.message,
      }
    : !checkIn && !checkOut
      ? {
          tone: 'info',
          heading: 'Elegí ingreso y salida para ver el resumen',
          description: 'Cuando completes las fechas, vas a ver la propiedad, el anfitrión y el total antes de confirmar la estadía.',
        }
      : hasPartialDates
        ? {
            tone: 'info',
            heading: 'Falta completar la salida',
            description: 'Elegí la fecha de salida para calcular el total final y seguir con más claridad.',
          }
        : canReserve
          ? {
              tone: 'success',
                heading: 'Todo listo para decidir con claridad',
              description: `${nights} ${nights === 1 ? 'noche' : 'noches'} · ${formatGuestSelection(adults, childrenCount)} · ${formatCurrency(total)} estimados.`,
            }
          : {
              tone: 'warning',
              heading: 'Ajustá los datos antes de continuar',
              description: maxGuestsNumber
                ? `Esta propiedad admite hasta ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
                : 'Revisá fechas y huéspedes antes de abrir la confirmación.',
            };

  const reserveButtonLabel = canReserve
    ? 'Continuar'
    : !checkIn && !checkOut
      ? 'Elegí fechas para continuar'
      : hasPartialDates
        ? 'Completá la salida'
        : guestCapacityExceeded
          ? 'Ajustá los huéspedes'
          : 'Continuar';

  const dateFieldHelper = !checkIn && !checkOut
    ? 'Marcá ingreso y salida para ver el resumen final de la estadía.'
    : hasPartialDates
      ? 'Ahora elegí la salida para completar el resumen.'
      : `${nights} ${nights === 1 ? 'noche seleccionada' : 'noches seleccionadas'}.`;

  const guestFieldHelper = maxGuestsNumber
    ? guestCapacityReached
      ? `Capacidad máxima alcanzada: ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
      : `Podés reservar hasta ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
    : 'Ajustá la cantidad de adultos y menores para esta estadía.';

  const resetBookingSubmitState = () => {
    setBookingSubmitting(false);
    setBookingSubmitNotice(null);
  };

  const clearBookingFeedback = () => {
    setBookingError(null);
    setBookingSubmitNotice(null);
    setBookingSuccess(null);
  };

  const closeBookingConfirmation = () => {
    if (bookingSubmitting) return;
    setConfirmOpen(false);
    resetBookingSubmitState();
  };

  const handleAdultsChange = (nextValue: number) => {
    setAdults(Math.max(1, nextValue));
    clearBookingFeedback();
  };

  const handleChildrenChange = (nextValue: number) => {
    setChildrenCount(Math.max(0, nextValue));
    clearBookingFeedback();
  };

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn && !checkOut) {
      setBookingError({ field: 'dates', message: 'Elegí fecha de ingreso y salida para revisar la estadía antes de continuar.' });
      return;
    }
    if (checkIn && !checkOut) {
      setBookingError({ field: 'dates', message: 'Falta la fecha de salida para continuar.' });
      return;
    }
    if (!checkIn) {
      setBookingError({ field: 'dates', message: 'Elegí la fecha de ingreso para continuar.' });
      return;
    }
    if (parseLocalIso(checkOut) <= parseLocalIso(checkIn)) {
      setBookingError({ field: 'dates', message: 'La salida tiene que ser posterior al ingreso.' });
      return;
    }
    if (parseLocalIso(checkIn) < parseLocalIso(todayISO)) {
      setBookingError({ field: 'dates', message: 'La fecha de ingreso no puede ser anterior a hoy.' });
      return;
    }
    if (maxGuestsNumber && guestCount > maxGuestsNumber) {
      setBookingError({
        field: 'guests',
        message: `Esta propiedad admite hasta ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}. Ajustá la cantidad para continuar.`,
      });
      return;
    }
    setBookingError(null);
    resetBookingSubmitState();
    setConfirmOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!property.id) {
      setBookingSubmitNotice({
        tone: 'error',
        heading: 'No pudimos confirmar la estadía',
        description: 'Falta identificar la propiedad antes de reservar. Probá recargando la página.',
      });
      return;
    }

    if (!user) {
      closeBookingConfirmation();
      showToast('Necesitás iniciar sesión', 'Iniciá sesión para confirmar la estadía.', 'warning');
      import('../lib/modal').then((m) => m.showLoginModal());
      return;
    }

    setBookingSubmitting(true);
    setBookingSubmitNotice(null);

    const result = await createBooking({
      propertyId: property.id,
      startDate: checkIn,
      endDate: checkOut,
      guests: guestCount,
      totalPrice: total,
    });

    if (!result.ok) {
      setBookingSubmitting(false);

      if (result.error.status === 401) {
        closeBookingConfirmation();
        showToast('Necesitás iniciar sesión', 'Iniciá sesión para confirmar la estadía.', 'warning');
        import('../lib/modal').then((m) => m.showLoginModal());
        return;
      }

      if (result.error.field === 'guests') {
        setBookingError({ field: 'guests', message: result.error.message });
      }

      if (result.error.field === 'startDate' || result.error.field === 'endDate') {
        setBookingError({ field: 'dates', message: result.error.message });
      }

      const tone = result.error.field === 'guests' || result.error.code === 'DATES_UNAVAILABLE' ? 'warning' : 'error';
      setBookingSubmitNotice({
        tone,
        heading: tone === 'warning' ? 'Revisá los datos antes de confirmar' : 'No pudimos confirmar la estadía',
        description: result.error.message,
      });
      return;
    }

    const bookedTotal = result.data.booking?.totalPrice ?? result.data.pricing.total ?? total;

    setBookingSubmitting(false);
    setBookingError(null);
    setConfirmOpen(false);
    setBookingSubmitNotice(null);
    setBookingSuccess({
      bookingId: result.data.booking.id,
      nights: result.data.pricing.nights,
      total: bookedTotal,
      guestSummary: formatGuestSelection(adults, childrenCount),
      stayCode: result.data.booking.stay_code,
    });
    setCheckIn('');
    setCheckOut('');
    setAdults(1);
    setChildrenCount(0);
    setAvailabilityRefreshToken((currentValue) => currentValue + 1);

    showToast(
      'Estadía confirmada',
      `Reservaste ${result.data.pricing.nights} ${result.data.pricing.nights === 1 ? 'noche' : 'noches'} por ${formatCurrency(bookedTotal)}. Ya la podés ver en Mis reservas.`,
      'success',
    );
  };

  const onLightboxKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && mainIndex > 0) setMainIndex(mainIndex - 1);
    if (e.key === 'ArrowRight' && mainIndex < images.length - 1) setMainIndex(mainIndex + 1);
  };

  useEffect(() => {
    if (lightboxOpen) window.addEventListener('keydown', onLightboxKey as any);
    return () => window.removeEventListener('keydown', onLightboxKey as any);
  }, [lightboxOpen, images.length, mainIndex]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.45)] transition-colors hover:border-slate-300 hover:text-slate-900"
      >
        <Icons.ArrowLeft className="h-4 w-4" />
        <span>Volver</span>
      </button>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-10">
        <section className="space-y-6 md:space-y-8">
          {heroBadges.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {heroBadges.map((badge) => {
                const Icon = badge.icon;

                return (
                  <Badge key={badge.label} variant={badge.variant} size="md" className="gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{badge.label}</span>
                  </Badge>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-4">
            <SectionTitle
              as="h1"
              visualLevel="h1"
              eyebrow="Detalle de la propiedad"
              heading={property.title}
              description="Información real para tomar mejores decisiones antes de reservar."
              className="max-w-3xl"
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {decisionSummaryStats.map((stat) => (
                <DetailStat key={`${stat.label}-${stat.value}`} {...stat} />
              ))}
            </div>
          </div>

          <Card padding="none" variant="elevated" className="overflow-hidden rounded-[32px] border-slate-200/80 bg-white shadow-[0_34px_80px_-50px_rgba(15,23,42,0.35)]">
            <div className="grid gap-0 lg:grid-cols-[104px_minmax(0,1fr)]">
              <div className="hidden lg:flex flex-col gap-3 border-r border-slate-200/70 bg-slate-50/80 p-4">
                {images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainIndex(i)}
                    onKeyDown={(e) => onKeyDownThumb(e, i)}
                    aria-label={`Ver imagen ${i + 1}`}
                    className={`overflow-hidden rounded-[22px] border transition-all duration-200 ${i === mainIndex ? 'border-brand shadow-[0_22px_48px_-34px_rgba(14,116,144,0.7)] ring-2 ring-brand/20' : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_20px_42px_-34px_rgba(15,23,42,0.4)]'}`}
                  >
                    <img
                      src={src || FALLBACK}
                      alt={`${property.title} thumbnail ${i + 1}`}
                      className="h-20 w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>

              <div className="min-w-0">
                <div className="relative overflow-hidden bg-slate-100">
                  <div className="absolute left-4 top-4 z-10">
                    <Badge variant="neutral" size="md" className="border-white/80 bg-white/90 backdrop-blur">
                      {mainIndex + 1} / {images.length} fotos
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 right-4 z-10 hidden sm:block">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={openLightbox}
                      className="border-white/20 bg-white/95 text-slate-900 hover:bg-white"
                    >
                      Ver todas las fotos
                    </Button>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent p-4 text-white sm:p-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Vista principal</p>
                      <p className="mt-1 text-sm font-medium text-white/90">{property.location}</p>
                    </div>
                    <button
                      type="button"
                      onClick={openLightbox}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur sm:hidden"
                    >
                      Expandir
                    </button>
                  </div>
                  <div
                    className="aspect-[5/4] sm:aspect-[16/11] lg:aspect-[16/10]"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                  >
                    <img
                      src={images[mainIndex] || FALLBACK}
                      alt={`${property.title} — imagen ${mainIndex + 1}`}
                      className="h-full w-full cursor-zoom-in object-cover transition-transform duration-300 hover:scale-[1.015]"
                      onClick={openLightbox}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200/70 bg-white px-4 py-4 sm:px-5 lg:hidden">
                  <div className="flex gap-3 overflow-x-auto no-scrollbar" role="list">
                    {images.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setMainIndex(i)}
                        onKeyDown={(e) => onKeyDownThumb(e, i)}
                        aria-label={`Ver imagen ${i + 1}`}
                        className={`overflow-hidden rounded-[20px] border transition-all duration-200 ${i === mainIndex ? 'border-brand shadow-[0_22px_48px_-34px_rgba(14,116,144,0.7)] ring-2 ring-brand/20' : 'border-slate-200 hover:border-slate-300'}`}
                        role="listitem"
                      >
                        <img
                          src={src || FALLBACK}
                          alt={`${property.title} thumbnail ${i + 1}`}
                          className="h-24 w-32 object-cover sm:h-28 sm:w-40"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <aside className="mx-auto w-full max-w-2xl xl:sticky xl:top-24 xl:max-w-none xl:self-start">
          <Card variant="elevated" className="rounded-[30px] border-slate-200/80 bg-white p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Resumen para decidir</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black tracking-tight text-slate-950">{nightly ? formatCurrency(nightly) : '—'}</span>
                  <span className="pb-1 text-sm font-medium text-slate-500">/ noche</span>
                </div>
                <p className="text-sm leading-6 text-slate-500">Revisá fechas, anfitrión y total antes de confirmar la estadía.</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                    <Icons.Star className="h-4 w-4 fill-current" />
                    <span>{ratingValue > 0 ? ratingValue.toFixed(1) : 'Nuevo'}</span>
                  </span>
                  <span>{reviewCount > 0 ? formatReviewCount(reviewCount) : 'Sin reseñas todavía'}</span>
                </div>
              </div>

              <Button
                onClick={toggleFav}
                aria-pressed={isFav}
                aria-label={isFav ? 'Quitar de guardados' : 'Guardar en guardados'}
                variant="secondary"
                size="icon"
                className={isFav ? 'border-red-500 bg-red-500 text-white hover:border-red-500 hover:bg-red-500 hover:text-white' : 'border-slate-200 bg-white text-slate-700'}
              >
                <Icons.Heart className="h-5 w-5" />
              </Button>
            </div>

            {sidebarBadges.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {sidebarBadges.map((badge) => {
                  const Icon = badge.icon;

                  return (
                    <Badge key={badge.label} variant={badge.variant} className="gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{badge.label}</span>
                    </Badge>
                  );
                })}
              </div>
            ) : null}

            {bookingSuccess ? (
              <Card padding="sm" variant="muted" className="mt-5 rounded-[24px] border-emerald-200/80 bg-emerald-50/80">
                <NoticeBanner
                  tone="success"
                  heading="La estadía ya quedó confirmada"
                  description={`Guardamos ${bookingSuccess.nights} ${bookingSuccess.nights === 1 ? 'noche' : 'noches'} para ${bookingSuccess.guestSummary} por ${formatCurrency(bookingSuccess.total)}. Desde Mis reservas podés revisar fechas, estado y condiciones.`}
                  className="border-emerald-200 bg-white/85 text-emerald-700 shadow-none"
                />

                {bookingSuccess.stayCode ? (
                  <Badge variant="success" size="md" className="mt-4 gap-2">
                    <Icons.CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Código de ingreso: {bookingSuccess.stayCode}</span>
                  </Badge>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={() => navigate('/my-bookings')} className="sm:flex-1">
                    <Icons.Calendar className="h-4 w-4" />
                    Ver mis reservas
                  </Button>
                  <Button type="button" variant="secondary" onClick={onContact} className="sm:flex-1">
                    <Icons.MessageSquare className="h-4 w-4" />
                    Escribir al anfitrión
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setBookingSuccess(null)}>
                    Cerrar aviso
                  </Button>
                </div>
              </Card>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <BookingSnapshotCard
                icon={Icons.Calendar}
                label="Ingreso"
                value={formatBookingDate(checkIn)}
                helper={checkIn ? 'Ya está seleccionado.' : 'Elegí el día de llegada.'}
                emphasis={Boolean(checkIn)}
              />
              <BookingSnapshotCard
                icon={Icons.Calendar}
                label="Salida"
                value={formatBookingDate(checkOut)}
                helper={checkOut ? 'Ya está seleccionada.' : 'Falta completar la estadía.'}
                emphasis={Boolean(checkOut)}
              />
              <BookingSnapshotCard
                icon={Icons.Users}
                label="Huéspedes"
                value={formatGuestSelection(adults, childrenCount)}
                helper={maxGuestsNumber ? `Máximo ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.` : 'Podés ajustarlo más abajo.'}
                emphasis={guestCount > 0}
              />
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleReserve}>
              <FormField
                label="Fechas"
                helperText={dateFieldHelper}
                error={bookingError?.field === 'dates' ? bookingError.message : undefined}
              >
                <DateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  setCheckIn={(v) => { setCheckIn(v); clearBookingFeedback(); }}
                  setCheckOut={(v) => { setCheckOut(v); clearBookingFeedback(); }}
                  propertyId={property.id}
                  availabilityRefreshToken={availabilityRefreshToken}
                  minDate={todayISO}
                  onChange={clearBookingFeedback}
                />
              </FormField>

              <FormField
                label="Huéspedes"
                hint={formatGuestSelection(adults, childrenCount)}
                helperText={guestFieldHelper}
                error={bookingError?.field === 'guests' ? bookingError.message : undefined}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Card padding="sm" variant="muted" className="rounded-[22px] border-slate-200/80 bg-slate-50/80">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900">Adultos</div>
                        <div className="text-xs text-slate-500">Mayores de 18</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleAdultsChange(adults - 1)} className="h-8 w-8 rounded-full p-0 font-semibold" aria-label="Restar adulto">-</Button>
                        <div className="w-6 text-center text-sm font-semibold text-slate-900">{adults}</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdultsChange(adults + 1)}
                          className="h-8 w-8 rounded-full p-0 font-semibold"
                          aria-label="Sumar adulto"
                          disabled={guestCapacityReached}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </Card>
                  <Card padding="sm" variant="muted" className="rounded-[22px] border-slate-200/80 bg-slate-50/80">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-slate-900">Niños</div>
                        <div className="text-xs text-slate-500">Hasta 17 años</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleChildrenChange(childrenCount - 1)} className="h-8 w-8 rounded-full p-0 font-semibold" aria-label="Restar menor">-</Button>
                        <div className="w-6 text-center text-sm font-semibold text-slate-900">{childrenCount}</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleChildrenChange(childrenCount + 1)}
                          className="h-8 w-8 rounded-full p-0 font-semibold"
                          aria-label="Sumar menor"
                          disabled={guestCapacityReached}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </FormField>

              <Card padding="sm" variant="muted" className="rounded-[24px] border-slate-200/80 bg-slate-50/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Resumen de precio</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {hasCompleteDates
                        ? `${nights} ${nights === 1 ? 'noche' : 'noches'} × ${formatCurrency(nightly)}`
                        : 'Completá las fechas para ver el total estimado.'}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-500">{nightly ? formatCurrency(nightly) : '—'} / noche</div>
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-200/70 pt-4">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div>Estadía</div>
                    <div>{hasCompleteDates ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : 'Pendiente'}</div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <div>Huéspedes</div>
                    <div>{formatGuestSelection(adults, childrenCount)}</div>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold text-slate-950">
                    <div>Total estimado</div>
                    <div>{hasCompleteDates ? formatCurrency(total) : 'Elegí fechas'}</div>
                  </div>
                </div>
              </Card>

              <NoticeBanner
                tone={bookingNotice.tone}
                heading={bookingNotice.heading}
                description={bookingNotice.description}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canReserve}
                aria-disabled={!canReserve}
                className="rounded-2xl"
              >
                {reserveButtonLabel}
              </Button>

              <Button type="button" variant="secondary" fullWidth onClick={onContact} className="rounded-2xl">
                Hablar con el anfitrión
              </Button>

              <p className="text-center text-xs leading-5 text-slate-500">
                No se confirma nada hasta que revises la estadía final.
              </p>
            </form>

            <BookingConfirmationModal
              isOpen={confirmOpen}
              onClose={closeBookingConfirmation}
              onConfirm={handleConfirmBooking}
              propertyTitle={property.title}
              hostName={hostName}
              checkIn={checkIn}
              checkOut={checkOut}
              nights={nights}
              adults={adults}
              children={childrenCount}
              nightly={nightly}
              total={total}
              confirmLoading={bookingSubmitting}
              submitNotice={bookingSubmitNotice}
            />
          </Card>
        </aside>

        <main className="space-y-8 xl:col-start-1 xl:row-start-2">
          <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <SectionTitle
                  eyebrow="Decisión"
                  heading="Lo importante para decidir"
                  description="Un resumen corto de lo que cambia la decisión antes de reservar."
                />
                <p className="max-w-3xl text-base leading-8 text-slate-600">
                  {property.description || 'Todavía no hay descripción disponible.'}
                </p>

                <ul className="space-y-3">
                  {decisionHighlights.map((item) => (
                    <li key={item} className="flex items-start gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                        <Icons.Check className="h-3.5 w-3.5" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Card padding="sm" variant="muted" className="rounded-[28px] border-slate-200/80 bg-slate-50/80">
                <SectionTitle
                  as="h3"
                  visualLevel="h4"
                  eyebrow="Anfitrión"
                  heading={hostName}
                  description={hostTenureLabel ?? 'Perfil activo en la plataforma'}
                />

                <div className="mt-4 flex items-start gap-3">
                  {property.host?.avatarUrl ? (
                    <img src={property.host.avatarUrl} alt={hostName} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white">
                      {getInitial(hostName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm leading-6 text-slate-600">
                      {property.host?.bio || 'Podés revisar sus señales de verificación y escribirle antes de reservar si querés despejar dudas.'}
                    </p>
                  </div>
                </div>

                {hostSignalBadges.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hostSignalBadges.map((badge) => {
                      const Icon = badge.icon;

                      return (
                        <Badge key={badge.label} variant={badge.variant} className="gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{badge.label}</span>
                        </Badge>
                      );
                    })}
                  </div>
                ) : null}
              </Card>
            </div>
          </Card>

          {hasAmenities ? (
            <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
              <SectionTitle
                eyebrow="Comodidades"
                heading="Comodidades clave"
                description="Lo que más pesa en la decisión, sin vueltas."
              />
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {property.amenities?.map((amenity) => (
                  <li key={amenity}>
                    <Card padding="sm" variant="muted" className="h-full rounded-[24px] border-slate-200/80 bg-slate-50/80">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                          <Icons.Check className="h-4 w-4" />
                        </span>
                        <p className="text-sm font-semibold text-slate-900">{amenity}</p>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
            <SectionTitle
              eyebrow="Confianza"
              heading="Señales para decidir con más claridad"
              description={traceability ? traceability.description : 'Revisá verificación, ubicación, historial y reseñas para decidir con más contexto.'}
            />

            <div className="mt-6 space-y-4">
              {traceability ? (
                <NoticeBanner
                  tone={traceability.noticeTone}
                  heading={traceability.noticeHeading}
                  description={traceability.noticeDescription}
                />
              ) : null}

              <NoticeBanner
                tone={unresolvedReviewsCount > 0 ? 'warning' : 'success'}
                heading={unresolvedReviewsCount > 0 ? `${unresolvedReviewsCount} ${unresolvedReviewsCount === 1 ? 'señal pendiente en reseñas' : 'señales pendientes en reseñas'}` : 'Sin alertas abiertas en reseñas'}
                description={unresolvedReviewsCount > 0 ? 'Hay comentarios o situaciones en revisión. Vale la pena leer las reseñas y consultar antes de reservar.' : 'Hasta ahora no aparecen conflictos abiertos asociados a esta publicación.'}
              />

              {trustSignals.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {trustSignals.map((signal) => (
                    <TrustSignalCard key={signal.label} {...signal} />
                  ))}
                </div>
              ) : (
                <NoticeBanner
                  tone="info"
                  heading="Todavía hay pocas señales extra"
                  description="La publicación muestra la información base, pero conviene revisar reseñas y hablar con el anfitrión antes de avanzar."
                />
              )}

              {traceabilityFactors.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {traceabilityFactors.map((factor) => (
                    <Card key={factor.label} padding="sm" variant="muted" className="rounded-[24px] border-slate-200/80 bg-slate-50/80">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{factor.label}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{factor.value}</p>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${factorImpactClasses[factor.impact]}`}>
                          {factorImpactLabels[factor.impact]}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <section className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionTitle
                eyebrow="Reseñas"
                heading="Cómo fue la experiencia de otros huéspedes"
                description={reviewCount > 0 ? 'Comentarios concretos para terminar de decidir con más seguridad.' : 'Todavía no hay reseñas publicadas para esta propiedad.'}
              />

              <Card padding="sm" variant="muted" className="w-full rounded-[28px] border-slate-200/80 bg-white lg:max-w-xs">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Icons.Star className="h-5 w-5 fill-current" />
                  </span>
                  <div>
                    <div className="text-xl font-bold tracking-tight text-slate-950">{ratingValue > 0 ? ratingValue.toFixed(1) : 'Nuevo'}</div>
                    <div className="text-sm text-slate-500">{reviewCount > 0 ? formatReviewCount(reviewCount) : 'Sin reseñas todavía'}</div>
                  </div>
                </div>
              </Card>
            </div>

            {visibleReviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleReviews.map((review) => (
                  <ReviewPreviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <NoticeBanner
                tone="info"
                heading="Todavía no hay opiniones publicadas"
                description="Cuando haya estadías completadas, vas a ver comentarios útiles para decidir con más claridad."
              />
            )}
          </section>
        </main>
      </div>

      {lightboxOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 sm:p-6" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/15"
            aria-label="Cerrar galería"
          >
            <Icons.X className="h-5 w-5" />
          </button>

          {mainIndex > 0 ? (
            <button
              type="button"
              onClick={() => setMainIndex(mainIndex - 1)}
              className="absolute left-4 rounded-full border border-white/15 bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/15 sm:left-6"
              aria-label="Imagen anterior"
            >
              <Icons.ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}

          <div className="max-h-[88vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-black/30 shadow-[0_36px_100px_-60px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white sm:px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Galería</p>
                <p className="mt-1 text-sm text-white/85">{property.title}</p>
              </div>
              <Badge variant="neutral" size="md" className="border-white/15 bg-white/10 text-white">
                {mainIndex + 1} / {images.length}
              </Badge>
            </div>
            <div className="flex items-center justify-center p-4 sm:p-8">
              <img
                src={images[mainIndex] || FALLBACK}
                alt={`${property.title} — imagen grande ${mainIndex + 1}`}
                className={`max-h-[72vh] w-full object-contain transition-transform duration-200 ${zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
                onClick={() => setZoomed((value) => !value)}
              />
            </div>
          </div>

          {mainIndex < images.length - 1 ? (
            <button
              type="button"
              onClick={() => setMainIndex(mainIndex + 1)}
              className="absolute right-4 rounded-full border border-white/15 bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/15 sm:right-6"
              aria-label="Imagen siguiente"
            >
              <Icons.ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const PropertyDetail: React.FC = () => {
  const { id } = useParams();
  const [property, setProperty] = useState<PropertyDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainIndex, setMainIndex] = useState(0);
  const [reviews, setReviews] = useState<PropertyReviewItem[]>([]);

  const favCtx = useFavorites();
  const isFav = id ? favCtx.isFavorite(id) : false;

  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!id) return;
        const p = await apiJson<PropertyDetailData>(`/api/properties/${id}`);
        if (cancelled) return;
        setProperty(p);
        setMainIndex(0);
        // fetch reviews if available
        try {
          const rev = await apiJson<PropertyReviewItem[]>(`/api/properties/${id}/reviews`);
          if (!cancelled) setReviews(rev || []);
        } catch (e) {
          // ignore reviews errors
        }
      } catch (err: any) {
        console.error('Error loading property', err);
        showToast('Propiedad', 'No pudimos cargar esta propiedad.', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <LoadingState message="Cargando la propiedad..." />;
  if (!property) return (
    <div className="max-w-4xl mx-auto p-6">
      <p className="text-center text-slate-500">No encontramos esta propiedad.</p>
    </div>
  );

  const images: string[] = (property.images && property.images.length) ? property.images : [property.imageUrl || FALLBACK];

  const handleContact = async () => {
    if (!user) {
      showToast('Necesitás iniciar sesión', 'Iniciá sesión para hablar con el anfitrión.', 'warning');
      import('../lib/modal').then(m => m.showLoginModal());
      return;
    }
    try {
      const res = await apiFetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id, message: 'Interesado en la propiedad' })
      });
         if (res.status === 401) {
           showToast('Necesitás iniciar sesión', 'Iniciá sesión para hablar con el anfitrión.', 'warning');
           // open login modal instead of redirect
           import('../lib/modal').then(m => m.showLoginModal());
           return;
         }
      if (!res.ok) throw new Error('server');
      showToast('Consulta', 'Listo. Tu consulta ya quedó enviada y el anfitrión te va a responder.', 'success');
    } catch (err) {
      console.error('Contact error', err);
      showToast('Consulta', 'No pudimos enviar tu consulta. Intentá de nuevo.', 'error');
    }
  };

  return (
    <PropertyDetailShell
      property={property}
      images={images}
      mainIndex={mainIndex}
      setMainIndex={setMainIndex}
      isFav={isFav}
      toggleFav={() => {
        if (!user) { import('../lib/modal').then(m => m.showLoginModal()); return; }
        if (!property.id) return;
        favCtx.toggleFavorite(property.id);
      }}
      onContact={handleContact}
      reviews={reviews}
    />
  );
};

export default PropertyDetail;
