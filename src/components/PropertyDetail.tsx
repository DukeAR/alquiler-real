import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/apiConfig';
import { getGuestDetailOnboardingTip } from '../lib/contextualOnboarding';
import {
  PROTECTED_DEPOSIT_LABEL,
  REQUEST_RESERVATION_LABEL,
  REQUEST_SENT_LABEL,
} from '../lib/productTerminology';
import { LoadingState } from './LoadingState';
import { Icons } from './Icons';
import DateRangePicker from './DateRangePicker';
import {
  getPropertyCardVerificationState,
  getPropertyVerificationDetails,
} from '../lib/propertyVerification';
import { ONSITE_VERIFICATION_LABEL } from '../lib/onsiteVerificationProtocol';
import { getHostResponseSignal } from '../lib/positiveIncentives';
import { showToast } from '../lib/toast';
import { cn, formatCurrency } from '../lib/utils';
import { trackFrontendFunnelEvent } from '../lib/funnelTracking';
import {
  trackVerificationPreferenceOpen,
  trackVerificationPreferenceSave,
} from '../lib/verificationPreference';
import { type Property as AppProperty, type ReservationRequestContext, type ReservationRequestMode } from '../types';
import { useFavorites } from '../hooks/useFavorites';
import { useBookings, type BookingCreatePayload, type BookingCreateResult } from '../hooks/useBookings';
import { useAuth } from '../hooks/useAuth';
import { startConversation } from '../services/geminiService';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { ContextualTip } from './ui/ContextualTip';
import { NoticeBanner } from './ui/NoticeBanner';
import { PresencialVerificationSealMark } from './ui/PresencialVerificationSealMark';
import { SectionTitle } from './ui/SectionTitle';
import { TrustSignalsInline, getTrustSignalsFromInteractionHistory, getTrustSignalsFromItems, type TrustSignal } from './ui/TrustSignalsInline';
import { PropertyVerificationPanel } from './verification/PropertyVerificationPanel';
import { VerificationInfoPanel } from './verification/VerificationInfoPanel';
import { ReportModal } from './ReportModal';
import BookingConfirmationModal from './BookingConfirmationModal';

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
  reviewerId?: string;
  reviewer_id?: string;
  userName?: string;
  rating: number;
  comment: string;
  type?: 'host_review' | 'guest_review';
  categories?: Array<{ key: string; label: string; score: number }>;
  categoryScores?: Array<{ key: string; label: string; score: number }>;
  createdAt?: string;
  agreementKept?: boolean;
  wouldInteractAgain?: boolean;
  hadIncident?: boolean;
  photosMatchReality?: boolean;
  date?: string;
};

type PropertyDetailFlowOverrides = {
  createBooking?: (payload: BookingCreatePayload) => Promise<BookingCreateResult>;
  prepareConversationForRequest?: (requestContext: ReservationRequestContext, bookingId?: string) => Promise<{
    conversationId: string;
    requestCreatedAt: string;
  }>;
  navigateToConversation?: (conversationId: string, requestContext: ReservationRequestContext) => void;
  openHostProfile?: (hostId: string) => void;
};

type BookingFieldKey = 'dates' | 'guests';

type BookingErrorState = {
  field: BookingFieldKey;
  message: string;
};

type BookingStep = 'dates' | 'guests' | 'confirm';

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

const formatGuestSelection = (adults: number, childrenCount: number) => {
  const totalGuests = adults + childrenCount;

  if (childrenCount === 0) {
    return `${totalGuests} ${totalGuests === 1 ? 'huésped' : 'huéspedes'}`;
  }

  return `${adults} ${adults === 1 ? 'adulto' : 'adultos'} · ${childrenCount} ${childrenCount === 1 ? 'menor' : 'menores'}`;
};

const formatGuestCountLabel = (guestCount: number) => formatCountLabel(guestCount, 'huésped', 'huéspedes');

const getIsMobileBookingLayout = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < 1024;
};

const getStickyBookingIntroScrollThreshold = () => {
  if (typeof window === 'undefined') {
    return 64;
  }

  return Math.max(64, Math.round(window.innerHeight * 0.08));
};

