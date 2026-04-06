import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/apiConfig';
import { LoadingState } from './LoadingState';
import { Icons } from './Icons';
import BookingConfirmationModal from './BookingConfirmationModal';
import DateRangePicker from './DateRangePicker';
import {
  getPropertyVerificationGuidanceMessage,
  getPropertyVerificationDetails,
  type PropertyVerificationItem,
} from '../lib/propertyVerification';
import { getHostTrust, getHostTrustLevelLabel, type HostTrustItem } from '../lib/hostTrust';
import { showToast } from '../lib/toast';
import { cn, formatCurrency } from '../lib/utils';
import {
  trackVerificationPreferenceOpen,
  trackVerificationPreferenceSave,
} from '../lib/verificationPreference';
import { type Property as AppProperty, type ReservationRequestContext, type ReservationRequestMode } from '../types';
import { useFavorites } from '../hooks/useFavorites';
import { useBookings } from '../hooks/useBookings';
import { useAuth } from '../hooks/useAuth';
import { sendMessage, startConversation } from '../services/geminiService';
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
  propertyRelationshipVerified?: boolean;
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

type BookingFieldKey = 'dates' | 'guests';

type BookingErrorState = {
  field: BookingFieldKey;
  message: string;
};

type GuestCounterCardProps = {
  label: string;
  helper: string;
  value: number;
  valueLabel: string;
  decrementLabel: string;
  incrementLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
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

const formatGuestSelection = (adults: number, childrenCount: number) => {
  const totalGuests = adults + childrenCount;

  if (childrenCount === 0) {
    return `${totalGuests} ${totalGuests === 1 ? 'huésped' : 'huéspedes'}`;
  }

  return `${adults} ${adults === 1 ? 'adulto' : 'adultos'} · ${childrenCount} ${childrenCount === 1 ? 'menor' : 'menores'}`;
};

const formatRequestDate = (value: string) => {
  const parsed = parseLocalIso(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
};

const buildInitialRequestMessage = (requestContext: ReservationRequestContext) => {
  const dateRangeLabel = `${formatRequestDate(requestContext.startDate)} al ${formatRequestDate(requestContext.endDate)}`;
  const guestLabel = `${requestContext.guests} ${requestContext.guests === 1 ? 'huésped' : 'huéspedes'}`;

  if (requestContext.mode === 'protected') {
    return `Hola ${requestContext.hostName}, te mandé una solicitud de reserva protegida para ${requestContext.propertyTitle} del ${dateRangeLabel} para ${guestLabel}. El total estimado es ${formatCurrency(requestContext.totalPrice)}. Quedo atento a tu respuesta por acá.`;
  }

  return `Hola ${requestContext.hostName}, me interesa ${requestContext.propertyTitle} del ${dateRangeLabel} para ${guestLabel}. El total estimado me da ${formatCurrency(requestContext.totalPrice)}. Si te sirve, lo coordinamos por acá.`;
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
  return 'Huésped';
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
  const usefulKeywords = ['ubic', 'wifi', 'limp', 'silenc', 'tranqui', 'céntr', 'parrilla', 'cochera', 'playa', 'precio', 'anfitri', 'detalle'];

  return usefulKeywords.reduce((score, keyword) => score + (comment.includes(keyword) ? 20 : 0), Math.min(review.comment.length, 140))
    + (comment.split(/\s+/).length >= 12 ? 20 : 0)
    + (/\d/.test(comment) ? 10 : 0);
};

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

const VerificationChecklistRow: React.FC<{ item: PropertyVerificationItem }> = ({ item }) => {
  return (
    <li className="flex items-start gap-3 py-3.5">
      <span
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
          item.status === 'complete'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-500',
        )}
        aria-hidden="true"
      >
        {item.status === 'complete' ? '✔' : '○'}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-semibold leading-5 text-slate-900">{item.label}</p>
        <p className="mt-1 line-clamp-1 text-sm leading-5 text-slate-600">{item.description}</p>
      </div>
    </li>
  );
};

