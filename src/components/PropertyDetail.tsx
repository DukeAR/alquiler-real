import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/apiConfig';
import { LoadingState } from './LoadingState';
import { Icons } from './Icons';
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

type EssentialInfoItem = {
  icon: IconComponent;
  label: string;
  value: string;
};

type BookingFieldKey = 'dates' | 'guests' | 'mode';

type BookingErrorState = {
  field: BookingFieldKey;
  message: string;
};

type BookingStep = 'dates' | 'guests' | 'mode' | 'confirm';

type BookingStepConfig = {
  key: BookingStep;
  title: string;
  description: string;
  shortLabel: string;
  icon: IconComponent;
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

type BookingConfirmationNotice = {
  tone: NonNullable<React.ComponentProps<typeof NoticeBanner>['tone']>;
  heading: string;
  description: string;
};

type ReservationModeCardProps = {
  mode: ReservationRequestMode;
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  helper?: string;
  onSelect: (mode: ReservationRequestMode) => void;
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

const getPositiveNumber = (value: unknown) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const formatCountLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

const formatGuestCapacity = (maxGuests?: number | null) => {
  if (!maxGuests) return null;
  return `Hasta ${formatCountLabel(maxGuests, 'huésped', 'huéspedes')}`;
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

const formatGuestCountLabel = (guestCount: number) => formatCountLabel(guestCount, 'huésped', 'huéspedes');

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

const formatDateSelectionSummary = (checkIn: string, checkOut: string) => {
  if (!checkIn && !checkOut) {
    return 'Todavía no elegiste fechas';
  }

  if (checkIn && !checkOut) {
    return `Ingreso ${formatRequestDate(checkIn)} · Falta salida`;
  }

  if (!checkIn && checkOut) {
    return `Salida ${formatRequestDate(checkOut)} · Falta ingreso`;
  }

  return `${formatRequestDate(checkIn)} al ${formatRequestDate(checkOut)}`;
};

const buildInitialRequestMessage = (requestContext: ReservationRequestContext) => {
  const dateRangeLabel = `${formatRequestDate(requestContext.startDate)} al ${formatRequestDate(requestContext.endDate)}`;
  const guestLabel = `${requestContext.guests} ${requestContext.guests === 1 ? 'huésped' : 'huéspedes'}`;

  if (requestContext.mode === 'protected') {
    return `Hola ${requestContext.hostName}, te mandé una solicitud de reserva protegida para ${requestContext.propertyTitle} del ${dateRangeLabel} para ${guestLabel}. El total estimado es ${formatCurrency(requestContext.totalPrice)}. Quedo atento a tu respuesta por acá.`;
  }

  return `Hola ${requestContext.hostName}, me interesa ${requestContext.propertyTitle} del ${dateRangeLabel} para ${guestLabel}. El total estimado me da ${formatCurrency(requestContext.totalPrice)}. Si te sirve, lo coordinamos por acá.`;
};

const BOOKING_STEP_CONFIG: BookingStepConfig[] = [
  {
    key: 'dates',
    title: 'Elegí las fechas',
    description: 'Marcá ingreso y salida. Después seguís con huéspedes.',
    shortLabel: 'Fechas',
    icon: Icons.Calendar,
  },
  {
    key: 'guests',
    title: 'Definí quiénes viajan',
    description: 'Ajustá cuántas personas viajan sin volver a cargar las fechas.',
    shortLabel: 'Huéspedes',
    icon: Icons.Users,
  },
  {
    key: 'mode',
    title: 'Elegí cómo querés avanzar',
    description: 'Elegí si querés seguir por chat o dejar la solicitud registrada en la app.',
    shortLabel: 'Cómo avanzar',
    icon: Icons.MessageSquare,
  },
  {
    key: 'confirm',
    title: 'Revisá el resumen final',
    description: 'Revisá todo antes de mandárselo al anfitrión.',
    shortLabel: 'Confirmación',
    icon: Icons.CheckCircle2,
  },
] as const;

const RESERVATION_MODE_CONTENT: Record<ReservationRequestMode, {
  title: string;
  description: string;
  helper: string;
  confirmationHeading: string;
  confirmationDescription: string;
}> = {
  direct: {
    title: 'Acuerdo directo',
    description: 'Abrís el chat con fechas y huéspedes ya cargados para seguir la conversación por ahí.',
    helper: 'La app no bloquea fechas ni interviene en la seña.',
    confirmationHeading: 'La propuesta queda lista en el chat',
    confirmationDescription: 'Al enviar, el anfitrión recibe fechas, huéspedes y total dentro de la conversación.',
  },
  protected: {
    title: 'Reserva protegida',
    description: 'La solicitud queda registrada en la app y seguís por chat con todo ya asentado.',
    helper: 'Fechas, huéspedes y total quedan asentados desde ahora.',
    confirmationHeading: 'La solicitud queda registrada en la app',
    confirmationDescription: 'Al enviarla, el anfitrión la ve en el chat y vos la seguís desde Mis reservas.',
  },
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

  const title = property.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (title.includes('casa')) return 'Casa';
  if (title.includes('duplex') || title.includes('chalet') || /(^|\s)ph($|\s)/.test(title)) return 'Casa';
  if (title.includes('monoambiente')) return 'Departamento';
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

const EssentialInfoCard: React.FC<EssentialInfoItem> = ({ icon: Icon, label, value }) => {
  return (
    <div className="rounded-[26px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.16)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.22)]">
          <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</p>
    </div>
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

const ReservationModeCard: React.FC<ReservationModeCardProps> = ({
  mode,
  selected,
  disabled = false,
  title,
  description,
  helper,
  onSelect,
}) => {
  return (
    <label
      className={cn(
        'block rounded-[24px] border p-4 transition-[border-color,box-shadow,background-color] duration-150',
        disabled && 'cursor-not-allowed opacity-70',
        selected
          ? 'border-brand/40 bg-white shadow-[0_18px_40px_-32px_rgba(14,116,144,0.45)] ring-1 ring-brand/15'
          : mode === 'protected'
            ? 'border-slate-200 bg-brand/[0.04] hover:border-brand/25'
            : 'border-slate-200 bg-white hover:border-slate-300',
      )}
    >
      <input
        type="radio"
        name="reservation-mode"
        value={mode}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(mode)}
        className="sr-only"
      />

      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
            selected ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-transparent',
          )}
        >
          <span className={cn('h-2 w-2 rounded-full bg-current', !selected && 'opacity-0')} />
        </span>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          {helper ? <p className="mt-2 text-xs font-medium text-slate-500">{helper}</p> : null}
        </div>
      </div>
    </label>
  );
};

export const PropertyDetailShell: React.FC<{
  property: PropertyDetailData;
  images: string[];
  mainIndex: number;
  setMainIndex: (i: number) => void;
  isFav: boolean;
  toggleFav: () => void;
  reviews?: PropertyReviewItem[];
}> = ({ property, images, mainIndex, setMainIndex, isFav, toggleFav, reviews = [] }) => {
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
  const [bookingStep, setBookingStep] = useState<BookingStep>('dates');
  const [selectedRequestMode, setSelectedRequestMode] = useState<ReservationRequestMode | null>(null);
  const [bookingError, setBookingError] = useState<BookingErrorState | null>(null);
  const [bookingSubmitMode, setBookingSubmitMode] = useState<ReservationRequestMode | null>(null);
  const [bookingSubmitNotice, setBookingSubmitNotice] = useState<BookingConfirmationNotice | null>(null);
  const [availabilityRefreshToken, setAvailabilityRefreshToken] = useState(0);
  const bookingStepPanelRef = useRef<HTMLDivElement | null>(null);
  const datePickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingDatePickerOpenRef = useRef(false);

  const reviewCount = Math.max(Number(property.reviewsCount) || 0, reviews.length);
  const ratingValue = Number(property.rating) || 0;
  const nightly = getPositiveNumber(property?.price) ?? 0;
  const maxGuestsNumber = getPositiveNumber(property.maxGuests);
  const bedroomsCount = getPositiveNumber(property.bedrooms);
  const bathroomsCount = getPositiveNumber(property.bathrooms);
  const guestCapacity = formatGuestCapacity(maxGuestsNumber);
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

  const hasAmenities = (property.amenities?.length ?? 0) > 0;
  const essentialInfoItems = [
    guestCapacity ? { label: 'Capacidad', value: guestCapacity, icon: Icons.Users } : null,
    bedroomsCount ? { label: 'Dormitorios', value: formatCountLabel(bedroomsCount, 'dormitorio', 'dormitorios'), icon: Icons.BedDouble } : null,
    bathroomsCount ? { label: 'Baños', value: formatCountLabel(bathroomsCount, 'baño', 'baños'), icon: Icons.Bath } : null,
    !bedroomsCount || !bathroomsCount ? { label: 'Tipo', value: propertyTypeLabel, icon: Icons.Home } : null,
  ].filter(Boolean) as EssentialInfoItem[];

  const todayISO = formatLocalIso(new Date());

  const guestCount = adults + childrenCount;
  const nights = (checkIn && checkOut) ? Math.max(0, Math.round((parseLocalIso(checkOut).getTime() - parseLocalIso(checkIn).getTime()) / (1000*60*60*24))) : 0;
  const total = nights * nightly;
  const decisionHighlights = [
    guestCapacity ? `Puede alojar hasta ${formatCountLabel(maxGuestsNumber ?? 0, 'huésped', 'huéspedes')}.` : null,
    bedroomsCount ? `Tiene ${formatCountLabel(bedroomsCount, 'dormitorio', 'dormitorios')}.` : null,
    bathroomsCount ? `Tiene ${formatCountLabel(bathroomsCount, 'baño', 'baños')}.` : null,
    decisionAmenityLabel ? `Comodidades destacadas: ${decisionAmenityLabel}.` : null,
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
  const guestCapacityReached = Boolean(maxGuestsNumber && guestCount >= maxGuestsNumber);
  const guestCapacityExceeded = Boolean(maxGuestsNumber && guestCount > maxGuestsNumber);
  const canRemoveAdult = adults > 1;
  const canRemoveChildren = childrenCount > 0;
  const canAddGuest = !guestCapacityReached;
  const canReserve = hasCompleteDates && nights > 0 && !guestCapacityExceeded;
  const guestCountLabel = formatGuestCountLabel(guestCount);
  const dateSelectionSummary = formatDateSelectionSummary(checkIn, checkOut);
  const nightsSummaryLabel = hasCompleteDates ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : 'Se definen al elegir fechas';
  const totalSummaryLabel = hasCompleteDates ? formatCurrency(total) : 'Elegí fechas para calcularlo';
  const mobileBookingSummary = hasCompleteDates
    ? `${nightsSummaryLabel} · ${guestCountLabel} · ${formatCurrency(total)}`
    : `${guestCountLabel} · Total al elegir fechas`;
  const bookingEntryCtaLabel = hasCompleteDates ? 'Cambiar fechas' : 'Ver disponibilidad';
  const currentBookingStepIndex = BOOKING_STEP_CONFIG.findIndex((step) => step.key === bookingStep);
  const currentBookingStep = BOOKING_STEP_CONFIG[currentBookingStepIndex] ?? BOOKING_STEP_CONFIG[0];
  const selectedModeContent = selectedRequestMode ? RESERVATION_MODE_CONTENT[selectedRequestMode] : null;
  const confirmationNotice: BookingConfirmationNotice | null = bookingSubmitNotice
    ?? (selectedModeContent
      ? {
          tone: selectedRequestMode === 'protected' ? 'info' : 'success',
          heading: selectedModeContent.confirmationHeading,
          description: selectedModeContent.confirmationDescription,
        }
      : null);
  const isAdvanceDisabled = bookingStep === 'dates'
    ? !canReserve
    : bookingStep === 'mode'
      ? !selectedRequestMode
      : false;

  const resetBookingSubmitState = () => {
    setBookingSubmitMode(null);
    setBookingSubmitNotice(null);
  };

  const resetBookingDraft = () => {
    setCheckIn('');
    setCheckOut('');
    setAdults(1);
    setChildrenCount(0);
    setBookingStep('dates');
    setSelectedRequestMode(null);
  };

  const clearBookingFeedback = () => {
    setBookingError(null);
    setBookingSubmitNotice(null);
  };

  useEffect(() => {
    const panel = bookingStepPanelRef.current;

    if (!panel || typeof panel.scrollIntoView !== 'function') {
      return;
    }

    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [bookingStep]);

  useEffect(() => {
    if (bookingStep !== 'dates' || !pendingDatePickerOpenRef.current) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const trigger = datePickerTriggerRef.current;

      if (!trigger) {
        return;
      }

      pendingDatePickerOpenRef.current = false;

      if (trigger.getAttribute('aria-expanded') !== 'true') {
        trigger.click();
      } else {
        trigger.focus();
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [bookingStep]);

  const handleAdultsChange = (nextValue: number) => {
    setAdults(Math.max(1, nextValue));
    clearBookingFeedback();
  };

  const handleChildrenChange = (nextValue: number) => {
    setChildrenCount(Math.max(0, nextValue));
    clearBookingFeedback();
  };

  const goToBookingStep = (nextStep: BookingStep) => {
    setBookingStep(nextStep);
  };

  const handleOpenBookingEntry = () => {
    clearBookingFeedback();
    resetBookingSubmitState();

    if (bookingStepPanelRef.current && typeof bookingStepPanelRef.current.scrollIntoView === 'function') {
      bookingStepPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (bookingStep !== 'dates') {
      pendingDatePickerOpenRef.current = true;
      goToBookingStep('dates');
      return;
    }

    window.requestAnimationFrame(() => {
      const trigger = datePickerTriggerRef.current;

      if (!trigger) {
        return;
      }

      if (trigger.getAttribute('aria-expanded') !== 'true') {
        trigger.click();
      } else {
        trigger.focus();
      }
    });
  };

  const handleAdvanceBookingStep = () => {
    resetBookingSubmitState();

    if (bookingStep === 'dates') {
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

      setBookingError(null);
      goToBookingStep('guests');
      return;
    }

    if (bookingStep === 'guests') {
      if (maxGuestsNumber && guestCount > maxGuestsNumber) {
        setBookingError({
          field: 'guests',
          message: `Máximo ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}. Ajustá la cantidad para seguir.`,
        });
        return;
      }

      setBookingError(null);
      goToBookingStep('mode');
      return;
    }

    if (bookingStep === 'mode') {
      if (!selectedRequestMode) {
        setBookingError({ field: 'mode', message: 'Elegí cómo querés avanzar para seguir.' });
        return;
      }

      setBookingError(null);
      goToBookingStep('confirm');
    }
  };

  const handleRetreatBookingStep = () => {
    if (bookingStep === 'confirm') {
      goToBookingStep('mode');
      return;
    }

    if (bookingStep === 'mode') {
      goToBookingStep('guests');
      return;
    }

    if (bookingStep === 'guests') {
      goToBookingStep('dates');
    }
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingSubmitMode) {
      return;
    }
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
    if (!selectedRequestMode) {
      setBookingStep('mode');
      setBookingError({ field: 'mode', message: 'Elegí cómo querés avanzar antes de enviar.' });
      return;
    }
    setBookingError(null);
    resetBookingSubmitState();

    if (selectedRequestMode === 'protected') {
      await handleStartProtectedRequest();
      return;
    }

    await handleStartDirectRequest();
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
    requestStatus: bookingStatus === 'confirmed' ? 'accepted' : 'pending',
    bookingId,
    bookingStatus,
  });

  const prepareConversationForRequest = async (requestContext: ReservationRequestContext, bookingId?: string) => {
    if (!property.id || !property.hostId) {
      throw new Error('No pudimos preparar el chat de esta propiedad. Probá de nuevo.');
    }

    const conversation = await startConversation(property.id, property.hostId, bookingId, {
      mode: requestContext.mode,
      requestStatus: requestContext.requestStatus,
      startDate: requestContext.startDate,
      endDate: requestContext.endDate,
      guests: requestContext.guests,
      totalPrice: requestContext.totalPrice,
    });

    try {
      await sendMessage(conversation.id, buildInitialRequestMessage(requestContext), property.hostId);
      return {
        conversationId: conversation.id,
        initialMessageSent: true,
        requestCreatedAt: conversation.requestCreatedAt ?? new Date().toISOString(),
      };
    } catch (error) {
      console.error('Request message error', error);
      return {
        conversationId: conversation.id,
        initialMessageSent: false,
        requestCreatedAt: conversation.requestCreatedAt ?? new Date().toISOString(),
      };
    }
  };

  const navigateToConversation = (conversationId: string, requestContext: ReservationRequestContext) => {
    navigate(`/chat/${conversationId}`, { state: { requestContext } });
  };

  const openLoginForRequest = (title: string, description: string) => {
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
      const { conversationId, initialMessageSent, requestCreatedAt } = await prepareConversationForRequest(requestContext);

      resetBookingSubmitState();
      navigateToConversation(conversationId, { ...requestContext, requestCreatedAt });
      showToast(
        'Chat abierto para acordar',
        initialMessageSent
          ? 'Ya le mandaste tu propuesta al anfitrión. Los próximos pasos siguen por chat y la seña se coordina por fuera de la app.'
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
        setBookingStep('guests');
      }

      if (result.error.field === 'startDate' || result.error.field === 'endDate') {
        setBookingError({ field: 'dates', message: result.error.message });
        setBookingStep('dates');
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
    resetBookingSubmitState();
    resetBookingDraft();
    setAvailabilityRefreshToken((currentValue) => currentValue + 1);

    try {
      const { conversationId, initialMessageSent, requestCreatedAt } = await prepareConversationForRequest(requestContext, result.data.booking.id);

      navigateToConversation(conversationId, { ...requestContext, requestCreatedAt });
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
    <div className="mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom)+11rem)] pt-6 md:px-6 lg:pb-16 lg:px-8">
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
                  <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent p-4 text-white sm:p-5">
                    <div className="max-w-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{propertyTypeLabel}</p>
                      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2.1rem]">{property.title}</h1>
                      <div className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-white/90">
                        <Icons.MapPin className="h-4 w-4" />
                        <span>{property.location}</span>
                      </div>
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

          <Card className="rounded-[32px] border-slate-200/80 bg-white p-5 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)] xl:items-start">
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Precio por noche</p>
                <div className="flex items-end gap-2">
                  <span className="text-[2.6rem] font-black tracking-tight text-slate-950 sm:text-[2.9rem]">{nightly ? formatCurrency(nightly) : '—'}</span>
                  <span className="pb-1 text-sm font-medium text-slate-500">/ noche</span>
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  {ratingValue > 0
                    ? `${ratingValue.toFixed(1)} · ${formatReviewCount(reviewCount)}`
                    : reviewCount > 0
                      ? formatReviewCount(reviewCount)
                      : 'Todavía sin reseñas publicadas.'}
                </p>
              </div>

              <div className="space-y-4">
                {essentialInfoItems.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {essentialInfoItems.map((item) => (
                      <EssentialInfoCard key={`${item.label}-${item.value}`} {...item} />
                    ))}
                  </div>
                ) : null}

                {decisionAmenityLabel ? (
                  <div className="rounded-[26px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.16)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Puntos clave</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{decisionAmenityLabel}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        </section>

        <aside className="mx-auto w-full max-w-2xl xl:max-w-none xl:self-start">
          <Card variant="elevated" className="rounded-[30px] border-slate-200/80 bg-white p-3.5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] sm:p-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
              <section role="region" aria-label="Contexto de la reserva" className="min-w-0 flex-1 space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reservá en 4 pasos</p>
                  <p className="text-base font-semibold tracking-tight text-slate-950 sm:text-xl">{property.title}</p>
                  <p className="text-sm font-medium text-slate-500">{nightly ? `${formatCurrency(nightly)} por noche` : 'Precio a confirmar'}</p>
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleOpenBookingEntry}
                      className="rounded-2xl shadow-[0_24px_46px_-28px_rgba(67,56,202,0.42)]"
                    >
                      <>
                        <Icons.Calendar className="h-4 w-4" />
                        {bookingEntryCtaLabel}
                      </>
                    </Button>
                    <p className="mt-2 text-xs font-medium text-slate-500">Elegí fechas para ver el total y avanzar</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1.5 font-semibold text-brand">
                      <Icons.Star className="h-4 w-4 fill-current" />
                      <span>{ratingValue > 0 ? ratingValue.toFixed(1) : 'Sin puntaje'}</span>
                    </span>
                    <span>{reviewCount > 0 ? formatReviewCount(reviewCount) : 'Sin reseñas todavía'}</span>
                  </div>
                </div>

                <div className="hidden rounded-[26px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.18)] sm:block">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <Icons.Home className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Lo que estás armando</p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-600">{dateSelectionSummary}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2.5 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-3.5 py-3 shadow-[0_18px_36px_-36px_rgba(15,23,42,0.18)]">
                      <span className="text-slate-500">Noches</span>
                      <span className="font-semibold text-slate-950">{nightsSummaryLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-3.5 py-3 shadow-[0_18px_36px_-36px_rgba(15,23,42,0.18)]">
                      <span className="text-slate-500">Huéspedes</span>
                      <span className="font-semibold text-slate-950">{guestCountLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-3.5 py-3 shadow-[0_18px_36px_-36px_rgba(15,23,42,0.18)]">
                      <span className="text-slate-500">Total estimado</span>
                      <span className="font-semibold text-slate-950">{totalSummaryLabel}</span>
                    </div>
                  </div>
                </div>
              </section>

              {user ? (
                <Button
                  onClick={toggleFav}
                  aria-pressed={isFav}
                  aria-label={isFav ? 'Quitar de guardados' : 'Guardar en guardados'}
                  variant="secondary"
                  size="icon"
                  className={cn(
                    'hidden sm:inline-flex',
                    isFav ? 'border-brand bg-brand text-white hover:border-brand hover:bg-brand-dark hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand/30 hover:text-brand',
                  )}
                >
                  <Icons.Heart className="h-5 w-5" />
                </Button>
              ) : null}
            </div>

            <form className="mt-5 space-y-5" onSubmit={handleReserve}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Progreso de la reserva">
                {BOOKING_STEP_CONFIG.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCurrent = index === currentBookingStepIndex;
                  const isCompleted = index < currentBookingStepIndex;

                  return (
                    <div
                      key={step.key}
                      className={cn(
                        'rounded-[22px] border px-2.5 py-2.5 text-left transition-colors sm:px-3 sm:py-3',
                        isCurrent
                          ? 'border-brand/30 bg-brand/8 shadow-[0_18px_36px_-30px_rgba(67,56,202,0.3)]'
                          : isCompleted
                            ? 'border-emerald-200 bg-emerald-50/80'
                            : 'border-slate-200 bg-slate-50/80',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full',
                            isCurrent
                              ? 'bg-brand text-white'
                              : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-500',
                          )}
                        >
                          <StepIcon className="h-4 w-4" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{index + 1}</span>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-900">{step.shortLabel}</p>
                    </div>
                  );
                })}
              </div>

              <div
                ref={bookingStepPanelRef}
                key={bookingStep}
                className="animate-[booking-step-in_220ms_var(--app-interaction-ease)] rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-4 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.22)] sm:p-5"
              >
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Paso {currentBookingStepIndex + 1} de 4</p>
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">{currentBookingStep.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{currentBookingStep.description}</p>
                </div>

                {bookingStep === 'dates' ? (
                  <div className="mt-5 space-y-4">
                    <DateRangePicker
                      checkIn={checkIn}
                      checkOut={checkOut}
                      setCheckIn={(value) => {
                        setCheckIn(value);
                        clearBookingFeedback();
                      }}
                      setCheckOut={(value) => {
                        setCheckOut(value);
                        clearBookingFeedback();
                      }}
                      propertyId={property.id}
                      availabilityRefreshToken={availabilityRefreshToken}
                      minDate={todayISO}
                      onChange={clearBookingFeedback}
                      monthsToShow={1}
                      triggerButtonRef={datePickerTriggerRef}
                    />

                    {bookingError?.field === 'dates' ? (
                      <p className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {bookingError.message}
                      </p>
                    ) : hasCompleteDates ? (
                      <div className="rounded-[20px] bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.18)]">
                        {nights} {nights === 1 ? 'noche seleccionada' : 'noches seleccionadas'} para {formatGuestSelection(adults, childrenCount)}.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {bookingStep === 'guests' ? (
                  <div className="mt-5 space-y-4">
                    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.14)]">
                      <div className="space-y-0 px-4 py-3.5">
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

                    <div className="rounded-[20px] bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.18)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Selección actual</p>
                      <p className="mt-1 text-base font-semibold text-slate-950">{formatGuestSelection(adults, childrenCount)}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {maxGuestsNumber
                          ? guestCapacityReached
                            ? `Máximo: ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
                            : `Hasta ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
                          : 'Elegí cuántas personas viajan.'}
                      </p>
                    </div>

                    {bookingError?.field === 'guests' ? (
                      <p className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {bookingError.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {bookingStep === 'mode' ? (
                  <div className="mt-5 space-y-4">
                    <div role="radiogroup" aria-label="Cómo querés avanzar" className="grid gap-3">
                      <ReservationModeCard
                        mode="direct"
                        selected={selectedRequestMode === 'direct'}
                        disabled={bookingSubmitMode !== null}
                        title="Acordar directamente"
                        description={RESERVATION_MODE_CONTENT.direct.description}
                        helper={RESERVATION_MODE_CONTENT.direct.helper}
                        onSelect={(mode) => {
                          setSelectedRequestMode(mode);
                          setBookingError(null);
                          setBookingSubmitNotice(null);
                        }}
                      />
                      <ReservationModeCard
                        mode="protected"
                        selected={selectedRequestMode === 'protected'}
                        disabled={bookingSubmitMode !== null}
                        title="Reserva protegida"
                        description={RESERVATION_MODE_CONTENT.protected.description}
                        helper={RESERVATION_MODE_CONTENT.protected.helper}
                        onSelect={(mode) => {
                          setSelectedRequestMode(mode);
                          setBookingError(null);
                          setBookingSubmitNotice(null);
                        }}
                      />
                    </div>

                    <div className="rounded-[20px] bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.18)]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Selección actual</p>
                      {selectedModeContent ? (
                        <>
                          <p className="mt-1 text-base font-semibold text-slate-950">{selectedModeContent.title}</p>
                          <p className="mt-1 leading-6">{selectedModeContent.helper}</p>
                        </>
                      ) : (
                        <>
                          <p className="mt-1 text-base font-semibold text-slate-950">Todavía no elegiste cómo avanzar</p>
                          <p className="mt-1 leading-6">Elegí una opción para habilitar Siguiente. Si querés hablar primero, seguís por chat. Si querés dejar todo asentado, mandás la solicitud protegida.</p>
                        </>
                      )}
                    </div>

                    {bookingError?.field === 'mode' ? (
                      <p className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {bookingError.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {bookingStep === 'confirm' && selectedModeContent ? (
                  <div className="mt-5 space-y-4">
                    <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.14)]">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 pb-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Resumen</p>
                          <p className="mt-1 text-base font-semibold text-slate-950">{property.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total estimado</p>
                          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{formatCurrency(total)}</p>
                        </div>
                      </div>

                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fechas</p>
                            <p className="mt-1 font-semibold text-slate-950">{formatRequestDate(checkIn)} al {formatRequestDate(checkOut)}</p>
                            <p className="mt-1">{nights} {nights === 1 ? 'noche' : 'noches'} · {formatCurrency(nightly)} por noche</p>
                          </div>
                          <button type="button" onClick={() => goToBookingStep('dates')} className="text-xs font-semibold text-brand transition-colors hover:text-brand-dark">
                            Editar
                          </button>
                        </div>

                        <div className="flex items-start justify-between gap-3 border-t border-slate-200/70 pt-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Huéspedes</p>
                            <p className="mt-1 font-semibold text-slate-950">{formatGuestSelection(adults, childrenCount)}</p>
                            {maxGuestsNumber ? <p className="mt-1">Capacidad máxima: {maxGuestsNumber} {maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.</p> : null}
                          </div>
                          <button type="button" onClick={() => goToBookingStep('guests')} className="text-xs font-semibold text-brand transition-colors hover:text-brand-dark">
                            Editar
                          </button>
                        </div>

                        <div className="flex items-start justify-between gap-3 border-t border-slate-200/70 pt-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Cómo avanzás</p>
                            <p className="mt-1 font-semibold text-slate-950">{selectedModeContent.title}</p>
                            <p className="mt-1">{selectedModeContent.helper}</p>
                          </div>
                          <button type="button" onClick={() => goToBookingStep('mode')} className="text-xs font-semibold text-brand transition-colors hover:text-brand-dark">
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>

                    {confirmationNotice ? (
                      <NoticeBanner
                        tone={confirmationNotice.tone}
                        heading={confirmationNotice.heading}
                        description={confirmationNotice.description}
                        className="shadow-none"
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="sm:min-w-[120px]">
                    {bookingStep !== 'dates' ? (
                      <Button type="button" variant="secondary" onClick={handleRetreatBookingStep} className="w-full rounded-2xl border-slate-200 bg-white sm:w-auto">
                        Volver
                      </Button>
                    ) : null}
                  </div>

                  {bookingStep !== 'confirm' ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={handleAdvanceBookingStep}
                      disabled={isAdvanceDisabled}
                      className="w-full rounded-2xl shadow-[0_24px_46px_-28px_rgba(67,56,202,0.42)] sm:w-auto sm:min-w-[160px]"
                    >
                      <>
                        <span>Siguiente</span>
                        <Icons.ArrowRight className="h-4 w-4" />
                      </>
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={!canReserve || bookingSubmitMode !== null}
                      aria-disabled={!canReserve || bookingSubmitMode !== null}
                      className="w-full rounded-2xl shadow-[0_24px_46px_-28px_rgba(67,56,202,0.42)] sm:w-auto sm:min-w-[220px]"
                      loading={bookingSubmitMode !== null}
                      loadingLabel={bookingSubmitMode === 'protected' ? 'Enviando solicitud...' : 'Abriendo chat...'}
                    >
                      <>
                        <Icons.ArrowRight className="h-4 w-4" />
                        Solicitar reserva
                      </>
                    </Button>
                  )}
                </div>

                <p className="text-center text-xs leading-5 text-slate-500">
                  Podés volver un paso atrás sin perder lo que ya elegiste.
                </p>
              </div>
            </form>
          </Card>
        </aside>

        <main className="space-y-8 xl:col-start-1 xl:row-start-2">
          <Card className="rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
            <div className="space-y-4">
              <SectionTitle
                eyebrow="Antes de decidir"
                heading="Lo importante de este aviso"
                description="Descripción completa y datos concretos para ver si este lugar te cierra."
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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
        <section
          role="region"
          aria-label="Resumen móvil de la reserva"
          className="pointer-events-auto mx-auto max-w-xl rounded-[24px] border border-slate-200/90 bg-white/96 px-4 py-3 shadow-[0_-18px_40px_-30px_rgba(15,23,42,0.28)] backdrop-blur"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs font-medium leading-5 text-slate-600">{mobileBookingSummary}</p>
              <p className="shrink-0 text-sm font-bold text-slate-950">{nightly ? `${formatCurrency(nightly)} / noche` : '—'}</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleOpenBookingEntry}
              className="rounded-2xl shadow-[0_24px_46px_-28px_rgba(67,56,202,0.42)]"
            >
              <>
                <Icons.Calendar className="h-4 w-4" />
                {bookingEntryCtaLabel}
              </>
            </Button>
          </div>
        </section>
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
      reviews={reviews}
    />
  );
};

export default PropertyDetail;