const getStickyBookingDeepScrollThreshold = () => {
  if (typeof window === 'undefined') {
    return 960;
  }

  return Math.max(960, Math.round(window.innerHeight * 1.15));
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

const formatMonthYear = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('es-AR', {
    month: 'short',
    year: 'numeric',
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

const BOOKING_STEP_CONFIG: BookingStepConfig[] = [
  {
    key: 'dates',
    title: 'Elegí las fechas',
    description: 'Marcá ingreso y salida para empezar.',
    shortLabel: 'Fechas',
    icon: Icons.Calendar,
  },
  {
    key: 'guests',
    title: 'Definí quiénes viajan',
    description: 'Ajustá cuántas personas viajan.',
    shortLabel: 'Huéspedes',
    icon: Icons.Users,
  },
  {
    key: 'confirm',
    title: 'Revisá antes de enviarla',
    description: 'Revisá el resumen y elegí si querés seguir con operación libre o con seña protegida.',
    shortLabel: 'Resumen',
    icon: Icons.CheckCircle2,
  },
] as const;

const BOOKING_STEP_COUNT = BOOKING_STEP_CONFIG.length;

const REQUEST_CONFIRMATION_NOTICE: BookingConfirmationNotice = {
  tone: 'info',
  heading: 'La modalidad se elige en el siguiente paso',
  description: 'Operación libre abre el chat sin bloquear fechas. Seña protegida deja la reserva lista para una seña retenida hasta check-in, aunque por ahora no procesamos pagos dentro de la app.',
};

type DetailVerificationVisibleLevel = 'none' | 'identity' | 'presencial';

type DetailVerificationChecklistItem = {
  key: 'existence' | 'listingMatch' | 'location' | 'access' | 'identity';
  confirmed: boolean;
  label: string;
};

const getHeroVerificationCopy = (publicLevel: DetailVerificationVisibleLevel) => {
  if (publicLevel === 'presencial') {
    return {
      title: ONSITE_VERIFICATION_LABEL,
      description: 'Existencia física, coincidencia general, ubicación real, acceso e identidad básica confirmados durante una visita',
    };
  }

  if (publicLevel === 'identity') {
    return {
      title: 'Identidad verificada',
      description: 'Anfitrión confirmado',
    };
  }

  return {
    title: 'Sin verificación',
    description: 'Datos no confirmados',
  };
};

const getDetailVerificationChecklist = (publicLevel: DetailVerificationVisibleLevel): DetailVerificationChecklistItem[] => {
  if (publicLevel === 'presencial') {
    return [
      { key: 'existence', confirmed: true, label: 'Existencia física confirmada' },
      { key: 'listingMatch', confirmed: true, label: 'Coincidencia general con la publicación' },
      { key: 'location', confirmed: true, label: 'Ubicación real confirmada' },
      { key: 'access', confirmed: true, label: 'Acceso real del anfitrión' },
      { key: 'identity', confirmed: true, label: 'Identidad del anfitrión' },
    ];
  }

  if (publicLevel === 'identity') {
    return [
      { key: 'existence', confirmed: false, label: 'Existencia física no confirmada' },
      { key: 'listingMatch', confirmed: false, label: 'Coincidencia general no validada' },
      { key: 'location', confirmed: false, label: 'Ubicación real no verificada' },
      { key: 'access', confirmed: false, label: 'Acceso real no verificado' },
      { key: 'identity', confirmed: true, label: 'Identidad del anfitrión' },
    ];
  }

  return [
    { key: 'existence', confirmed: false, label: 'Existencia física no confirmada' },
    { key: 'listingMatch', confirmed: false, label: 'Coincidencia general no confirmada' },
    { key: 'location', confirmed: false, label: 'Ubicación real no confirmada' },
    { key: 'access', confirmed: false, label: 'Acceso real no confirmado' },
    { key: 'identity', confirmed: false, label: 'Identidad no confirmada' },
  ];
};

const getBookingEntryCtaLabel = (_publicLevel: DetailVerificationVisibleLevel) => {
  return REQUEST_RESERVATION_LABEL;
};

const getBookingCtaSupportCopy = (publicLevel: DetailVerificationVisibleLevel) => {
  if (publicLevel === 'presencial') {
    return 'Esta propiedad está verificada presencialmente.';
  }

  if (publicLevel === 'identity') {
    return 'La identidad del anfitrión fue confirmada';
  }

  return null;
};

const getHostName = (property: PropertyDetailData) => property.host?.name || property.hostName || 'Anfitrión';

const getPropertyTypeLabel = (property: PropertyDetailData) => {
  const explicitType = property.propertyType?.toLowerCase();

  if (explicitType?.includes('house') || explicitType?.includes('casa')) return 'Casa';
  if (explicitType?.includes('apartment') || explicitType?.includes('depto') || explicitType?.includes('depart')) return 'Departamento';
  if (explicitType?.includes('room') || explicitType?.includes('habitacion') || explicitType?.includes('habitación')) return 'Habitación';
  if (explicitType?.includes('cabin') || explicitType?.includes('caba')) return 'Cabaña';

  const title = property.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (title.includes('casa')) return 'Casa';
  if (title.includes('duplex') || title.includes('chalet') || /(^|\s)ph($|\s)/.test(title)) return 'Casa';
  if (title.includes('monoambiente')) return 'Departamento';
  if (title.includes('depto') || title.includes('depart')) return 'Departamento';
  if (title.includes('habitacion') || title.includes('habitación') || title.includes('cuarto')) return 'Habitación';
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

      <div className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-2 py-1.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.12)] sm:px-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDecrement}
          className="h-10 w-10 rounded-full p-0 font-semibold sm:h-9 sm:w-9"
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
          className="h-10 w-10 rounded-full p-0 font-semibold sm:h-9 sm:w-9"
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
  reviews?: PropertyReviewItem[];
  onRefresh?: () => Promise<void> | void;
  onOpenIdentityVerification?: () => void;
  flowOverrides?: PropertyDetailFlowOverrides;
}> = ({ property, images, mainIndex, setMainIndex, isFav, toggleFav, reviews = [], onRefresh, onOpenIdentityVerification, flowOverrides }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createBooking: createBookingFromHook } = useBookings({ autoLoad: false });
  const createBooking = flowOverrides?.createBooking ?? createBookingFromHook;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const detailMotionRootRef = useRef<HTMLDivElement | null>(null);
  const heroSceneRef = useRef<HTMLDivElement | null>(null);
  const primaryBookingCtaRef = useRef<HTMLButtonElement | null>(null);

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
  const [bookingFlowOpen, setBookingFlowOpen] = useState(false);
  const [bookingDecisionOpen, setBookingDecisionOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<BookingStep>('dates');
  const [bookingError, setBookingError] = useState<BookingErrorState | null>(null);
  const [bookingSubmitMode, setBookingSubmitMode] = useState<ReservationRequestMode | null>(null);
  const [bookingSubmitNotice, setBookingSubmitNotice] = useState<BookingConfirmationNotice | null>(null);
  const [availabilityRefreshToken, setAvailabilityRefreshToken] = useState(0);
  const [isMobileBookingLayout, setIsMobileBookingLayout] = useState(getIsMobileBookingLayout);
  const [isPrimaryBookingCtaVisible, setIsPrimaryBookingCtaVisible] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [hasScrolledPastStickyIntro, setHasScrolledPastStickyIntro] = useState(false);
  const [hasScrolledPastStickyDeepThreshold, setHasScrolledPastStickyDeepThreshold] = useState(false);
  const [hasEngagedWithDecisionContent, setHasEngagedWithDecisionContent] = useState(false);
  const bookingStepPanelRef = useRef<HTMLDivElement | null>(null);
  const datePickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingDatePickerOpenRef = useRef(false);

  const reviewCount = Math.max(Number(property.reviewsCount) || 0, reviews.length);
  const nightly = getPositiveNumber(property?.price) ?? 0;
  const maxGuestsNumber = getPositiveNumber(property.maxGuests);
  const bedsCount = getPositiveNumber(property.beds);
  const bedroomsCount = getPositiveNumber(property.bedrooms);
  const bathroomsCount = getPositiveNumber(property.bathrooms);
  const guestCapacity = formatGuestCapacity(maxGuestsNumber);
  const hostName = getHostName(property);
  const propertyTypeLabel = getPropertyTypeLabel(property);
  const hasMultipleImages = images.length > 1;
  const photoCountLabel = hasMultipleImages ? `${mainIndex + 1} / ${images.length} fotos` : '1 foto';
  const lightboxPhotoCountLabel = hasMultipleImages ? `${mainIndex + 1} / ${images.length}` : '1 foto';
  const decisionAmenityLabel = getDecisionAmenityLabel(property.amenities);
  const roomSummary = [
    bedsCount ? formatCountLabel(bedsCount, 'cama', 'camas') : null,
    bedroomsCount ? formatCountLabel(bedroomsCount, 'dormitorio', 'dormitorios') : null,
    bathroomsCount ? formatCountLabel(bathroomsCount, 'baño', 'baños') : null,
  ].filter((value): value is string => Boolean(value));
  const verificationDetails = getPropertyVerificationDetails(property);
  const detailVerificationState = getPropertyCardVerificationState(property);
  const heroVerificationCopy = getHeroVerificationCopy(detailVerificationState.publicLevel);
  const detailVerificationChecklist = getDetailVerificationChecklist(detailVerificationState.publicLevel);
  const isPresencialDetail = detailVerificationState.publicLevel === 'presencial';
  const isIdentityDetail = detailVerificationState.publicLevel === 'identity';
  const hostResponseSignal = getHostResponseSignal(property.hostInteractionHistory);
  const detailOnboardingTip = getGuestDetailOnboardingTip(detailVerificationState.publicLevel);
  const completedReservationsLabel = property.hostInteractionHistory?.completedReservationsCount
    ? `${property.hostInteractionHistory.completedReservationsCount} ${property.hostInteractionHistory.completedReservationsCount === 1 ? 'reserva cerrada' : 'reservas cerradas'}`
    : null;
  const bookingEntryCtaLabel = getBookingEntryCtaLabel(detailVerificationState.publicLevel);
  const bookingCtaSupportCopy = getBookingCtaSupportCopy(detailVerificationState.publicLevel);
  const visibleReviews = reviews.slice(0, 3);
  const reviewAverage = reviewCount > 0
    ? ((Number(property.rating) || 0) > 0 ? Number(property.rating) : reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / Math.max(reviews.length, 1))
    : 0;
  const hostTrustSignals = (() => {
    const mergedSignals: TrustSignal[] = [];
    const seenLabels = new Set<string>();
    const pushSignals = (nextSignals: TrustSignal[]) => {
      nextSignals.forEach((signal) => {
        if (mergedSignals.length >= 3 || seenLabels.has(signal.label)) {
          return;
        }

        mergedSignals.push(signal);
        seenLabels.add(signal.label);
      });
    };

    pushSignals(getTrustSignalsFromItems(Array.isArray(property.hostTrust?.items) ? property.hostTrust.items : [], { limit: 3, tone: 'brand' }));
    const directHostSignals: TrustSignal[] = [];

    if (property.identityValidated) {
      directHostSignals.push({ key: 'host-identity', label: 'Identidad verificada', tone: 'brand' });
    }

    if (completedReservationsLabel) {
      directHostSignals.push({ key: 'host-history', label: completedReservationsLabel, tone: 'brand' });
    }

    if (hostResponseSignal?.label) {
      directHostSignals.push({ key: 'host-response', label: hostResponseSignal.label, tone: 'brand' });
    }

    pushSignals(directHostSignals);
    pushSignals(getTrustSignalsFromInteractionHistory(property.hostInteractionHistory?.publicSignals ?? [], { limit: 3, tone: 'brand' }));

    return mergedSignals.slice(0, 3);
  })();
  const decoratedHostTrustSignals = hostTrustSignals.map((signal, index) => ({
    ...signal,
    tone: index === 0 ? 'success' as const : 'brand' as const,
  }));

  const todayISO = formatLocalIso(new Date());

  const guestCount = adults + childrenCount;
  const nights = (checkIn && checkOut) ? Math.max(0, Math.round((parseLocalIso(checkOut).getTime() - parseLocalIso(checkIn).getTime()) / (1000*60*60*24))) : 0;
  const total = nights * nightly;
  const decisionHighlights = [
    guestCapacity ? `Puede alojar hasta ${formatCountLabel(maxGuestsNumber ?? 0, 'huésped', 'huéspedes')}.` : null,
    roomSummary.length > 0 ? `Tiene ${roomSummary.join(' · ')}.` : null,
    decisionAmenityLabel ? `Comodidades clave: ${decisionAmenityLabel}.` : null,
  ].filter(Boolean) as string[];
  const hasCompleteDates = Boolean(checkIn && checkOut);
  const hasSelectedDates = Boolean(checkIn || checkOut);
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
  const stickyBookingBrowseCtaLabel = 'Ver disponibilidad';
  const stickyBookingCoordinationCtaLabel = verificationDetails.isFullyVerified
    ? 'Coordinar visita o fechas'
    : 'Coordinar fechas';
  const stickyBookingPriceLabel = nightly ? `${formatCurrency(nightly)} / noche` : '—';
  const shouldShowStickyBookingBar = !bookingFlowOpen && !isPrimaryBookingCtaVisible;
  const hasPassedInitialStickyMoment = isMobileBookingLayout
    ? hasScrolledPastStickyIntro
    : !isPrimaryBookingCtaVisible;
  const shouldUseAdvancedStickyBookingCta = hasPassedInitialStickyMoment
    && (hasScrolledPastStickyDeepThreshold || hasEngagedWithDecisionContent);
  const stickyBookingCtaLabel = !hasPassedInitialStickyMoment
    ? bookingEntryCtaLabel
    : shouldUseAdvancedStickyBookingCta
      ? stickyBookingCoordinationCtaLabel
      : stickyBookingBrowseCtaLabel;
  const mobilePrimaryActionLabel = bookingStep === 'dates'
    ? hasCompleteDates
      ? 'Seguir con huéspedes'
      : hasSelectedDates
        ? 'Completar fechas'
        : 'Elegir fechas'
    : bookingStep === 'guests'
      ? 'Seguir al resumen'
      : bookingStep === 'confirm'
        ? 'Elegir modalidad'
        : 'Continuar';
  const mobilePrimaryActionDisabled = bookingStep === 'confirm'
    ? !canReserve || bookingSubmitMode !== null
      : false;
  const mobileStepStatusLabel = bookingStep === 'dates'
    ? (hasCompleteDates ? mobileBookingSummary : null)
    : bookingStep === 'guests'
      ? dateSelectionSummary
      : mobileBookingSummary;
  const currentBookingStepIndex = BOOKING_STEP_CONFIG.findIndex((step) => step.key === bookingStep);
  const currentBookingStep = BOOKING_STEP_CONFIG[currentBookingStepIndex] ?? BOOKING_STEP_CONFIG[0];
  const bookingStepProgressLabel = `Paso ${currentBookingStepIndex + 1} de ${BOOKING_STEP_COUNT}`;
  const confirmationNotice: BookingConfirmationNotice | null = bookingSubmitNotice
    ?? REQUEST_CONFIRMATION_NOTICE;
  const isAdvanceDisabled = bookingStep === 'dates'
    ? !canReserve
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
    setBookingDecisionOpen(false);
    setBookingFlowOpen(false);
    setBookingStep('dates');
  };

  const clearBookingFeedback = () => {
    setBookingError(null);
    setBookingSubmitNotice(null);
  };

  const handleCloseBookingEntry = () => {
    if (bookingSubmitMode !== null) {
      return;
    }

    if (bookingDecisionOpen) {
      setBookingDecisionOpen(false);
      return;
    }

    pendingDatePickerOpenRef.current = false;
    clearBookingFeedback();
    resetBookingSubmitState();
    setBookingFlowOpen(false);
  };

  useEffect(() => {
    const syncLayout = () => {
      setIsMobileBookingLayout(getIsMobileBookingLayout());
    };

    syncLayout();
    window.addEventListener('resize', syncLayout);

    return () => {
      window.removeEventListener('resize', syncLayout);
    };
  }, []);

  useEffect(() => {
    const syncStickyBookingContext = () => {
      const currentScroll = window.scrollY || window.pageYOffset || 0;

      setHasScrolledPastStickyIntro(currentScroll > getStickyBookingIntroScrollThreshold());
      setHasScrolledPastStickyDeepThreshold(currentScroll > getStickyBookingDeepScrollThreshold());
    };

    setHasEngagedWithDecisionContent(false);
    syncStickyBookingContext();

    window.addEventListener('scroll', syncStickyBookingContext, { passive: true });
    window.addEventListener('resize', syncStickyBookingContext);

    return () => {
      window.removeEventListener('scroll', syncStickyBookingContext);
      window.removeEventListener('resize', syncStickyBookingContext);
    };
  }, [property.id]);

  useEffect(() => {
    const primaryBookingCta = primaryBookingCtaRef.current;

    if (!primaryBookingCta) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsPrimaryBookingCtaVisible(!isMobileBookingLayout);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;

      if (!entry) {
        return;
      }

      setIsPrimaryBookingCtaVisible(entry.isIntersecting);
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -8% 0px',
    });

    observer.observe(primaryBookingCta);

    return () => {
      observer.disconnect();
    };
  }, [isMobileBookingLayout, property.id]);

  useEffect(() => {
    if (!bookingFlowOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      bookingStepPanelRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [bookingFlowOpen, bookingStep]);

  useEffect(() => {
    if (!bookingFlowOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && bookingSubmitMode === null) {
        event.preventDefault();
        handleCloseBookingEntry();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [bookingDecisionOpen, bookingFlowOpen, bookingSubmitMode]);

  useEffect(() => {
    if (!bookingFlowOpen || bookingStep !== 'dates' || !pendingDatePickerOpenRef.current) {
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
  }, [bookingFlowOpen, bookingStep]);

  const handleDecisionContentEngagement = () => {
    setHasEngagedWithDecisionContent(true);
  };

  const handleAdultsChange = (nextValue: number) => {
    setAdults(Math.max(1, nextValue));
    clearBookingFeedback();
  };

  const handleChildrenChange = (nextValue: number) => {
    setChildrenCount(Math.max(0, nextValue));
    clearBookingFeedback();
  };

  const goToBookingStep = (nextStep: BookingStep) => {
    setBookingDecisionOpen(false);
    setBookingStep(nextStep);
  };

  const handleOpenBookingEntry = () => {
    if (property.id && property.hostId) {
      trackFrontendFunnelEvent('availability_cta_clicked', {
        propertyId: property.id,
        hostId: property.hostId,
        viewerRole: user?.id === property.hostId ? 'host' : 'guest',
      });
    }

    clearBookingFeedback();
    resetBookingSubmitState();
    pendingDatePickerOpenRef.current = true;

    if (!bookingFlowOpen) {
      setBookingFlowOpen(true);
    }

    if (bookingStep !== 'dates') {
      goToBookingStep('dates');
      return;
    }

    if (!bookingFlowOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
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
      goToBookingStep('confirm');
    }
  };

  const handleRetreatBookingStep = () => {
    if (bookingStep === 'confirm') {
      goToBookingStep('guests');
      return;
    }

    if (bookingStep === 'guests') {
      goToBookingStep('dates');
    }
  };

  const validateReservationDraft = () => {
    if (!checkIn && !checkOut) {
      setBookingError({ field: 'dates', message: 'Elegí ingreso y salida para seguir.' });
      return false;
    }
    if (checkIn && !checkOut) {
      setBookingError({ field: 'dates', message: 'Elegí la salida para seguir.' });
      return false;
    }
    if (!checkIn) {
      setBookingError({ field: 'dates', message: 'Elegí el ingreso para seguir.' });
      return false;
    }
    if (parseLocalIso(checkOut) <= parseLocalIso(checkIn)) {
      setBookingError({ field: 'dates', message: 'La salida tiene que ser después del ingreso.' });
      return false;
    }
    if (parseLocalIso(checkIn) < parseLocalIso(todayISO)) {
      setBookingError({ field: 'dates', message: 'El ingreso no puede ser antes de hoy.' });
      return false;
    }
    if (maxGuestsNumber && guestCount > maxGuestsNumber) {
      setBookingError({
        field: 'guests',
        message: `Máximo ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}. Ajustá la cantidad para seguir.`,
      });
      return false;
    }

    setBookingError(null);
    resetBookingSubmitState();
    return true;
  };

  const submitReservationRequest = () => {
    if (bookingSubmitMode || !validateReservationDraft()) {
      return;
    }

    setBookingDecisionOpen(true);
  };

  const handleMobilePrimaryAction = async () => {
    if (bookingStep === 'dates') {
      if (hasCompleteDates) {
        handleAdvanceBookingStep();
        return;
      }

      handleOpenBookingEntry();
      return;
    }

    if (bookingStep === 'confirm') {
      submitReservationRequest();
      return;
    }

    handleAdvanceBookingStep();
  };

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    submitReservationRequest();
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
    propertyVerificationScore: verificationDetails.score,
    propertyVerificationLabel: verificationDetails.label,
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

    return {
      conversationId: conversation.id,
      requestCreatedAt: conversation.requestCreatedAt ?? new Date().toISOString(),
    };
  };

  const navigateToConversation = (conversationId: string, requestContext: ReservationRequestContext) => {
    navigate(`/chat/${conversationId}`, { state: { requestContext } });
  };

  const prepareConversation = flowOverrides?.prepareConversationForRequest ?? prepareConversationForRequest;
  const openConversation = flowOverrides?.navigateToConversation ?? navigateToConversation;
  const handleOpenHostProfile = () => {
    if (!property.hostId) {
      return;
    }

    if (flowOverrides?.openHostProfile) {
      flowOverrides.openHostProfile(property.hostId);
      return;
    }

    navigate(`/host/${property.hostId}`);
  };

  const openLoginForRequest = (title: string, description: string) => {
    resetBookingSubmitState();
    showToast(title, description, 'warning');
    import('../lib/modal').then((m) => m.showLoginModal());
  };

  const handleStartDirectRequest = async () => {
    if (!property.id || !property.hostId) {
      setBookingSubmitNotice({
        tone: 'error',
        heading: 'No pudimos abrir la operación libre',
        description: 'Falta contexto de la propiedad para abrir este chat. Probá recargando la página.',
      });
      return;
    }

    if (!user) {
      openLoginForRequest('Necesitás iniciar sesión', 'Iniciá sesión para abrir el chat y coordinar esta operación libre.');
      return;
    }

    setBookingSubmitMode('direct');
    setBookingSubmitNotice(null);

    const requestContext = buildReservationRequestContext('direct');

    try {
      const { conversationId, requestCreatedAt } = await prepareConversation(requestContext);

      resetBookingSubmitState();
      setBookingDecisionOpen(false);
      resetBookingDraft();
      openConversation(conversationId, { ...requestContext, requestCreatedAt });
      showToast(
        REQUEST_SENT_LABEL,
        'Abrimos el chat para que coordinen por acá. La app no retiene dinero ni interviene en pagos externos en esta modalidad.',
        'success',
      );
    } catch (error) {
      console.error('Direct request conversation error', error);
      setBookingSubmitMode(null);
      setBookingSubmitNotice({
        tone: 'error',
        heading: 'No pudimos abrir el chat',
        description: 'Intentá de nuevo. Si el problema sigue, podés reabrir este flujo y elegir la modalidad otra vez.',
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
      openLoginForRequest('Necesitás iniciar sesión', 'Iniciá sesión para mandar la solicitud y seguir con la reserva.');
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
        openLoginForRequest('Necesitás iniciar sesión', 'Iniciá sesión para mandar la solicitud y seguir con la reserva.');
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
    setBookingDecisionOpen(false);
    resetBookingDraft();
    setAvailabilityRefreshToken((currentValue) => currentValue + 1);

    try {
      const { conversationId, requestCreatedAt } = await prepareConversation(requestContext, result.data.booking.id);

      openConversation(conversationId, { ...requestContext, requestCreatedAt });
      showToast(
        REQUEST_SENT_LABEL,
        `La solicitud quedó registrada por ${formatCurrency(bookedTotal)} y la reserva ya quedó marcada con ${PROTECTED_DEPOSIT_LABEL}. Abrimos el chat para seguir desde ahí.`,
        'success',
      );
    } catch (error) {
      console.error('Protected request conversation error', error);
      showToast(
        'Solicitud enviada',
        'La solicitud quedó pendiente. No pudimos abrir el chat ahora, pero la vas a ver en Mis reservas.',
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

  useEffect(() => {
    const root = detailMotionRootRef.current;

    if (!root) {
      return;
    }

    const motionBlocks = Array.from(root.querySelectorAll<HTMLElement>('[data-motion-block]'));

    if (motionBlocks.length === 0) {
      return;
    }

    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      motionBlocks.forEach((block) => {
        block.setAttribute('data-motion-visible', 'true');
      });

      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        (entry.target as HTMLElement).setAttribute('data-motion-visible', 'true');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.16,
      rootMargin: '0px 0px -8% 0px',
    });

    motionBlocks.forEach((block) => {
      observer.observe(block);
    });

    return () => {
      observer.disconnect();
    };
  }, [property.id, property.isOwnedByViewer, reviewCount]);

  useEffect(() => {
    const heroScene = heroSceneRef.current;

    if (!heroScene) {
      return;
    }

    const prefersReducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      heroScene.style.setProperty('--property-hero-parallax-y', '0px');
      heroScene.style.setProperty('--property-hero-overlay-opacity', '1');
      return;
    }

    let frameId = 0;

    const updateParallax = () => {
      const rect = heroScene.getBoundingClientRect();
      const heroHeight = Math.max(rect.height, 1);
      const scrolledDistance = Math.min(Math.max(-rect.top, 0), heroHeight);
      const progress = Math.min(scrolledDistance / heroHeight, 1);
      const parallaxOffset = Math.min(36, scrolledDistance * 0.2);
      const overlayOpacity = Math.max(0.84, 1 - progress * 0.14);

      heroScene.style.setProperty('--property-hero-parallax-y', `${parallaxOffset.toFixed(2)}px`);
      heroScene.style.setProperty('--property-hero-overlay-opacity', overlayOpacity.toFixed(3));
    };

    const scheduleParallaxUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateParallax);
    };

    scheduleParallaxUpdate();
    window.addEventListener('scroll', scheduleParallaxUpdate, { passive: true });
    window.addEventListener('resize', scheduleParallaxUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', scheduleParallaxUpdate);
      window.removeEventListener('resize', scheduleParallaxUpdate);
    };
  }, [property.id, images.length]);

  return (
    <div ref={detailMotionRootRef} className="app-page pb-[calc(env(safe-area-inset-bottom)+9.25rem)] lg:pb-16">
      <div className="space-y-5 md:space-y-8">
        <section data-property-detail-hero className="space-y-5 md:space-y-8">
          <Card padding="none" variant="elevated" className="overflow-hidden rounded-[24px] border-slate-200/80 bg-white shadow-[0_28px_64px_-46px_rgba(15,23,42,0.28)] sm:rounded-[28px] lg:rounded-[32px] lg:shadow-[0_34px_80px_-50px_rgba(15,23,42,0.35)]">
            <div className="min-w-0 overflow-hidden rounded-[24px] sm:rounded-[28px] lg:rounded-[32px]">
              <div ref={heroSceneRef} className="property-hero-scene group relative isolate overflow-hidden bg-slate-950">
                <div
                  className="property-hero-image-reveal aspect-[4/5] min-h-[22.5rem] sm:min-h-0 sm:aspect-[16/11] lg:aspect-[16/10]"
                  onTouchStart={onTouchStart}
                  onTouchEnd={onTouchEnd}
                >
                  <img
                    src={images[mainIndex] || FALLBACK}
                    alt={`${property.title} — imagen ${mainIndex + 1}`}
                    className="property-hero-parallax-image h-full w-full cursor-zoom-in object-cover"
                    onClick={openLightbox}
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="property-hero-overlay pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.14)_34%,rgba(0,0,0,0.3)_62%,rgba(0,0,0,0.55)_100%)]" />

                <div className="property-hero-copy-reveal absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-5 lg:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-col items-start gap-2.5 pt-9 sm:gap-4 sm:pt-12 lg:pt-14">
                      <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/28 px-3 py-1.75 text-[0.82rem] font-semibold text-white backdrop-blur-[10px] shadow-[0_18px_28px_-18px_rgba(15,23,42,0.52)] transition-[background-color,border-color,color,transform] duration-200 ease-out hover:border-white/28 hover:bg-black/38 hover:text-white focus-visible:outline-none focus-visible:shadow-[var(--app-focus-ring)] sm:px-3.5 sm:py-2 sm:text-sm md:hover:-translate-y-[1px]"
                      >
                        <Icons.ArrowLeft className="h-4 w-4" />
                        <span>Volver</span>
                      </button>

                      <div className="flex flex-wrap items-center gap-2 text-white">
                        <span className="inline-flex items-center rounded-full border border-white/18 bg-black/28 px-3 py-1.25 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/90 backdrop-blur-[10px] shadow-[0_16px_24px_-18px_rgba(15,23,42,0.42)] sm:px-3.5 sm:py-1.5 sm:text-[10px] sm:tracking-[0.16em]">
                          {propertyTypeLabel}
                        </span>
                        {hasMultipleImages ? (
                          <Badge variant="neutral" size="md" className="border-white/18 bg-black/28 text-white/88 backdrop-blur-[10px] shadow-[0_16px_24px_-18px_rgba(15,23,42,0.42)]">
                            {photoCountLabel}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 items-center">
                    <div className="max-w-full text-white sm:max-w-[34rem] lg:max-w-[38rem]">
                      <h1 className="max-w-full text-balance text-[clamp(1.18rem,5.1vw,1.46rem)] font-semibold leading-[1.06] tracking-[-0.035em] text-white line-clamp-2 sm:max-w-[30rem] sm:text-[2.32rem] sm:leading-[1.08] lg:max-w-[35rem] lg:text-[2.72rem] lg:leading-[1.08]">
                        {property.title}
                      </h1>
                      <div className="mt-2 inline-flex max-w-full items-center gap-2 text-[0.76rem] font-medium tracking-[-0.01em] text-white/90 sm:mt-3 sm:text-[0.9rem] sm:text-white/92">
                        <Icons.MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{property.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2.5 sm:right-5 sm:top-5 sm:gap-3 lg:right-6 lg:top-6">
                    {user ? (
                      <Button
                        onClick={toggleFav}
                        aria-pressed={isFav}
                        aria-label={isFav ? 'Quitar de guardados' : 'Guardar en guardados'}
                        variant="secondary"
                        size="icon"
                        className={cn(
                          'h-9 w-9 border-white/18 bg-black/28 text-white backdrop-blur-[10px] shadow-[0_16px_28px_-18px_rgba(15,23,42,0.48)] hover:border-white/26 hover:bg-black/42 hover:text-white sm:h-10 sm:w-10',
                          isFav && 'border-brand/85 bg-brand/92 text-white shadow-[0_18px_30px_-18px_rgba(67,56,202,0.6)] hover:border-brand hover:bg-brand-dark hover:text-white',
                        )}
                      >
                        <Icons.Heart className="h-5 w-5" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-end gap-4">
                    <button
                      type="button"
                      onClick={openLightbox}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/14 bg-black/20 px-2.75 py-1.5 text-[0.72rem] font-medium text-white/82 backdrop-blur-[10px] shadow-[0_14px_24px_-22px_rgba(15,23,42,0.42)] transition-[background-color,border-color,color,transform] duration-200 ease-out hover:border-white/22 hover:bg-black/28 hover:text-white sm:gap-2 sm:px-4 sm:py-2 sm:text-[0.82rem] md:hover:-translate-y-[1px]"
                    >
                      <Icons.Camera className="h-4 w-4" />
                      {hasMultipleImages ? (
                        <>
                          <span className="hidden sm:inline">Ver todas las fotos</span>
                          <span className="sm:hidden">Expandir</span>
                        </>
                      ) : (
                        <span>Ver foto</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/70 bg-white px-3 py-3 sm:px-6 sm:py-5">
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar sm:gap-3" role="list" aria-label="Galería de imágenes">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setMainIndex(i)}
                      onKeyDown={(e) => onKeyDownThumb(e, i)}
                      aria-label={`Ver imagen ${i + 1}`}
                      className={`overflow-hidden rounded-[16px] border transition-all duration-200 sm:rounded-[20px] ${i === mainIndex ? 'border-brand shadow-[0_22px_48px_-34px_rgba(14,116,144,0.7)] ring-2 ring-brand/20' : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_20px_42px_-34px_rgba(15,23,42,0.2)]'}`}
                      role="listitem"
                    >
                      <img
                        src={src || FALLBACK}
                        alt={`${property.title} thumbnail ${i + 1}`}
                        className="h-20 w-28 object-cover sm:h-24 sm:w-36 lg:h-24 lg:w-40"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section
          role="region"
          aria-label="Contexto de la reserva"
          data-motion-block
          className="app-card-hover app-motion-block rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.2)] sm:rounded-[24px] sm:p-6 lg:p-8 lg:shadow-[0_22px_58px_-46px_rgba(15,23,42,0.22)]"
        >
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
            <div className="space-y-4 sm:space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-2 text-slate-950">
                  <span className="text-[2.35rem] font-black leading-none tracking-[-0.07em] sm:text-[3rem] lg:text-[3.35rem]">
                    {nightly ? formatCurrency(nightly) : '—'}
                  </span>
                  <span className="pb-1 text-[0.92rem] font-semibold text-slate-500 sm:text-base">/ noche</span>
                </div>

                <div
                  className={cn(
                    'inline-flex max-w-full items-start gap-2 rounded-[18px] border px-3.5 py-2.5 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.16)] sm:gap-2.5 sm:rounded-[20px] sm:px-4 sm:py-3',
                    isPresencialDetail && 'border-emerald-200/80 bg-emerald-50/78 text-emerald-950 shadow-[0_16px_30px_-24px_rgba(5,150,105,0.2)]',
                    isIdentityDetail && 'border-slate-200/85 bg-slate-50/85 text-[#374151]',
                    !isPresencialDetail && !isIdentityDetail && 'border-slate-200/85 bg-slate-50/75 text-[#4B5563]',
                  )}
                >
                  {isPresencialDetail ? (
                    <PresencialVerificationSealMark
                      alt="Verificado presencialmente"
                      className="mt-0.5 h-10 w-auto shrink-0 sm:h-12"
                    />
                  ) : (
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white sm:h-9 sm:w-9',
                        isIdentityDetail ? 'border-[#D1D5DB] text-emerald-600' : 'border-[#E5E7EB] text-slate-400',
                      )}
                      aria-hidden="true"
                    >
                      {isIdentityDetail ? <Icons.Check className="h-5 w-5" /> : <Icons.Info className="h-5 w-5" />}
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className={cn('text-[0.84rem] font-semibold leading-5 sm:text-[0.9rem]', isPresencialDetail ? 'text-emerald-900' : isIdentityDetail ? 'text-[#374151]' : 'text-[#4B5563]')}>
                      {heroVerificationCopy.title}
                    </p>
                    <p className={cn('mt-0.5 text-[0.69rem] leading-5 sm:text-[0.74rem]', isPresencialDetail ? 'text-emerald-900/78' : 'text-[#6B7280]')}>
                      {heroVerificationCopy.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {guestCapacity ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[0.78rem] font-medium text-slate-600 sm:px-3.5 sm:py-1.75 sm:text-[0.84rem]">
                      <Icons.Users className="h-4 w-4 text-slate-400" />
                      <span>{guestCapacity}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {hasSelectedDates || guestCount > 1 ? (
                <div className="flex flex-wrap gap-2.5 border-t border-slate-200/70 pt-4 sm:gap-3 sm:pt-5">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.75 text-[0.82rem] font-medium text-slate-700 sm:px-3.5 sm:py-2 sm:text-sm">
                    {dateSelectionSummary}
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.75 text-[0.82rem] font-medium text-slate-700 sm:px-3.5 sm:py-2 sm:text-sm">
                    {guestCountLabel}
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.75 text-[0.82rem] font-medium text-slate-700 sm:px-3.5 sm:py-2 sm:text-sm">
                    {totalSummaryLabel}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3.5 sm:space-y-4 lg:pt-1">
              <div className="space-y-3">
                <Button
                  ref={primaryBookingCtaRef}
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleOpenBookingEntry}
                  className="min-h-[3.35rem] w-full rounded-[20px] px-5 text-[0.94rem] font-extrabold shadow-[0_24px_44px_-28px_rgba(67,56,202,0.44)] sm:min-h-[3.65rem] sm:rounded-[22px] sm:px-6 sm:text-[0.98rem] sm:shadow-[0_28px_52px_-30px_rgba(67,56,202,0.48)]"
                >
                  <>
                    <Icons.Calendar className="h-4 w-4" />
                    {bookingEntryCtaLabel}
                  </>
                </Button>

                {bookingCtaSupportCopy ? (
                  <p className="text-center text-[0.72rem] font-medium leading-5 text-slate-500 sm:text-[0.76rem]">
                    {bookingCtaSupportCopy}
                  </p>
                ) : null}

                <ContextualTip
                  eyebrow={detailOnboardingTip.eyebrow}
                  body={detailOnboardingTip.body}
                  tone={detailOnboardingTip.tone}
                  className="shadow-none"
                />
              </div>
            </div>
          </div>

        </section>

        <section
          data-testid="property-verification-preview"
          aria-label="Qué está confirmado"
          data-motion-block
          className="app-motion-block mt-3 md:mt-5"
        >
          <div className="rounded-[22px] border border-slate-200/75 bg-slate-50/62 px-5 py-4 shadow-[0_14px_28px_-26px_rgba(15,23,42,0.1)] sm:px-6 sm:py-5">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F46E5]/62">Verificación</p>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.15rem]">Qué está confirmado</h2>
              </div>

              <ul className="grid gap-2.5 sm:grid-cols-2" aria-label="Qué está confirmado">
                {detailVerificationChecklist.map((item) => (
                  <li
                    key={item.key}
                    className={cn('flex min-w-0 items-start gap-3 rounded-[16px] border border-slate-200/70 bg-white/78 px-3 py-2.5 text-[0.9rem] font-medium leading-5', item.confirmed ? 'text-slate-900' : 'text-[#4B5563]')}
                  >
                    <span
                      className={cn(
                        'mt-0.5 inline-flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full',
                        item.confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400',
                      )}
                      aria-hidden="true"
                    >
                      {item.confirmed ? <Icons.Check className="h-4 w-4" /> : <Icons.X className="h-4 w-4" />}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <main
          className="mt-3 space-y-6 md:mt-5 md:space-y-8"
          onPointerDownCapture={handleDecisionContentEngagement}
          onFocusCapture={handleDecisionContentEngagement}
        >
          <Card data-motion-block className="app-card-hover app-motion-block relative overflow-hidden rounded-[32px] border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,255,0.985)_100%)] p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,rgba(29,134,117,0)_0%,rgba(29,134,117,0.18)_28%,rgba(79,70,229,0.22)_72%,rgba(79,70,229,0)_100%)]" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.06)_0%,rgba(79,70,229,0)_70%)]" />
            <div className="pointer-events-none absolute -left-14 bottom-[-3.5rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(29,134,117,0.055)_0%,rgba(29,134,117,0)_72%)]" />
            <div className="relative space-y-5">
              <SectionTitle
                eyebrow="Lo esencial"
                heading="Lo esencial del lugar"
                description="Lo básico para decidir si querés elegir fechas o seguir con la consulta."
                eyebrowClassName="text-[#4F46E5]/65"
                descriptionClassName="text-slate-600"
              />
              <p className="max-w-3xl text-base leading-8 text-slate-700">
                {property.description || 'Todavía no hay descripción disponible.'}
              </p>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {decisionHighlights.map((item, index) => (
                  <div
                    key={item}
                    className={cn(
                      'rounded-[24px] border px-4 py-3 text-sm font-medium leading-6 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.18)]',
                      index % 3 === 0 && 'border-[#1D8675]/12 bg-[#1D8675]/4 text-slate-700',
                      index % 3 === 1 && 'border-brand/12 bg-[rgba(79,70,229,0.035)] text-slate-700',
                      index % 3 === 2 && 'border-slate-200/80 bg-slate-50/80 text-slate-700',
                    )}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {property.isOwnedByViewer === true ? (
            <>
              <div data-motion-block className="app-motion-block">
                <VerificationInfoPanel />
              </div>

              <div data-motion-block className="app-motion-block">
                <PropertyVerificationPanel
                  property={property as AppProperty}
                  onRefresh={onRefresh}
                  onOpenIdentityVerification={onOpenIdentityVerification}
                />
              </div>
            </>
          ) : null}

          <Card data-motion-block className="app-card-hover app-motion-block relative overflow-hidden rounded-[32px] border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,255,0.985)_100%)] p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,rgba(29,134,117,0)_0%,rgba(29,134,117,0.18)_28%,rgba(79,70,229,0.22)_72%,rgba(79,70,229,0)_100%)]" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.06)_0%,rgba(79,70,229,0)_70%)]" />
            <div className="pointer-events-none absolute -left-14 bottom-[-3.5rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(29,134,117,0.055)_0%,rgba(29,134,117,0)_72%)]" />
            <div className="relative space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#1D8675]/10 bg-[linear-gradient(135deg,rgba(79,70,229,0.045)_0%,rgba(29,134,117,0.07)_100%)] text-[#1D8675] shadow-[0_18px_34px_-28px_rgba(29,134,117,0.24)] dark:bg-slate-800 dark:text-slate-300">
                    {property.host?.avatarUrl ? (
                      <img
                        src={property.host.avatarUrl}
                        alt={hostName}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Icons.User className="h-8 w-8" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4F46E5]/65">Quién publica</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">{hostName}</h2>
                    <p className="text-sm leading-6 text-[#1D8675]/75">Identidad confirmada dentro de la plataforma</p>
                  </div>
                </div>

                {property.hostId ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenHostProfile}
                    className="rounded-full border-brand/10 bg-white/92 text-slate-800 shadow-[0_16px_30px_-26px_rgba(79,70,229,0.18)] hover:border-brand/20 hover:bg-white hover:text-brand"
                  >
                    <>
                      <Icons.ArrowRight className="h-4 w-4" />
                      Ver perfil
                    </>
                  </Button>
                ) : null}
              </div>

              <p className="text-sm leading-7 text-slate-700">
                {property.host?.bio?.trim() || 'Ves quién publica, qué historial ya aparece y qué información quedó validada dentro de la plataforma.'}
              </p>

              <TrustSignalsInline
                title="Qué ya deja claro este perfil"
                signals={decoratedHostTrustSignals}
                className="rounded-[24px] border border-slate-200/70 bg-white/82 p-3 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.12)] sm:p-4"
                emptyText="Todavía no hay suficientes señales visibles para resumir este perfil."
              />
            </div>
          </Card>

          <Card data-motion-block className="app-card-hover app-motion-block rounded-[32px] border-slate-200/80 bg-white p-6 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.25)] sm:p-7">
            <div className="space-y-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-4">
                  <SectionTitle
                    eyebrow="Opiniones"
                    heading="Opiniones reales"
                    description="Promedio, cantidad y comentarios visibles de interacciones reales en esta propiedad."
                  />

                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700">
                      <Icons.Star className="h-4 w-4 text-amber-500" />
                      <span>{reviewCount > 0 ? reviewAverage.toFixed(1).replace('.', ',') : 'Sin promedio'}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700">
                      <Icons.MessageSquare className="h-4 w-4 text-slate-500" />
                      <span>{reviewCount} {reviewCount === 1 ? 'opinión' : 'opiniones'}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowReportModal(true)}
                  className="rounded-full border-red-200/70 bg-red-50/80 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
                >
                  <>
                    <Icons.AlertTriangle className="h-4 w-4" />
                    Reportar publicación
                  </>
                </Button>
              </div>

              {visibleReviews.length > 0 ? (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {visibleReviews.map((review) => (
                    <li key={review.id} className="app-card-hover rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.18)] transition-[transform,box-shadow,border-color] duration-200 ease-out">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{review.userName || 'Huésped'}</p>
                          {formatMonthYear(review.date) ? <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{formatMonthYear(review.date)}</p> : null}
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                          <Icons.Star className="h-4 w-4 text-amber-500" />
                          <span>{review.rating.toFixed(1).replace('.', ',')}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment}</p>
                      {(review.categories?.length || review.categoryScores?.length) ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(review.categories ?? review.categoryScores ?? []).slice(0, 2).map((category) => (
                            <span key={`${review.id}-${category.key}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                              <Icons.Star className="h-3 w-3 text-amber-500" />
                              {category.label}: {category.score}/5
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-500">
                  Todavía no hay opiniones visibles de estadías cerradas para este lugar.
                </p>
              )}
            </div>
          </Card>
        </main>
      </div>

      {showReportModal ? (
        <ReportModal
          reportedUserId={property.hostId}
          propertyId={property.id}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            setShowReportModal(false);
            showToast('Reporte enviado', 'Recibimos el reporte y lo vamos a revisar.', 'success');
          }}
        />
      ) : null}

      <BookingConfirmationModal
        isOpen={bookingDecisionOpen}
        onClose={() => {
          if (bookingSubmitMode === null) {
            setBookingDecisionOpen(false);
          }
        }}
        onStartDirect={() => {
          void handleStartDirectRequest();
        }}
        onStartProtected={() => {
          void handleStartProtectedRequest();
        }}
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
        submitNotice={confirmationNotice}
      />

      {bookingFlowOpen ? (
        <div className="fixed inset-0 z-50 p-0 sm:p-4" role="presentation">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={handleCloseBookingEntry}
            aria-hidden="true"
          />

          <div className="relative flex h-full items-end justify-center sm:items-center">
            <div
              ref={bookingStepPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-flow-title"
              aria-describedby="booking-flow-description"
              tabIndex={-1}
              className="relative z-10 flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-slate-200/80 bg-white shadow-[0_36px_100px_-60px_rgba(15,23,42,0.5)] outline-none sm:h-auto sm:max-h-[92vh] sm:rounded-[28px] lg:sm:rounded-[32px]"
            >
              <div className="border-b border-slate-200/70 px-4 py-3.5 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reserva</p>
                    <h2 id="booking-flow-title" className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-2xl">Consultar disponibilidad</h2>
                    <p id="booking-flow-description" className="text-[0.92rem] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                      Elegí fechas y huéspedes desde esta ficha. Después definís si querés operar libremente por chat o dejar la reserva lista para una seña protegida.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseBookingEntry}
                    aria-label="Cerrar flujo de reserva"
                    disabled={bookingSubmitMode !== null}
                    className="h-9 w-9 rounded-full p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:h-10 sm:w-10"
                  >
                    <Icons.X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleReserve}>
                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                  <div className="space-y-5 sm:space-y-6">
                    <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-3.5 py-3.5 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.14)] sm:rounded-[24px] sm:px-4 sm:py-4">
                      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fechas</p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{dateSelectionSummary}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Huéspedes</p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{guestCountLabel}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total estimado</p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{totalSummaryLabel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="animate-[booking-step-in_220ms_var(--app-interaction-ease)] rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-3.5 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.16)] sm:rounded-[26px] sm:p-5">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{currentBookingStep.shortLabel}</p>
                        <h3 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{currentBookingStep.title}</h3>
                        <p className="text-[0.92rem] leading-5 text-slate-600 sm:text-sm sm:leading-6">{currentBookingStep.description}</p>
                        {isMobileBookingLayout && mobileStepStatusLabel ? <p className="text-[0.9rem] font-medium text-slate-600 sm:text-sm">{mobileStepStatusLabel}</p> : null}
                      </div>

                      {bookingStep === 'dates' ? (
                        <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
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
                            <p className="rounded-[18px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.92rem] font-medium text-red-700 sm:rounded-[20px] sm:px-4 sm:py-3 sm:text-sm">
                              {bookingError.message}
                            </p>
                          ) : hasCompleteDates ? (
                            <div className="rounded-[16px] border border-brand/10 bg-white px-3.5 py-2.5 text-[0.92rem] font-medium text-slate-700 shadow-[0_18px_36px_-34px_rgba(15,23,42,0.18)] sm:rounded-[18px] sm:px-4 sm:py-3 sm:text-sm">
                              {mobileBookingSummary}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {bookingStep === 'guests' ? (
                        <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
                          <div className="overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[0_18px_36px_-30px_rgba(15,23,42,0.14)] sm:rounded-[24px]">
                            <div className="space-y-0 px-3.5 py-3 sm:px-4 sm:py-3.5">
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

                          <div className="rounded-[16px] bg-slate-900/[0.03] px-3.5 py-2.5 text-[0.92rem] text-slate-600 sm:rounded-[18px] sm:px-4 sm:py-3 sm:text-sm">
                            <p className="font-semibold text-slate-950">{formatGuestSelection(adults, childrenCount)}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {maxGuestsNumber
                                ? guestCapacityReached
                                  ? `Máximo: ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
                                  : `Capacidad hasta ${maxGuestsNumber} ${maxGuestsNumber === 1 ? 'huésped' : 'huéspedes'}.`
                                : 'Podés ajustarlo si hace falta.'}
                            </p>
                          </div>

                          {bookingError?.field === 'guests' ? (
                            <p className="rounded-[18px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.92rem] font-medium text-red-700 sm:rounded-[20px] sm:px-4 sm:py-3 sm:text-sm">
                              {bookingError.message}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {bookingStep === 'confirm' ? (
                        <div className="mt-4 space-y-3.5 sm:mt-5 sm:space-y-4">
                          <div className="space-y-3 rounded-[20px] border border-slate-200/80 bg-white p-3.5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.14)] sm:rounded-[24px] sm:p-4">
                            <div className="flex items-end justify-between gap-4 border-b border-slate-200/70 pb-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Antes de enviarla</p>
                                <p className="mt-1 text-base font-semibold text-slate-950">Revisá los datos</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total</p>
                                <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{formatCurrency(total)}</p>
                              </div>
                            </div>

                            <div className="space-y-3 text-sm text-slate-600">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fechas</p>
                                  <p className="mt-1 font-semibold text-slate-950">{formatRequestDate(checkIn)} al {formatRequestDate(checkOut)}</p>
                                  <p className="mt-1">{nights} {nights === 1 ? 'noche' : 'noches'}</p>
                                </div>
                                <button type="button" onClick={() => goToBookingStep('dates')} className="text-xs font-semibold text-brand transition-colors hover:text-brand-dark">
                                  Editar
                                </button>
                              </div>

                              <div className="flex items-start justify-between gap-3 border-t border-slate-200/70 pt-3">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Huéspedes</p>
                                  <p className="mt-1 font-semibold text-slate-950">{formatGuestSelection(adults, childrenCount)}</p>
                                </div>
                                <button type="button" onClick={() => goToBookingStep('guests')} className="text-xs font-semibold text-brand transition-colors hover:text-brand-dark">
                                  Editar
                                </button>
                              </div>

                              <div className="flex items-start justify-between gap-3 border-t border-slate-200/70 pt-3">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Modalidad</p>
                                  <p className="mt-1 font-semibold text-slate-950">La elegís en el siguiente paso</p>
                                  <p className="mt-1">Operación libre abre chat sin bloquear fechas. Seña protegida deja la reserva lista para una seña retenida hasta check-in, aunque por ahora sin pagos dentro de la app.</p>
                                </div>
                                <span className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                                  Elegís ahora
                                </span>
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
                  </div>
                </div>

                <div className="border-t border-slate-200/70 px-4 py-3.5 sm:px-6 sm:py-4">
                  <div className="space-y-3">
                    {isMobileBookingLayout ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{bookingStepProgressLabel}</p>
                            <p className="mt-1 truncate text-[0.72rem] font-medium leading-5 text-slate-600 sm:text-xs">{mobileBookingSummary}</p>
                          </div>
                          <p className="shrink-0 text-[0.88rem] font-bold text-slate-950 sm:text-sm">{nightly ? `${formatCurrency(nightly)} / noche` : '—'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          {bookingStep !== 'dates' ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="lg"
                              onClick={handleRetreatBookingStep}
                              className="rounded-[18px] border-slate-200 bg-white px-3.5 sm:rounded-2xl sm:px-4"
                            >
                              Atrás
                            </Button>
                          ) : null}
                          <Button
                            type={bookingStep === 'confirm' ? 'submit' : 'button'}
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={bookingStep === 'confirm' ? undefined : () => {
                              void handleMobilePrimaryAction();
                            }}
                            className="min-h-[3.2rem] rounded-[18px] shadow-[0_24px_46px_-28px_rgba(67,56,202,0.42)] sm:rounded-2xl"
                            disabled={mobilePrimaryActionDisabled}
                            aria-disabled={mobilePrimaryActionDisabled}
                            loading={bookingStep === 'confirm' && bookingSubmitMode !== null}
                            loadingLabel={bookingSubmitMode === 'protected' ? 'Armando seña protegida...' : 'Abriendo chat...'}
                          >
                            <>
                              {bookingStep === 'dates' ? <Icons.Calendar className="h-4 w-4" /> : <Icons.ArrowRight className="h-4 w-4" />}
                              {mobilePrimaryActionLabel}
                            </>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4">
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
                            loadingLabel={bookingSubmitMode === 'protected' ? 'Armando seña protegida...' : 'Abriendo chat...'}
                          >
                            <>
                              <Icons.ArrowRight className="h-4 w-4" />
                              Elegir modalidad
                            </>
                          </Button>
                        )}
                      </div>
                    )}

                    <p className="text-center text-xs leading-5 text-slate-500">
                      Podés cerrar este flujo y retomarlo después sin perder lo que ya elegiste.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-2.5 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:px-4 lg:px-6">
        <section
          role="region"
          aria-label="Acceso rápido a disponibilidad"
          aria-hidden={shouldShowStickyBookingBar ? undefined : true}
          className={cn(
            'pointer-events-auto mx-auto max-w-2xl rounded-[20px] border border-slate-200/90 bg-white/96 px-3.5 py-2.75 shadow-[0_-18px_40px_-30px_rgba(15,23,42,0.28)] backdrop-blur transition-[opacity,transform] duration-200 ease-out sm:max-w-3xl sm:rounded-[24px] sm:px-5 sm:py-3.5',
            shouldShowStickyBookingBar ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
          )}
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-[0.98rem] font-black tracking-[-0.03em] text-slate-950 sm:text-[1.12rem]">{stickyBookingPriceLabel}</p>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth={isMobileBookingLayout}
              onClick={handleOpenBookingEntry}
              className="min-h-[3.15rem] rounded-[18px] px-4.5 text-[0.92rem] font-extrabold shadow-[0_24px_46px_-28px_rgba(67,56,202,0.42)] sm:w-auto sm:min-w-[240px] sm:min-h-[3.35rem] sm:rounded-[22px] sm:px-5 sm:text-[0.95rem]"
            >
              <>
                <Icons.Calendar className="h-4 w-4" />
                <span
                  key={stickyBookingCtaLabel}
                  className="inline-flex animate-[booking-step-in_180ms_var(--app-interaction-ease)] motion-reduce:animate-none"
                >
                  {stickyBookingCtaLabel}
                </span>
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
                {lightboxPhotoCountLabel}
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

  const refreshProperty = async (propertyId: string) => {
    const nextProperty = await apiJson<PropertyDetailData>(`/api/properties/${propertyId}`);
    setProperty(nextProperty);
  };

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

  if (loading) return <LoadingState message="Cargando la propiedad..." fullScreen />;
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
      onRefresh={id ? () => refreshProperty(id) : undefined}
      onOpenIdentityVerification={() => navigate('/profile')}
    />
  );
};

export default PropertyDetail;