const HostTrustChecklistRow: React.FC<{ item: HostTrustItem }> = ({ item }) => {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
          item.status === 'complete'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-500',
        )}
        aria-hidden="true"
      >
        {item.status === 'complete' ? '✔' : '○'}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-5 text-slate-900">{item.label}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.description}</p>
      </div>
    </li>
  );
};

const HostTrustPanel: React.FC<{
  hostName: string;
  hostTenureLabel: string | null;
  hostAvatarUrl?: string;
  hostTrustLevelLabel: string;
  items: HostTrustItem[];
}> = ({ hostName, hostTenureLabel, hostAvatarUrl, hostTrustLevelLabel, items }) => {
  const visibleItems = items.slice(0, 3);

  return (
    <Card className="rounded-[30px] border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.25)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-lg font-semibold text-white">
          {hostAvatarUrl ? (
            <img src={hostAvatarUrl} alt={hostName} className="h-full w-full object-cover" />
          ) : (
            getInitial(hostName)
          )}
        </div>

        <div className="min-w-0">
          <SectionTitle
            eyebrow="Anfitrión"
            heading={hostName}
            description={hostTenureLabel ?? 'Perfil activo en la plataforma'}
          />
          <p className="mt-3 text-sm font-semibold text-slate-900">Nivel de confianza: {hostTrustLevelLabel}</p>
          <ul className="mt-4 divide-y divide-slate-200/80 border-t border-slate-200/80">
            {visibleItems.map((item) => (
              <HostTrustChecklistRow key={item.key} item={item} />
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

const PropertyVerificationPanel: React.FC<{
  details: ReturnType<typeof getPropertyVerificationDetails>;
}> = ({ details }) => {
  const { items, summaryLabel, spacedVisual } = details;

  return (
    <Card className="rounded-[30px] border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.25)] sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="max-w-2xl">
          <SectionTitle
            eyebrow="Verificación"
            heading="Nivel de verificación"
            description="Qué parte del aviso ya fue comprobada. Lo demás conviene revisarlo antes de reservar."
          />
        </div>

        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-3.5 lg:min-w-[240px]">
          <p className="text-[0.98rem] font-semibold text-slate-900">{summaryLabel}</p>
          <p className="mt-2 font-mono text-[0.98rem] font-semibold tracking-[0.16em] text-slate-900" aria-label={summaryLabel}>
            {spacedVisual}
          </p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-slate-200/80 border-t border-slate-200/80">
        {items.map((item) => (
          <VerificationChecklistRow key={item.key} item={item} />
        ))}
      </ul>
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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand">
          <Icons.Star className="h-4 w-4 fill-current" />
          <span>{review.rating.toFixed(1)}</span>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fragmento útil</p>
      <p className="mt-2 text-sm leading-7 text-slate-700">{review.comment}</p>
    </Card>
  );
};

const GuestCounterCard: React.FC<GuestCounterCardProps> = ({
  label,
  helper,
  value,
  valueLabel,
  decrementLabel,
  incrementLabel,
  onDecrement,
  onIncrement,
  decrementDisabled = false,
  incrementDisabled = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-2 py-1.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.12)]">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDecrement}
          className="h-9 w-9 rounded-full p-0 font-semibold"
          aria-label={decrementLabel}
          disabled={decrementDisabled}
        >
          -
        </Button>

        <div className="min-w-[3.5rem] text-center">
          <p className="text-lg font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{valueLabel}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onIncrement}
          className="h-9 w-9 rounded-full p-0 font-semibold"
          aria-label={incrementLabel}
          disabled={incrementDisabled}
        >
          +
        </Button>
      </div>
    </div>
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
  const [isGuestPickerOpen, setIsGuestPickerOpen] = useState(false);
  const [bookingSubmitMode, setBookingSubmitMode] = useState<ReservationRequestMode | null>(null);
  const [bookingSubmitNotice, setBookingSubmitNotice] = useState<BookingConfirmationNotice | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingSuccessState | null>(null);
  const [availabilityRefreshToken, setAvailabilityRefreshToken] = useState(0);
  const guestPickerRef = useRef<HTMLDivElement | null>(null);
  const guestTriggerRef = useRef<HTMLButtonElement | null>(null);

  const reviewCount = Math.max(Number(property.reviewsCount) || 0, reviews.length);
  const ratingValue = Number(property.rating) || 0;
  const guestCapacity = formatGuestCapacity(property.maxGuests);
  const nightly = Number(property?.price) || 0;
  const hostName = getHostName(property);
  const hostTenureLabel = getHostTenureLabel(property);
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const decisionAmenityLabel = getDecisionAmenityLabel(property.amenities);
  const verificationGuidanceMessage = getPropertyVerificationGuidanceMessage(property);
  const verificationDetails = getPropertyVerificationDetails(property);
  const hostTrust = getHostTrust(property);
  const hostTrustLevelLabel = getHostTrustLevelLabel(hostTrust.level);

  const heroBadges = [
    property.identityValidated ? { label: 'Identidad confirmada', variant: 'brand', icon: Icons.ShieldCheck } : null,
    property.locationVerified ? { label: 'Ubicación verificada', variant: 'info', icon: Icons.MapPin } : null,
    property.videoValidated ? { label: 'Material real del lugar', variant: 'success', icon: Icons.Video } : null,
    property.hasPresencialVerification ? { label: 'Verificación presencial', variant: 'success', icon: Icons.Home } : null,
  ].filter(Boolean).slice(0, 3) as IconBadge[];

  const decisionSummaryStats = [
    { label: 'Ubicación', value: property.location, icon: Icons.MapPin },
    guestCapacity ? { label: 'Para', value: guestCapacity.replace('Hasta ', ''), icon: Icons.Users } : null,
    nightly ? { label: 'Precio por noche', value: formatCurrency(nightly), icon: Icons.FileSpreadsheet } : null,
    { label: 'Rating', value: ratingValue > 0 ? `${ratingValue.toFixed(1)} · ${formatReviewCount(reviewCount)}` : 'Sin reseñas todavía', icon: Icons.Star },
  ].filter(Boolean) as DetailStatProps[];

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
  const canRemoveAdult = adults > 1;
  const canRemoveChildren = childrenCount > 0;
  const canAddGuest = !guestCapacityReached;
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
          heading: 'Faltan las fechas',
          description: 'Elegí ingreso y salida para ver el total.',
        }
      : hasPartialDates
        ? {
            tone: 'info',
            heading: 'Falta la salida',
            description: 'Elegila para ver el total.',
          }
        : canReserve
          ? {
              tone: 'success',
              heading: 'Ya podés enviar la solicitud',
              description: `${formatCurrency(total)} total · ${nights} ${nights === 1 ? 'noche' : 'noches'} · ${formatGuestSelection(adults, childrenCount)}.`,
            }
          : {
              tone: 'warning',
              heading: 'Ajustá los datos',
              description: maxGuestsNumber
                ? `Esta propiedad admite hasta ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
                : 'Revisá fechas y huéspedes antes de seguir.',
            };

  const reserveButtonLabel = canReserve
    ? 'Solicitar reserva'
    : !checkIn && !checkOut
      ? 'Elegí fechas'
      : hasPartialDates
        ? 'Elegí salida'
        : guestCapacityExceeded
          ? 'Ajustá los huéspedes'
          : 'Solicitar reserva';

  const dateFieldHelper = !checkIn && !checkOut
    ? 'Elegí ingreso y salida.'
    : hasPartialDates
      ? 'Falta la salida.'
      : `${nights} ${nights === 1 ? 'noche seleccionada' : 'noches seleccionadas'}.`;

  const guestFieldHelper = maxGuestsNumber
    ? guestCapacityReached
      ? `Máximo: ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
      : `Hasta ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
    : 'Elegí cuántas personas viajan.';

  const resetBookingSubmitState = () => {
    setBookingSubmitMode(null);
    setBookingSubmitNotice(null);
  };

  const resetBookingDraft = () => {
    setCheckIn('');
    setCheckOut('');
    setAdults(1);
    setChildrenCount(0);
  };

  const clearBookingFeedback = () => {
    setBookingError(null);
    setBookingSubmitNotice(null);
    setBookingSuccess(null);
  };

  useEffect(() => {
    if (!isGuestPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!guestPickerRef.current?.contains(event.target as Node)) {
        setIsGuestPickerOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setIsGuestPickerOpen(false);
      guestTriggerRef.current?.focus();
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isGuestPickerOpen]);

  const closeBookingConfirmation = () => {
    if (bookingSubmitMode) return;
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
      setBookingError({ field: 'dates', message: 'Elegí ingreso y salida para seguir.' });
      return;
    }
    if (checkIn && !checkOut) {
      setBookingError({ field: 'dates', message: 'Elegí la salida para seguir.' });
      return;
    }
    if (!checkIn) {
      setBookingError({ field: 'dates', message: 'Elegí el ingreso para seguir.' });
      return;
    }
    if (parseLocalIso(checkOut) <= parseLocalIso(checkIn)) {
      setBookingError({ field: 'dates', message: 'La salida tiene que ser después del ingreso.' });
      return;
    }
    if (parseLocalIso(checkIn) < parseLocalIso(todayISO)) {
      setBookingError({ field: 'dates', message: 'El ingreso no puede ser antes de hoy.' });
      return;
    }
    if (maxGuestsNumber && guestCount > maxGuestsNumber) {
      setBookingError({
        field: 'guests',
        message: `Máximo ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}. Ajustá la cantidad para seguir.`,
      });
      return;
    }
    setBookingError(null);
    resetBookingSubmitState();
    setConfirmOpen(true);
  };

  const buildReservationRequestContext = (
    mode: ReservationRequestMode,
    bookingId?: string,
    bookingStatus?: ReservationRequestContext['bookingStatus'],
  ): ReservationRequestContext => ({
    propertyId: property.id ?? '',
    propertyTitle: property.title,
    hostName,
    startDate: checkIn,
    endDate: checkOut,
    guests: guestCount,
    nightly,
    nights,
    totalPrice: total,
    mode,
    bookingId,
    bookingStatus,
  });

  const prepareConversationForRequest = async (requestContext: ReservationRequestContext, bookingId?: string) => {
    if (!property.id || !property.hostId) {
      throw new Error('No pudimos preparar el chat de esta propiedad. Probá de nuevo.');
    }

    const conversation = await startConversation(property.id, property.hostId, bookingId);

    try {
      await sendMessage(conversation.id, buildInitialRequestMessage(requestContext), property.hostId);
      return { conversationId: conversation.id, initialMessageSent: true };
    } catch (error) {
      console.error('Request message error', error);
      return { conversationId: conversation.id, initialMessageSent: false };
    }
  };

  const navigateToConversation = (conversationId: string, requestContext: ReservationRequestContext) => {
    navigate(`/chat/${conversationId}`, { state: { requestContext } });
  };

  const openLoginForRequest = (title: string, description: string) => {
    setConfirmOpen(false);
    resetBookingSubmitState();
    showToast(title, description, 'warning');
    import('../lib/modal').then((m) => m.showLoginModal());
  };

  const handleStartDirectRequest = async () => {
    if (!property.id) {
      setBookingSubmitNotice({
        tone: 'error',
        heading: 'No pudimos abrir el chat',
        description: 'Falta identificar la propiedad antes de seguir. Probá recargando la página.',
      });
      return;
    }

    if (!user) {
      openLoginForRequest('Necesitás iniciar sesión', 'Iniciá sesión para abrir el chat o mandar una solicitud.');
      return;
    }

    setBookingSubmitMode('direct');
    setBookingSubmitNotice(null);

    const requestContext = buildReservationRequestContext('direct');

    try {
      const { conversationId, initialMessageSent } = await prepareConversationForRequest(requestContext);

      setConfirmOpen(false);
      resetBookingSubmitState();
      navigateToConversation(conversationId, requestContext);
      showToast(
        'Chat abierto',
        initialMessageSent
          ? 'Ya le mandaste tu propuesta al anfitrión y la conversación quedó abierta.'
          : 'Abrimos el chat, pero la propuesta automática no salió. Podés seguir desde ahí.',
        initialMessageSent ? 'success' : 'warning',
      );
    } catch (error) {
      console.error('Direct request error', error);
      setBookingSubmitMode(null);
      setBookingSubmitNotice({
        tone: 'error',
        heading: 'No pudimos abrir el chat',
        description: error instanceof Error ? error.message : 'Intentá de nuevo en unos segundos.',
      });
    }
  };

  const handleStartProtectedRequest = async () => {
    if (!property.id) {
      setBookingSubmitNotice({
        tone: 'error',
        heading: 'No pudimos enviar la solicitud',
        description: 'Falta identificar la propiedad antes de seguir. Probá recargando la página.',
      });
      return;
    }

    if (!user) {
      openLoginForRequest('Necesitás iniciar sesión', 'Iniciá sesión para mandar una solicitud protegida.');
      return;
    }

    setBookingSubmitMode('protected');
    setBookingSubmitNotice(null);

    const result = await createBooking({
      propertyId: property.id,
      startDate: checkIn,
      endDate: checkOut,
      guests: guestCount,
      totalPrice: total,
      requestMode: 'protected',
    });

    if (!result.ok) {
      setBookingSubmitMode(null);

      if (result.error.status === 401) {
        openLoginForRequest('Necesitás iniciar sesión', 'Iniciá sesión para mandar una solicitud protegida.');
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
        heading: tone === 'warning' ? 'Revisá los datos antes de enviar' : 'No pudimos enviar la solicitud',
        description: result.error.message,
      });
      return;
    }

    const bookedTotal = result.data.booking?.totalPrice ?? result.data.pricing.total ?? total;
    const requestContext = buildReservationRequestContext('protected', result.data.booking.id, result.data.booking.status);

    setBookingError(null);
    setConfirmOpen(false);
    resetBookingSubmitState();
    resetBookingDraft();
    setAvailabilityRefreshToken((currentValue) => currentValue + 1);

    try {
      const { conversationId, initialMessageSent } = await prepareConversationForRequest(requestContext, result.data.booking.id);

      navigateToConversation(conversationId, requestContext);
      showToast(
        'Solicitud enviada',
        initialMessageSent
          ? `La reserva protegida quedó pendiente por ${formatCurrency(bookedTotal)} y ya abrimos el chat para seguir con ${hostName}.`
          : 'La solicitud quedó pendiente. Abrimos el chat, pero la propuesta automática no salió; seguí desde ahí.',
        initialMessageSent ? 'success' : 'warning',
      );
    } catch (error) {
      console.error('Protected request conversation error', error);
      showToast(
        'Solicitud enviada',
        'La reserva protegida quedó pendiente. No pudimos abrir el chat ahora, pero la vas a ver en Mis reservas.',
        'success',
      );
      navigate('/my-bookings');
    }
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
              {heroBadges.map((badge, index) => {
                const Icon = badge.icon;

                return (
                  <Badge key={`${badge.label}-${index}`} variant={badge.variant} size="md" className="gap-2">
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
              description="Revisá ubicación, anfitrión y qué parte del aviso ya fue comprobada antes de mandar una solicitud."
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

        <aside className="mx-auto w-full max-w-2xl xl:max-w-none xl:self-start">
          <Card variant="elevated" className="rounded-[30px] border-slate-200/80 bg-white p-4 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] sm:p-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Armá tu solicitud</p>
                <div className="flex items-end gap-2">
                  <span className="text-[2.55rem] font-black tracking-tight text-slate-950 sm:text-[2.9rem]">{nightly ? formatCurrency(nightly) : '—'}</span>
                  <span className="pb-1 text-sm font-medium text-slate-500">/ noche</span>
                </div>
                <p className="text-sm leading-6 text-slate-500">Elegí fechas para ver el total y después decidí si querés hablar primero o dejar la solicitud protegida.</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 font-semibold text-brand">
                    <Icons.Star className="h-4 w-4 fill-current" />
                    <span>{ratingValue > 0 ? ratingValue.toFixed(1) : 'Sin puntaje'}</span>
                  </span>
                  <span>{reviewCount > 0 ? formatReviewCount(reviewCount) : 'Sin reseñas todavía'}</span>
                </div>
              </div>

              {user ? (
                <Button
                  onClick={toggleFav}
                  aria-pressed={isFav}
                  aria-label={isFav ? 'Quitar de guardados' : 'Guardar en guardados'}
                  variant="secondary"
                  size="icon"
                  className={isFav ? 'border-brand bg-brand text-white hover:border-brand hover:bg-brand-dark hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand/30 hover:text-brand'}
                >
                  <Icons.Heart className="h-5 w-5" />
                </Button>
              ) : null}
            </div>

            {bookingSuccess ? (
              <Card padding="sm" variant="muted" className="mt-5 rounded-[24px] border-brand/10 bg-brand/5">
                <NoticeBanner
                  tone="info"
                  heading="La estadía ya quedó confirmada"
                  description={`Guardamos ${bookingSuccess.nights} ${bookingSuccess.nights === 1 ? 'noche' : 'noches'} para ${bookingSuccess.guestSummary} por ${formatCurrency(bookingSuccess.total)}. Desde Mis reservas podés revisar fechas, estado y condiciones.`}
                  className="border-brand/15 bg-white/85 text-slate-700 shadow-none dark:border-brand/20 dark:bg-slate-900/85 dark:text-slate-100"
                />

                {bookingSuccess.stayCode ? (
                  <Badge variant="brand" size="md" className="mt-4 gap-2">
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

            <form className="mt-5 space-y-4" onSubmit={handleReserve}>
              <div className="space-y-3.5">
                <FormField
                  label="Fechas"
                  helperText={dateFieldHelper}
                  error={bookingError?.field === 'dates' ? bookingError.message : undefined}
                  className="min-w-0 w-full"
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
                    monthsToShow={1}
                  />
                </FormField>

                <FormField
                  label="Huéspedes"
                  error={bookingError?.field === 'guests' ? bookingError.message : undefined}
                  className="min-w-0 w-full"
                >
                  <div ref={guestPickerRef} className="min-w-0 w-full">
                    <button
                      ref={guestTriggerRef}
                      type="button"
                      aria-expanded={isGuestPickerOpen}
                      aria-controls="booking-guest-picker"
                      aria-label={`Abrir selector de huéspedes. ${guestCount} ${guestCount === 1 ? 'persona' : 'personas'}.`}
                      onClick={() => setIsGuestPickerOpen((current) => !current)}
                      className={cn(
                        'flex w-full min-w-0 items-center justify-between gap-3 rounded-[22px] border bg-white px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150',
                        isGuestPickerOpen
                          ? 'border-brand/30 bg-brand/5 shadow-[0_18px_36px_-30px_rgba(67,56,202,0.34)]'
                          : 'border-slate-200/80 hover:border-slate-300/90 hover:bg-slate-50/80',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-6 text-slate-950">{formatGuestSelection(adults, childrenCount)}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{guestFieldHelper}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700">
                          {guestCount}
                        </span>
                        <Icons.ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isGuestPickerOpen && 'rotate-180')} />
                      </div>
                    </button>

                    {isGuestPickerOpen ? (
                      <div
                        id="booking-guest-picker"
                        className="mt-2.5 w-full overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.14)]"
                      >
                        <div className="space-y-0 px-4 py-3">
                          <GuestCounterCard
                            label="Adultos"
                            helper="Mayores de 18"
                            value={adults}
                            valueLabel={adults === 1 ? 'adulto' : 'adultos'}
                            decrementLabel="Restar adulto"
                            incrementLabel="Sumar adulto"
                            onDecrement={() => handleAdultsChange(adults - 1)}
                            onIncrement={() => handleAdultsChange(adults + 1)}
                            decrementDisabled={!canRemoveAdult}
                            incrementDisabled={!canAddGuest}
                          />
                          <div className="border-t border-slate-200/70" />
                          <GuestCounterCard
                            label="Niños"
                            helper="Hasta 17 años"
                            value={childrenCount}
                            valueLabel={childrenCount === 1 ? 'menor' : 'menores'}
                            decrementLabel="Restar menor"
                            incrementLabel="Sumar menor"
                            onDecrement={() => handleChildrenChange(childrenCount - 1)}
                            onIncrement={() => handleChildrenChange(childrenCount + 1)}
                            decrementDisabled={!canRemoveChildren}
                            incrementDisabled={!canAddGuest}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </FormField>
              </div>

              <Card padding="sm" variant="muted" className="rounded-[22px] border-slate-200/80 bg-slate-50/80">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Total estimado</div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {hasCompleteDates ? formatCurrency(total) : 'Elegí fechas'}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {hasCompleteDates
                        ? `${nights} ${nights === 1 ? 'noche' : 'noches'} × ${formatCurrency(nightly)}`
                        : 'Elegí fechas para ver el total.'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Precio base</div>
                    <div className="mt-1 text-sm font-medium text-slate-600">{nightly ? formatCurrency(nightly) : '—'} / noche</div>
                  </div>
                </div>

                <div className="mt-3 space-y-2.5 border-t border-slate-200/70 pt-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="text-slate-500">Fechas</div>
                    <div className="text-right font-medium text-slate-900">
                      {hasCompleteDates ? `${nights} ${nights === 1 ? 'noche' : 'noches'} seleccionadas` : 'Faltan fechas'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="text-slate-500">Huéspedes</div>
                    <div className="text-right font-medium text-slate-900">{formatGuestSelection(adults, childrenCount)}</div>
                  </div>
                  {maxGuestsNumber ? (
                    <p className="text-xs leading-5 text-slate-500">
                      Capacidad máxima: {maxGuestsNumber} {maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.
                    </p>
                  ) : null}
                </div>
              </Card>

              <NoticeBanner
                tone={bookingNotice.tone}
                heading={bookingNotice.heading}
                description={bookingNotice.description}
                className="shadow-none"
              />

              <div className="space-y-2.5">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!canReserve}
                  aria-disabled={!canReserve}
                  className="rounded-2xl shadow-[0_24px_46px_-28px_rgba(67,56,202,0.42)]"
                >
                  <>
                    <Icons.ArrowRight className="h-4 w-4" />
                    {reserveButtonLabel}
                  </>
                </Button>

                <Button type="button" variant="secondary" fullWidth onClick={onContact} className="rounded-2xl border-slate-200 bg-white">
                  Abrir chat
                </Button>
              </div>

              <p className="text-center text-xs leading-5 text-slate-500">
                Primero revisás la propuesta y después elegís si querés conversar o dejarla protegida en la app.
              </p>
            </form>

            <BookingConfirmationModal
              isOpen={confirmOpen}
              onClose={closeBookingConfirmation}
              onStartDirect={handleStartDirectRequest}
              onStartProtected={handleStartProtectedRequest}
              propertyTitle={property.title}
              hostName={hostName}
              checkIn={checkIn}
              checkOut={checkOut}
              nights={nights}
              adults={adults}
              children={childrenCount}
              nightly={nightly}
              total={total}
              actionLoadingMode={bookingSubmitMode}
              submitNotice={bookingSubmitNotice}
            />
          </Card>
        </aside>

        <main className="space-y-8 xl:col-start-1 xl:row-start-2">
          <div className="space-y-3">
            {verificationGuidanceMessage ? (
              <p className="text-sm font-medium leading-6 text-slate-600">
                {verificationGuidanceMessage}
              </p>
            ) : null}
            <PropertyVerificationPanel details={verificationDetails} />
          </div>

          <HostTrustPanel
            hostName={hostName}
            hostTenureLabel={hostTenureLabel}
            hostAvatarUrl={property.host?.avatarUrl}
            hostTrustLevelLabel={hostTrustLevelLabel}
            items={hostTrust.items}
          />

          <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
            <div className="space-y-4">
              <SectionTitle
                eyebrow="Antes de decidir"
                heading="Lo importante de este aviso"
                description="Un resumen corto para ver si este lugar te cierra."
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
          </Card>

          {hasAmenities ? (
            <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
              <SectionTitle
                eyebrow="Comodidades"
                heading="Comodidades clave"
                description="Lo más útil para comparar esta propiedad."
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

          <section className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionTitle
                eyebrow="Reseñas"
                heading="Cómo fue la experiencia de otros huéspedes"
                description={reviewCount > 0 ? 'Reseñas reales para entender mejor cómo fue la estadía.' : 'Todavía no hay reseñas reales publicadas para esta propiedad.'}
              />

              <Card padding="sm" variant="muted" className="w-full rounded-[28px] border-slate-200/80 bg-white lg:max-w-xs">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                    <Icons.Star className="h-5 w-5 fill-current" />
                  </span>
                  <div>
                    <div className="text-xl font-bold tracking-tight text-slate-950">{ratingValue > 0 ? ratingValue.toFixed(1) : 'Sin puntaje'}</div>
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
                description="Cuando haya estadías completadas, vas a ver reseñas reales para comparar mejor."
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
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!property?.id) {
      return;
    }

    trackVerificationPreferenceOpen(property);
  }, [property]);

  if (loading) return <LoadingState message="Cargando la propiedad..." />;
  if (!property) return (
    <div className="max-w-4xl mx-auto p-6">
      <p className="text-center text-slate-500">No encontramos esta propiedad.</p>
    </div>
  );

  const images: string[] = (property.images && property.images.length) ? property.images : [property.imageUrl || FALLBACK];

  const handleContact = async () => {
    if (!user) {
      showToast('Necesitás iniciar sesión', 'Iniciá sesión para abrir el chat con el anfitrión.', 'warning');
      import('../lib/modal').then(m => m.showLoginModal());
      return;
    }

    if (!property.id || !property.hostId) {
      showToast('Chat', 'No pudimos abrir el chat de esta propiedad. Probá de nuevo.', 'error');
      return;
    }

    try {
      const conversation = await startConversation(property.id, property.hostId);
      navigate(`/chat/${conversation.id}`);
      showToast('Chat abierto', 'Ya abrimos el chat para que sigas la conversación con el anfitrión.', 'success');
    } catch (err) {
      console.error('Contact error', err);
      showToast('Chat', 'No pudimos abrir el chat. Intentá de nuevo.', 'error');
    }
  };

  const handleFavoriteToggle = () => {
    if (!user) {
      import('../lib/modal').then((m) => m.showLoginModal());
      return;
    }

    if (!property.id) {
      return;
    }

    const nextFavoriteState = !isFav;

    void favCtx.toggleFavorite(property.id).then((result) => {
      if (nextFavoriteState && (result === 'added' || result === 'pending-add')) {
        trackVerificationPreferenceSave(property);
      }
    });
  };

  return (
    <PropertyDetailShell
      property={property}
      images={images}
      mainIndex={mainIndex}
      setMainIndex={setMainIndex}
      isFav={isFav}
      toggleFav={handleFavoriteToggle}
      onContact={handleContact}
      reviews={reviews}
    />
  );
};

export default PropertyDetail;
