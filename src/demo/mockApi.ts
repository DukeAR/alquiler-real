import { demoProperties } from './demoData';
import { DEMO_ORDER_ID, DEMO_USER_ID, DEMO_USER_PROFILE } from './mockIdentity';
import { getProtectedDepositPricing } from '../lib/protectedDeposit';
import {
  PREMIUM_DOCUMENTARY_OFFER_TYPE,
  PREMIUM_ONSITE_OFFER_TYPE,
  PREMIUM_VERIFICATION_CURRENCY,
  type PremiumVerificationOffer,
} from '../lib/premiumVerification';
import { withDemoQuery } from '../lib/demoMode';
import type { ActivityData, ReviewsData, ValidationData } from '../hooks/useUserProfile';
import type { HostProfile } from '../services/geminiService';
import type { BookingStatus, Property, ReservationDepositStatus } from '../types';

type DemoUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  zone: string;
  bio: string;
  interests: string[];
  memberSince: string;
  activeMode: 'guest' | 'host';
};

type DemoNotification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  unread: boolean;
};

type DemoMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
  kind?: 'text' | 'system';
};

type DemoConversation = {
  id: string;
  booking_id: string | null;
  property_id: string;
  propertyTitle: string;
  propertyImageUrl: string;
  tenant_id: string;
  tenantName: string;
  host_id: string;
  hostName: string;
  requestMode: 'direct' | 'protected';
  requestStatus: 'pending' | 'accepted' | 'not_advanced';
  bookingStatus: BookingStatus;
  depositType: 'external' | 'protected' | null;
  depositStatus: ReservationDepositStatus | null;
  startDate: string;
  endDate: string;
  guests: number;
  totalPrice: number;
  last_message: string;
  unread_count: number;
  updated_at: string;
};

type DemoBooking = {
  id: string;
  conversationId: string | null;
  propertyId: string;
  propertyTitle: string;
  imageUrl: string;
  location: string;
  userId: string;
  userName: string;
  hostId: string;
  hostName: string;
  startDate: string;
  endDate: string;
  date?: string;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  requestMode: 'direct' | 'protected';
  depositType: 'external' | 'protected' | null;
  depositStatus: ReservationDepositStatus | null;
  protectedDepositPricing?: ReturnType<typeof getProtectedDepositPricing> | null;
  contractAccepted?: boolean;
  cancellationActor?: 'guest' | 'host' | null;
};

type DemoManagedProperty = Property & {
  status: 'active' | 'inactive';
  pendingRequestsCount: number;
  activeReservationsCount: number;
  nextArrivalDate: string | null;
};

type DemoStore = {
  user: DemoUser;
  properties: DemoManagedProperty[];
  favorites: string[];
  notifications: DemoNotification[];
  validationData: ValidationData;
  activity: ActivityData;
  reviews: ReviewsData;
  preferences: {
    preferred_zone: string;
    max_price: number;
    preferred_property_type: string;
  };
  guestBookings: DemoBooking[];
  hostBookings: DemoBooking[];
  conversations: DemoConversation[];
  messagesByConversationId: Record<string, DemoMessage[]>;
  availabilityByPropertyId: Record<string, Array<{ start: string; end: string; source: 'manual' | 'booking' }>>;
  hostProfiles: Record<string, HostProfile>;
  propertyReviews: Record<string, ReviewsData['received']>;
};

const PLACEHOLDER_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80';

const cloneValue = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const withPropertyVerificationDefaults = <T extends Property>(property: T) => {
  const isPresentiallyVerified = Boolean(
    property.hasPresencialVerification
    || property.isPresentiallyVerified
    || property.onsiteVerifiedAt
    || property.verificationLevel === 'presencial',
  );
  const isIdentityVerified = Boolean(
    isPresentiallyVerified
    || property.identityValidated
    || property.isIdentityVerified
    || property.verificationLevel === 'identity',
  );
  const verificationLevel = isPresentiallyVerified
    ? 'presencial'
    : isIdentityVerified
      ? 'identity'
      : 'none';

  return {
    ...property,
    identityValidated: isIdentityVerified,
    hasPresencialVerification: isPresentiallyVerified,
    verificationLevel,
    isIdentityVerified,
    isPresentiallyVerified,
  };
};

const jsonResponse = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json',
  },
});

const emptyResponse = (status = 204) => new Response(null, { status });

const errorResponse = (message: string, status = 400) => jsonResponse({ error: message }, status);

const parseJsonBody = (body: BodyInit | null | undefined) => {
  if (typeof body !== 'string' || !body.trim()) {
    return {} as Record<string, unknown>;
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
};

const normalizeText = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

const normalizeDateValue = (value: string) => new Date(`${value}T00:00:00.000Z`).getTime();

const getNightCount = (startDate: string, endDate: string) => {
  const start = normalizeDateValue(startDate);
  const end = normalizeDateValue(endDate);
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / dayMs));
};

const isRangeOverlapping = (leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) => {
  const leftStartTime = normalizeDateValue(leftStart);
  const leftEndTime = normalizeDateValue(leftEnd);
  const rightStartTime = normalizeDateValue(rightStart);
  const rightEndTime = normalizeDateValue(rightEnd);

  return leftStartTime < rightEndTime && rightStartTime < leftEndTime;
};

const createHostProfile = (input: Partial<HostProfile> & Pick<HostProfile, 'id' | 'name'>): HostProfile => ({
  id: input.id,
  name: input.name,
  email: input.email ?? `${normalizeText(input.name).replace(/\s+/g, '.')}@alquilerreal.app`,
  emailVerified: input.emailVerified ?? true,
  identityValidated: input.identityValidated ?? true,
  memberSince: input.memberSince ?? '2023-01-12',
  verificationMethod: input.verificationMethod ?? 'digital',
  status: input.status ?? 'highly_traceable',
  publishedPropertiesCount: input.publishedPropertiesCount ?? 3,
  activePropertiesCount: input.activePropertiesCount ?? 2,
  avgPublicationAgeMonths: input.avgPublicationAgeMonths ?? 11,
  completedStaysCount: input.completedStaysCount ?? 12,
  stayCompletionRate: input.stayCompletionRate ?? 94,
  lastVerifiedActivityDate: input.lastVerifiedActivityDate ?? '2026-03-10',
  queriesReceivedCount: input.queriesReceivedCount ?? 40,
  chatsStartedCount: input.chatsStartedCount ?? 18,
  agreementsFinalizedCount: input.agreementsFinalizedCount ?? 12,
  avgResponseTimeMinutes: input.avgResponseTimeMinutes ?? 36,
  hostCancellationsCount: input.hostCancellationsCount ?? 1,
  interactionHistory: input.interactionHistory ?? {
    completedReservationsCount: 12,
    feedbackCount: 10,
    agreementsKeptCount: 9,
    listingConsistentCount: 9,
    wouldInteractAgainCount: 9,
    incidentsCount: 0,
    avgResponseTimeMinutes: 36,
    publicSignals: [
      {
        key: 'agreements',
        label: 'Sostiene lo acordado',
        tone: 'positive',
        detail: 'La mayoría de los cierres compartidos terminaron sin cambios de condiciones.',
      },
      {
        key: 'clarity',
        label: 'Da información clara antes de reservar',
        tone: 'positive',
        detail: 'Responde dudas de llegada, reglas y disponibilidad sin fricción.',
      },
      {
        key: 'timing',
        label: 'Responde dentro del día',
        tone: 'neutral',
        detail: 'El promedio sale de la primera respuesta visible dentro del chat.',
      },
    ],
  },
  reputation: input.reputation ?? {
    photosMatchRealityRate: 95,
    infoClarityRate: 93,
    agreementComplianceRate: 94,
    communicationRate: 92,
    attemptsToChangeConditionsOutside: false,
  },
  verificationsSummary: input.verificationsSummary ?? {
    presencialCount: 0,
    gpsProofCount: 2,
    videoValidationCount: 1,
  },
  alerts: input.alerts ?? [],
});

const createDemoStore = (): DemoStore => {
  const user: DemoUser = {
    id: DEMO_USER_ID,
    name: DEMO_USER_PROFILE.name,
    email: DEMO_USER_PROFILE.email,
    phone: DEMO_USER_PROFILE.phone,
    zone: DEMO_USER_PROFILE.zone,
    bio: DEMO_USER_PROFILE.bio,
    interests: [...DEMO_USER_PROFILE.interests],
    memberSince: DEMO_USER_PROFILE.memberSince,
    activeMode: 'guest',
  };

  const publicProperties = demoProperties.map((property) => withPropertyVerificationDefaults({
    ...cloneValue(property),
    hostId: property.id === '1' || property.id === '4' ? DEMO_USER_ID : property.hostId,
    hostName: property.id === '1' || property.id === '4' ? user.name : property.hostName,
    isOwnedByViewer: property.id === '1' || property.id === '4',
    status: 'active' as const,
    pendingRequestsCount: property.id === '1' ? 1 : 0,
    activeReservationsCount: property.id === '1' ? 1 : property.id === '4' ? 1 : 0,
    nextArrivalDate: property.id === '1' ? '2026-05-12' : property.id === '4' ? '2026-05-28' : null,
  }));

  const publishingProperty: DemoManagedProperty = withPropertyVerificationDefaults({
    ...cloneValue(publicProperties[3]),
    id: '5',
    title: 'Casa amplia con patio interno y garaje cubierto',
    description: 'Publicación pausada para revisar estado, disponibilidad y validaciones desde el panel.',
    location: 'Mar de Ajó',
    imageUrl: 'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80'],
    hostId: DEMO_USER_ID,
    hostName: user.name,
    isOwnedByViewer: true,
    locationVerified: false,
    propertyRelationshipVerified: false,
    hasPresencialVerification: false,
    onsiteVerifiedAt: undefined,
    availabilityValidated: false,
    status: 'inactive',
    pendingRequestsCount: 0,
    activeReservationsCount: 0,
    nextArrivalDate: null,
    premiumOnsiteOffer: {
      offerType: PREMIUM_ONSITE_OFFER_TYPE,
      targetType: 'property',
      title: 'Validación presencial del aviso',
      summary: 'Sumá una validación presencial opcional para dejar más claro que la publicación tiene respaldo adicional.',
      contextHint: 'Se coordina una visita breve para revisar la ubicación y sumar contexto adicional al aviso.',
      visibilityHint: 'Se muestra una validación presencial visible en la ficha del aviso.',
      ctaLabel: 'Activar revisión presencial',
      checkoutLabel: 'Confirmar validación',
      processLabel: 'Ir a la revisión',
      priceArs: 18000,
      currency: PREMIUM_VERIFICATION_CURRENCY,
      isComplimentary: false,
      complimentaryReason: null,
      purchased: false,
      completed: false,
      redirectTo: withDemoQuery('/verification?mode=onsite&propertyId=5&propertyTitle=Casa%20amplia%20con%20patio%20interno%20y%20garaje%20cubierto&returnTo=/host-dashboard', '?demo=true'),
      propertyId: '5',
      propertyTitle: 'Casa amplia con patio interno y garaje cubierto',
    },
  });

  const properties = [...publicProperties, publishingProperty];

  const hostProfiles: Record<string, HostProfile> = {
    [DEMO_USER_ID]: createHostProfile({
      id: DEMO_USER_ID,
      name: user.name,
      email: user.email,
      memberSince: '2023-01-12',
      verificationMethod: 'presencial',
      publishedPropertiesCount: 3,
      activePropertiesCount: 2,
      completedStaysCount: 21,
      stayCompletionRate: 95,
      queriesReceivedCount: 84,
      chatsStartedCount: 39,
      agreementsFinalizedCount: 21,
      avgResponseTimeMinutes: 28,
      hostCancellationsCount: 1,
      interactionHistory: {
        completedReservationsCount: 21,
        feedbackCount: 18,
        agreementsKeptCount: 17,
        listingConsistentCount: 16,
        wouldInteractAgainCount: 17,
        incidentsCount: 0,
        avgResponseTimeMinutes: 28,
        publicSignals: [
          {
            key: 'agreements',
            label: 'Sostiene lo acordado',
            tone: 'positive',
            detail: 'La mayoría de los cierres compartidos terminaron sin cambios de condiciones.',
          },
          {
            key: 'clarity',
            label: 'Da información clara antes de reservar',
            tone: 'positive',
            detail: 'Responde dudas de ubicación, llegada y reglas sin fricción.',
          },
          {
            key: 'timing',
            label: 'Responde dentro del día',
            tone: 'neutral',
            detail: 'El promedio sale de la primera respuesta visible en los chats.',
          },
        ],
      },
      verificationsSummary: {
        presencialCount: 1,
        gpsProofCount: 3,
        videoValidationCount: 2,
      },
    }),
    'demo-host-2': createHostProfile({
      id: 'demo-host-2',
      name: 'Martín Quiroga',
      publishedPropertiesCount: 2,
      activePropertiesCount: 2,
      completedStaysCount: 11,
      queriesReceivedCount: 34,
      chatsStartedCount: 15,
      agreementsFinalizedCount: 10,
      avgResponseTimeMinutes: 41,
      verificationMethod: 'digital',
      identityValidated: true,
    }),
    'demo-host-3': createHostProfile({
      id: 'demo-host-3',
      name: 'Sofía Acosta',
      publishedPropertiesCount: 1,
      activePropertiesCount: 1,
      completedStaysCount: 6,
      queriesReceivedCount: 17,
      chatsStartedCount: 8,
      agreementsFinalizedCount: 5,
      avgResponseTimeMinutes: 57,
      verificationMethod: 'digital',
      identityValidated: false,
    }),
  };

  const propertyReviews: DemoStore['propertyReviews'] = {
    '1': [
      {
        id: 'property-1-review-1',
        type: 'guest_to_host',
        propertyTitle: 'Casa frente al mar con galería y parrilla',
        userName: 'Camila',
        rating: 5,
        comment: 'La casa coincidía con las fotos y la coordinación fue clara desde el inicio.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-02-14',
      },
      {
        id: 'property-1-review-2',
        type: 'guest_to_host',
        propertyTitle: 'Casa frente al mar con galería y parrilla',
        userName: 'Marcos',
        rating: 5,
        comment: 'Muy buena ubicación para ir caminando a la playa. La información visible ayudó a decidir rápido.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-01-08',
      },
    ],
    '2': [
      {
        id: 'property-2-review-1',
        type: 'guest_to_host',
        propertyTitle: 'Departamento tranquilo a tres cuadras del centro',
        userName: 'Noelia',
        rating: 4,
        comment: 'Todo estuvo bien coordinado y el anfitrión respondió rápido.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-02-02',
      },
    ],
    '3': [
      {
        id: 'property-3-review-1',
        type: 'guest_to_host',
        propertyTitle: 'Cabaña entre pinos para escapada corta',
        userName: 'Julián',
        rating: 4,
        comment: 'Ideal para una escapada corta. La cabaña estaba tal como se mostraba.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-01-19',
      },
    ],
    '4': [
      {
        id: 'property-4-review-1',
        type: 'guest_to_host',
        propertyTitle: 'PH con patio y escritorio para workation',
        userName: 'Belén',
        rating: 5,
        comment: 'Muy cómodo para trabajar unos días. La disponibilidad estaba bien actualizada.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-02-20',
      },
    ],
  };

  const guestBookings: DemoBooking[] = [
    {
      id: 'booking-guest-1',
      conversationId: 'conv-guest-1',
      propertyId: '2',
      propertyTitle: 'Departamento tranquilo a tres cuadras del centro',
      imageUrl: properties.find((property) => property.id === '2')?.imageUrl || PLACEHOLDER_PROPERTY_IMAGE,
      location: 'San Bernardo',
      userId: DEMO_USER_ID,
      userName: user.name,
      hostId: 'demo-host-2',
      hostName: 'Martín Quiroga',
      startDate: '2026-06-10',
      endDate: '2026-06-14',
      date: '2026-06-10',
      guests: 2,
      totalPrice: 244000,
      status: 'confirmed',
      requestMode: 'direct',
      depositType: 'external',
      depositStatus: 'confirmed',
      protectedDepositPricing: null,
      contractAccepted: true,
      cancellationActor: null,
    },
    {
      id: 'booking-guest-2',
      conversationId: 'conv-guest-2',
      propertyId: '3',
      propertyTitle: 'Cabaña entre pinos para escapada corta',
      imageUrl: properties.find((property) => property.id === '3')?.imageUrl || PLACEHOLDER_PROPERTY_IMAGE,
      location: 'Aguas Verdes',
      userId: DEMO_USER_ID,
      userName: user.name,
      hostId: 'demo-host-3',
      hostName: 'Sofía Acosta',
      startDate: '2026-07-02',
      endDate: '2026-07-06',
      date: '2026-07-02',
      guests: 3,
      totalPrice: 216000,
      status: 'pending',
      requestMode: 'protected',
      depositType: 'protected',
      depositStatus: 'checkout_pending',
      protectedDepositPricing: getProtectedDepositPricing({
        nights: 4,
        nightlyPrice: 54000,
        totalPrice: 216000,
      }),
      contractAccepted: true,
      cancellationActor: null,
    },
  ];

  const hostBookings: DemoBooking[] = [
    {
      id: 'booking-host-1',
      conversationId: 'conv-host-1',
      propertyId: '1',
      propertyTitle: 'Casa frente al mar con galería y parrilla',
      imageUrl: properties.find((property) => property.id === '1')?.imageUrl || PLACEHOLDER_PROPERTY_IMAGE,
      location: 'Costa del Este',
      userId: 'guest-sim-1',
      userName: 'Lucía Navarro',
      hostId: DEMO_USER_ID,
      hostName: user.name,
      startDate: '2026-05-12',
      endDate: '2026-05-16',
      date: '2026-05-12',
      guests: 4,
      totalPrice: 368000,
      status: 'pending',
      requestMode: 'protected',
      depositType: 'protected',
      depositStatus: 'checkout_pending',
      protectedDepositPricing: getProtectedDepositPricing({
        nights: 4,
        nightlyPrice: 92000,
        totalPrice: 368000,
      }),
      contractAccepted: true,
      cancellationActor: null,
    },
    {
      id: 'booking-host-2',
      conversationId: 'conv-host-2',
      propertyId: '4',
      propertyTitle: 'PH con patio y escritorio para workation',
      imageUrl: properties.find((property) => property.id === '4')?.imageUrl || PLACEHOLDER_PROPERTY_IMAGE,
      location: 'Santa Teresita',
      userId: 'guest-sim-2',
      userName: 'Nicolás Vega',
      hostId: DEMO_USER_ID,
      hostName: user.name,
      startDate: '2026-05-28',
      endDate: '2026-06-01',
      date: '2026-05-28',
      guests: 2,
      totalPrice: 280000,
      status: 'confirmed',
      requestMode: 'direct',
      depositType: 'external',
      depositStatus: 'confirmed',
      protectedDepositPricing: null,
      contractAccepted: true,
      cancellationActor: null,
    },
  ];

  const conversations: DemoConversation[] = [
    {
      id: 'conv-guest-1',
      booking_id: 'booking-guest-1',
      property_id: '2',
      propertyTitle: 'Departamento tranquilo a tres cuadras del centro',
      propertyImageUrl: properties.find((property) => property.id === '2')?.imageUrl || PLACEHOLDER_PROPERTY_IMAGE,
      tenant_id: DEMO_USER_ID,
      tenantName: user.name,
      host_id: 'demo-host-2',
      hostName: 'Martín Quiroga',
      requestMode: 'direct',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositType: 'external',
      depositStatus: 'confirmed',
      startDate: '2026-06-10',
      endDate: '2026-06-14',
      guests: 2,
      totalPrice: 244000,
      last_message: 'Perfecto, te espero el miércoles a partir de las 14 hs.',
      unread_count: 0,
      updated_at: '2026-04-02T17:20:00.000Z',
    },
    {
      id: 'conv-guest-2',
      booking_id: 'booking-guest-2',
      property_id: '3',
      propertyTitle: 'Cabaña entre pinos para escapada corta',
      propertyImageUrl: properties.find((property) => property.id === '3')?.imageUrl || PLACEHOLDER_PROPERTY_IMAGE,
      tenant_id: DEMO_USER_ID,
      tenantName: user.name,
      host_id: 'demo-host-3',
      hostName: 'Sofía Acosta',
      requestMode: 'protected',
      requestStatus: 'pending',
      bookingStatus: 'pending',
      depositType: 'protected',
      depositStatus: 'checkout_pending',
      startDate: '2026-07-02',
      endDate: '2026-07-06',
      guests: 3,
      totalPrice: 216000,
      last_message: 'Cuando quieras, podés avanzar con la seña protegida desde este chat.',
      unread_count: 1,
      updated_at: '2026-04-05T12:00:00.000Z',
    },
    {
      id: 'conv-host-1',
      booking_id: 'booking-host-1',
      property_id: '1',
      propertyTitle: 'Casa frente al mar con galería y parrilla',
      propertyImageUrl: properties.find((property) => property.id === '1')?.imageUrl || PLACEHOLDER_PROPERTY_IMAGE,
      tenant_id: 'guest-sim-1',
      tenantName: 'Lucía Navarro',
      host_id: DEMO_USER_ID,
      hostName: user.name,
      requestMode: 'protected',
      requestStatus: 'pending',
      bookingStatus: 'pending',
      depositType: 'protected',
      depositStatus: 'checkout_pending',
      startDate: '2026-05-12',
      endDate: '2026-05-16',
      guests: 4,
      totalPrice: 368000,
      last_message: 'Nos interesa reservar. ¿La entrada puede ser antes de las 15 hs?',
      unread_count: 2,
      updated_at: '2026-04-06T14:25:00.000Z',
    },
    {
      id: 'conv-host-2',
      booking_id: 'booking-host-2',
      property_id: '4',
      propertyTitle: 'PH con patio y escritorio para workation',
      propertyImageUrl: properties.find((property) => property.id === '4')?.imageUrl || PLACEHOLDER_PROPERTY_IMAGE,
      tenant_id: 'guest-sim-2',
      tenantName: 'Nicolás Vega',
      host_id: DEMO_USER_ID,
      hostName: user.name,
      requestMode: 'direct',
      requestStatus: 'accepted',
      bookingStatus: 'confirmed',
      depositType: 'external',
      depositStatus: 'confirmed',
      startDate: '2026-05-28',
      endDate: '2026-06-01',
      guests: 2,
      totalPrice: 280000,
      last_message: 'Gracias por la coordinación, te aviso cuando salga para allá.',
      unread_count: 0,
      updated_at: '2026-04-04T09:10:00.000Z',
    },
  ];

  const messagesByConversationId: DemoStore['messagesByConversationId'] = {
    'conv-guest-1': [
      {
        id: 'msg-guest-1-1',
        conversation_id: 'conv-guest-1',
        sender_id: 'demo-host-2',
        sender_name: 'Martín Quiroga',
        content: 'Hola Valentina, sí, las fechas siguen disponibles.',
        created_at: '2026-04-02T16:00:00.000Z',
      },
      {
        id: 'msg-guest-1-2',
        conversation_id: 'conv-guest-1',
        sender_id: DEMO_USER_ID,
        sender_name: user.name,
        content: 'Perfecto, me sirve. ¿La cochera es techada?',
        created_at: '2026-04-02T16:12:00.000Z',
      },
      {
        id: 'msg-guest-1-3',
        conversation_id: 'conv-guest-1',
        sender_id: 'demo-host-2',
        sender_name: 'Martín Quiroga',
        content: 'Perfecto, te espero el miércoles a partir de las 14 hs.',
        created_at: '2026-04-02T17:20:00.000Z',
      },
    ],
    'conv-guest-2': [
      {
        id: 'msg-guest-2-1',
        conversation_id: 'conv-guest-2',
        sender_id: 'demo-host-3',
        sender_name: 'Sofía Acosta',
        content: 'Hola, tengo lugar y si querés podés avanzar con la seña protegida.',
        created_at: '2026-04-05T11:45:00.000Z',
      },
      {
        id: 'msg-guest-2-2',
        conversation_id: 'conv-guest-2',
        sender_id: 'demo-host-3',
        sender_name: 'Sofía Acosta',
        content: 'Cuando quieras, podés avanzar con la seña protegida desde este chat.',
        created_at: '2026-04-05T12:00:00.000Z',
      },
    ],
    'conv-host-1': [
      {
        id: 'msg-host-1-1',
        conversation_id: 'conv-host-1',
        sender_id: 'guest-sim-1',
        sender_name: 'Lucía Navarro',
        content: 'Hola, nos interesa reservar. ¿La entrada puede ser antes de las 15 hs?',
        created_at: '2026-04-06T14:25:00.000Z',
      },
    ],
    'conv-host-2': [
      {
        id: 'msg-host-2-1',
        conversation_id: 'conv-host-2',
        sender_id: DEMO_USER_ID,
        sender_name: user.name,
        content: 'Sí, no hay problema. Queda coordinado.',
        created_at: '2026-04-04T08:40:00.000Z',
      },
      {
        id: 'msg-host-2-2',
        conversation_id: 'conv-host-2',
        sender_id: 'guest-sim-2',
        sender_name: 'Nicolás Vega',
        content: 'Gracias por la coordinación, te aviso cuando salga para allá.',
        created_at: '2026-04-04T09:10:00.000Z',
      },
    ],
  };

  const validationData: ValidationData = {
    level: 'INTERMEDIO',
    progress: 80,
    levelNumber: 4,
    levelLabel: '4 de 5 señales visibles',
    shortLabel: '4/5',
    nextLevel: 'Completar validación documental',
    verificationScore: 4,
    headline: 'Tu cuenta ya muestra la mayor parte del respaldo visible disponible.',
    summary: 'Mostramos qué ya fue validado y qué falta completar en tu cuenta, sin prometer nada que la app no pueda respaldar.',
    nextStep: 'Si querés, podés sumar la validación documental adicional desde esta misma pantalla.',
    optionalUpgrade: 'Podés sumar una validación documental extra sin volverla obligatoria.',
    highValueBookingEligible: true,
    checks: {
      emailVerified: true,
      phoneVerified: true,
      profileComplete: true,
      platformActivity: true,
      historyVerified: true,
      reviewsVerified: true,
      documentarySubmitted: false,
      documentaryVerified: false,
    },
    missingRequirements: ['Validación documental adicional'],
    verificationSummary: {
      score: 4,
      maxScore: 5,
      items: [
        {
          key: 'email',
          label: 'Email confirmado',
          status: 'complete',
          description: 'La cuenta ya validó el correo de acceso.',
        },
        {
          key: 'phone',
          label: 'Teléfono confirmado',
          status: 'complete',
          description: 'El número de contacto ya quedó confirmado.',
        },
        {
          key: 'profile',
          label: 'Perfil completo',
          status: 'complete',
          description: 'Hay datos suficientes para entender quién usa la cuenta.',
        },
        {
          key: 'history',
          label: 'Actividad registrada',
          status: 'complete',
          description: 'Ya existe actividad real visible dentro de la app.',
        },
        {
          key: 'documentary',
          label: 'Validación documental adicional',
          status: 'pending',
          description: 'Suma respaldo extra a la identidad sin volverla obligatoria.',
        },
      ],
    },
    benefits: {
      current: [
        'Tu perfil ya muestra respaldo visible básico.',
        'Podés usar chat, reservas y modo anfitrión con la misma cuenta.',
      ],
      next: [
        'La validación documental agrega una capa extra visible al perfil.',
      ],
    },
    premiumDocumentaryOffer: {
      offerType: PREMIUM_DOCUMENTARY_OFFER_TYPE,
      targetType: 'user',
      title: 'Validación documental adicional',
      summary: 'Sumá DNI y selfie como respaldo documental extra para tu perfil.',
      contextHint: 'Se usa para reforzar la identidad visible sin reemplazar las validaciones básicas de la cuenta.',
      visibilityHint: 'Se muestra una validación documental adicional en tu perfil.',
      ctaLabel: 'Activar validación documental',
      checkoutLabel: 'Confirmar validación',
      processLabel: 'Ir a la validación',
      priceArs: 0,
      currency: PREMIUM_VERIFICATION_CURRENCY,
      isComplimentary: true,
      complimentaryReason: 'Por ahora sin cargo.',
      purchased: false,
      completed: false,
      redirectTo: withDemoQuery(`/verification?mode=documentary&orderId=${DEMO_ORDER_ID}&returnTo=/profile`, '?demo=true'),
      orderId: DEMO_ORDER_ID,
    },
  };

  const activity: ActivityData = {
    total_bookings: guestBookings.length,
    total_reviews_written: 2,
    total_reviews_received: 2,
    last_booking_date: '2026-04-05',
  };

  const reviews: ReviewsData = {
    received: [
      {
        type: 'host_to_guest',
        propertyTitle: 'Departamento tranquilo a tres cuadras del centro',
        userName: 'Martín Quiroga',
        rating: 5,
        comment: 'La coordinación fue clara y respondió rápido por chat.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-03-01',
      },
      {
        type: 'host_to_guest',
        propertyTitle: 'Cabaña entre pinos para escapada corta',
        userName: 'Sofía Acosta',
        rating: 4,
        comment: 'Todo estuvo ordenado y la consulta fue respetuosa.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-02-16',
      },
    ],
    written: [
      {
        type: 'guest_to_host',
        propertyTitle: 'Departamento tranquilo a tres cuadras del centro',
        userName: 'Martín Quiroga',
        rating: 5,
        comment: 'El lugar coincidía con las fotos y la comunicación fue directa.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-03-02',
      },
      {
        type: 'guest_to_host',
        propertyTitle: 'Cabaña entre pinos para escapada corta',
        userName: 'Sofía Acosta',
        rating: 4,
        comment: 'Buena experiencia general y disponibilidad clara.',
        agreementKept: true,
        wouldInteractAgain: true,
        hadIncident: false,
        photosMatchReality: true,
        created_at: '2026-02-18',
      },
    ],
  };

  const preferences = {
    preferred_zone: user.zone,
    max_price: 95000,
    preferred_property_type: 'Casa',
  };

  const notifications: DemoNotification[] = [
    {
      id: 'notif-1',
      title: 'Nueva consulta',
      message: 'Lucía te escribió por la casa frente al mar.',
      type: 'info',
      createdAt: '2026-04-06T14:26:00.000Z',
      unread: true,
    },
    {
      id: 'notif-2',
      title: 'Perfil casi completo',
      message: 'Te falta sólo la validación documental para mostrar todo el respaldo disponible.',
      type: 'success',
      createdAt: '2026-04-05T09:00:00.000Z',
      unread: false,
    },
  ];

  const availabilityByPropertyId: DemoStore['availabilityByPropertyId'] = {
    '1': [
      { start: '2026-05-12', end: '2026-05-16', source: 'booking' },
      { start: '2026-05-23', end: '2026-05-25', source: 'manual' },
    ],
    '4': [
      { start: '2026-05-28', end: '2026-06-01', source: 'booking' },
    ],
    '5': [
      { start: '2026-06-15', end: '2026-06-18', source: 'manual' },
    ],
  };

  return {
    user,
    properties,
    favorites: ['1', '2'],
    notifications,
    validationData,
    activity,
    reviews,
    preferences,
    guestBookings,
    hostBookings,
    conversations,
    messagesByConversationId,
    availabilityByPropertyId,
    hostProfiles,
    propertyReviews,
  };
};

let store = createDemoStore();

export type DemoAuditSnapshot = ReturnType<typeof createDemoStore>;

export const getDemoAuditSnapshot = (): DemoAuditSnapshot => cloneValue(createDemoStore());

export const getDemoPropertyDetailSnapshot = (propertyId: string) => {
  const snapshot = createDemoStore();
  const property = snapshot.properties.find((entry) => entry.id === propertyId) ?? null;

  return property ? buildPropertyDetail(property) : null;
};

const getUrl = (endpoint: string) => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return new URL(endpoint);
  }

  const origin = typeof window === 'undefined' ? 'http://demo.local' : window.location.origin;
  return new URL(endpoint, origin);
};

const getManagedProperties = () => store.properties.filter((property) => property.hostId === DEMO_USER_ID);

const getPublicProperties = () => store.properties.filter((property) => property.status === 'active');

const getFavoriteProperties = () => store.favorites
  .map((propertyId) => getPropertyById(propertyId))
  .filter((property): property is DemoManagedProperty => property !== null);

const getPropertyById = (propertyId?: string | null) => store.properties.find((property) => property.id === propertyId) ?? null;

const getBookingById = (bookingId?: string | null) => (
  [...store.guestBookings, ...store.hostBookings].find((booking) => booking.id === bookingId) ?? null
);

const getConversationById = (conversationId?: string | null) => (
  store.conversations.find((conversation) => conversation.id === conversationId) ?? null
);

const updateConversationFromBooking = (booking: DemoBooking) => {
  const conversation = getConversationById(booking.conversationId);

  if (!conversation) {
    return;
  }

  conversation.bookingStatus = booking.status;
  conversation.depositType = booking.depositType;
  conversation.depositStatus = booking.depositStatus;
  conversation.startDate = booking.startDate;
  conversation.endDate = booking.endDate;
  conversation.guests = booking.guests;
  conversation.totalPrice = booking.totalPrice;
  conversation.updated_at = new Date().toISOString();
};

const appendSystemMessage = (conversationId: string, content: string) => {
  const conversation = getConversationById(conversationId);
  if (!conversation) {
    return;
  }

  const nextMessage: DemoMessage = {
    id: `msg-${conversationId}-${Date.now()}`,
    conversation_id: conversationId,
    sender_id: 'system',
    sender_name: 'Sistema',
    content,
    created_at: new Date().toISOString(),
    kind: 'system',
  };

  store.messagesByConversationId[conversationId] = [...(store.messagesByConversationId[conversationId] ?? []), nextMessage];
  conversation.last_message = content;
  conversation.updated_at = nextMessage.created_at;
};

const buildPropertyDetail = (property: DemoManagedProperty) => ({
  ...cloneValue(property),
  images: Array.isArray(property.images) && property.images.length > 0 ? property.images : [property.imageUrl],
  amenities: ['Wifi', 'Parrilla', 'Patio', 'Cochera', 'Aire acondicionado'],
  host: {
    name: property.hostName,
    bio: property.hostId === DEMO_USER_ID
      ? 'Anfitriona con historial consistente y respuesta rápida.'
      : 'Anfitrión con actividad consistente y buena comunicación.',
  },
});

const buildAvailability = (propertyId: string) => {
  const availability = store.availabilityByPropertyId[propertyId] ?? [];
  return availability.map((entry) => ({ ...entry }));
};

const buildHostDashboardData = () => ({
  properties: cloneValue(getManagedProperties()),
  recentBookings: cloneValue(store.hostBookings),
});

const buildPropertySearchResults = (searchParams: URLSearchParams) => {
  const normalizedLocation = normalizeText(searchParams.get('location') || searchParams.get('query') || searchParams.get('search'));
  const normalizedType = normalizeText(searchParams.get('propertyType') || searchParams.get('type'));
  const minPrice = Number(searchParams.get('minPrice') || searchParams.get('priceMin') || 0);
  const maxPrice = Number(searchParams.get('maxPrice') || searchParams.get('priceMax') || Number.MAX_SAFE_INTEGER);
  const guests = Number(searchParams.get('guests') || searchParams.get('maxGuests') || 0);
  const verifiedOnly = ['true', '1', 'yes'].includes(normalizeText(searchParams.get('verifiedOnly') || searchParams.get('verified')));

  return getPublicProperties().filter((property) => {
    if (normalizedLocation) {
      const haystack = `${property.location} ${(property as { zone?: string }).zone ?? ''} ${property.title}`.toLowerCase();
      if (!haystack.includes(normalizedLocation)) {
        return false;
      }
    }

    if (normalizedType && normalizeText(property.propertyType) !== normalizedType) {
      return false;
    }

    if (Number.isFinite(minPrice) && property.price < minPrice) {
      return false;
    }

    if (Number.isFinite(maxPrice) && property.price > maxPrice) {
      return false;
    }

    if (Number.isFinite(guests) && guests > 0 && (property.maxGuests ?? 0) < guests) {
      return false;
    }

    if (verifiedOnly && !property.isPresentiallyVerified) {
      return false;
    }

    return true;
  });
};

const addNotification = (title: string, message: string, type: DemoNotification['type'] = 'info') => {
  store.notifications = [
    {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      createdAt: new Date().toISOString(),
      unread: true,
    },
    ...store.notifications,
  ];
};

const markNotificationsAsRead = () => {
  store.notifications = store.notifications.map((notification) => ({
    ...notification,
    unread: false,
  }));
};

const updateValidationAfterDocumentaryCompletion = () => {
  const currentChecks = store.validationData.checks;

  store.validationData = {
    ...store.validationData,
    progress: 100,
    level: 'COMPLETO',
    levelNumber: 5,
    levelLabel: '5 de 5 señales visibles',
    shortLabel: '5/5',
    nextLevel: null,
    verificationScore: 5,
    summary: 'Tu cuenta ya muestra todo el respaldo visible disponible dentro de la plataforma.',
    nextStep: 'No hace falta sumar nada más para mostrar las validaciones disponibles.',
    optionalUpgrade: null,
    missingRequirements: [],
    checks: {
      emailVerified: Boolean(currentChecks?.emailVerified),
      phoneVerified: Boolean(currentChecks?.phoneVerified),
      profileComplete: Boolean(currentChecks?.profileComplete),
      platformActivity: Boolean(currentChecks?.platformActivity),
      historyVerified: Boolean(currentChecks?.historyVerified),
      reviewsVerified: Boolean(currentChecks?.reviewsVerified),
      documentarySubmitted: true,
      documentaryVerified: true,
    },
    verificationSummary: {
      ...store.validationData.verificationSummary,
      score: 5,
      maxScore: 5,
      items: (store.validationData.verificationSummary?.items ?? []).map((item) => (
        item.key === 'documentary'
          ? { ...item, status: 'complete' as const }
          : item
      )),
    },
    premiumDocumentaryOffer: store.validationData.premiumDocumentaryOffer
      ? {
          ...store.validationData.premiumDocumentaryOffer,
          purchased: true,
          completed: true,
          ctaLabel: 'Revisar validación documental',
        }
      : null,
  };

  addNotification('Validación documental activa', 'La cuenta ya muestra la validación documental adicional.', 'success');
};

const updatePropertyAfterOnsiteCompletion = (propertyId: string, appointmentDate: string) => {
  store.properties = store.properties.map((property) => {
    if (property.id !== propertyId) {
      return property;
    }

    const offer = property.premiumOnsiteOffer as PremiumVerificationOffer | null;

    return {
      ...property,
      locationVerified: true,
      propertyRelationshipVerified: true,
      hasPresencialVerification: true,
      availabilityValidated: true,
      isVerifiedProperty: true,
      onsiteVerifiedAt: new Date().toISOString(),
      status: 'active',
      premiumOnsiteOffer: offer
        ? {
            ...offer,
            purchased: true,
            completed: true,
            ctaLabel: 'Revisar validación presencial',
          }
        : offer,
    };
  });

  addNotification('Validación presencial confirmada', `La revisión presencial de la propiedad quedó agendada para ${appointmentDate}.`, 'success');
};

const updateManagedProperty = (propertyId: string, updates: Partial<DemoManagedProperty>) => {
  store.properties = store.properties.map((property) => (
    property.id === propertyId ? { ...property, ...updates } : property
  ));
};

const updateBooking = (bookingId: string, updates: Partial<DemoBooking>) => {
  let nextBooking: DemoBooking | null = null;

  store.guestBookings = store.guestBookings.map((booking) => {
    if (booking.id !== bookingId) {
      return booking;
    }

    nextBooking = { ...booking, ...updates };
    return nextBooking;
  });

  store.hostBookings = store.hostBookings.map((booking) => {
    if (booking.id !== bookingId) {
      return booking;
    }

    nextBooking = { ...booking, ...updates };
    return nextBooking;
  });

  if (nextBooking) {
    updateConversationFromBooking(nextBooking);
  }

  return nextBooking;
};

const updateConversation = (conversationId: string, updates: Partial<DemoConversation>) => {
  let nextConversation: DemoConversation | null = null;

  store.conversations = store.conversations.map((conversation) => {
    if (conversation.id !== conversationId) {
      return conversation;
    }

    nextConversation = {
      ...conversation,
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    };

    return nextConversation;
  });

  return nextConversation;
};

const handlePropertyCreate = (body: Record<string, unknown>) => {
  const propertyId = `demo-property-${Date.now()}`;
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Nueva propiedad';
  const location = typeof body.location === 'string' && body.location.trim() ? body.location.trim() : 'Costa Atlántica';
  const price = Number(body.price || body.monthlyPrice || 65000);
  const propertyType = typeof body.propertyType === 'string' && body.propertyType.trim() ? body.propertyType.trim() : 'Casa';
  const description = typeof body.description === 'string' && body.description.trim()
    ? body.description.trim()
    : 'Propiedad creada desde el panel para continuar completando datos y validaciones.';
  const images = Array.isArray(body.images)
    ? body.images.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];

  const nextProperty: DemoManagedProperty = {
    ...cloneValue(store.properties[0]),
    id: propertyId,
    title,
    location,
    propertyType,
    price: Number.isFinite(price) && price > 0 ? Math.round(price) : 65000,
    description,
    imageUrl: images[0] || PLACEHOLDER_PROPERTY_IMAGE,
    images: images.length > 0 ? images : [PLACEHOLDER_PROPERTY_IMAGE],
    hostId: DEMO_USER_ID,
    hostName: store.user.name,
    isOwnedByViewer: true,
    identityValidated: true,
    locationVerified: false,
    propertyRelationshipVerified: false,
    hasPresencialVerification: false,
    availabilityValidated: true,
    status: 'active',
    pendingRequestsCount: 0,
    activeReservationsCount: 0,
    nextArrivalDate: null,
    premiumOnsiteOffer: {
      offerType: PREMIUM_ONSITE_OFFER_TYPE,
      targetType: 'property',
      title: 'Validación presencial del aviso',
      summary: 'Podés sumar una revisión presencial opcional para mostrar más contexto visible en la ficha.',
      contextHint: 'La revisión se coordina después de publicar, desde el mismo flujo del panel.',
      visibilityHint: 'Se muestra una validación presencial adicional en el aviso.',
      ctaLabel: 'Activar revisión presencial',
      checkoutLabel: 'Confirmar validación',
      processLabel: 'Ir a la revisión',
      priceArs: 18000,
      currency: PREMIUM_VERIFICATION_CURRENCY,
      isComplimentary: false,
      complimentaryReason: null,
      purchased: false,
      completed: false,
      redirectTo: withDemoQuery(`/verification?mode=onsite&propertyId=${propertyId}&propertyTitle=${encodeURIComponent(title)}&returnTo=/host-dashboard`, '?demo=true'),
      propertyId,
      propertyTitle: title,
    },
  };

  store.properties = [nextProperty, ...store.properties];
  store.availabilityByPropertyId[propertyId] = [];
  addNotification('Propiedad publicada', `${title} quedó creada dentro del panel.`, 'success');

  return jsonResponse({ id: propertyId }, 201);
};

const handleBookingCreate = (body: Record<string, unknown>) => {
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId : null;
  const property = getPropertyById(propertyId);

  if (!property) {
    return errorResponse('No encontramos la propiedad para esta reserva.', 404);
  }

  const startDate = typeof body.startDate === 'string' ? body.startDate : null;
  const endDate = typeof body.endDate === 'string' ? body.endDate : null;
  const guests = Number(body.guests || 1);
  const requestMode = body.requestMode === 'protected' ? 'protected' : 'direct';

  if (!startDate || !endDate) {
    return errorResponse('Elegí un rango de fechas para seguir.', 400);
  }

  const hasConflict = buildAvailability(property.id).some((entry) => isRangeOverlapping(startDate, endDate, entry.start, entry.end));

  if (hasConflict) {
    return errorResponse('Las fechas elegidas ya no están disponibles.', 409);
  }

  const nights = getNightCount(startDate, endDate);
  const totalPrice = Math.round(property.price * nights);
  const bookingId = `booking-demo-${Date.now()}`;
  const conversationId = `conv-demo-${Date.now()}`;
  const protectedDepositPricing = requestMode === 'protected'
    ? getProtectedDepositPricing({
        nights,
        nightlyPrice: property.price,
        totalPrice,
      })
    : null;

  const booking: DemoBooking = {
    id: bookingId,
    conversationId,
    propertyId: property.id,
    propertyTitle: property.title,
    imageUrl: property.imageUrl,
    location: property.location,
    userId: DEMO_USER_ID,
    userName: store.user.name,
    hostId: property.hostId || 'demo-host-unknown',
    hostName: property.hostName || 'Anfitrión',
    startDate,
    endDate,
    date: startDate,
    guests: Number.isFinite(guests) && guests > 0 ? guests : 1,
    totalPrice,
    status: requestMode === 'protected' ? 'pending' : 'confirmed',
    requestMode,
    depositType: requestMode === 'protected' ? 'protected' : 'external',
    depositStatus: requestMode === 'protected' ? 'checkout_pending' : 'external_pending',
    protectedDepositPricing,
    contractAccepted: true,
    cancellationActor: null,
  };

  const conversation: DemoConversation = {
    id: conversationId,
    booking_id: bookingId,
    property_id: property.id,
    propertyTitle: property.title,
    propertyImageUrl: property.imageUrl,
    tenant_id: DEMO_USER_ID,
    tenantName: store.user.name,
    host_id: property.hostId || 'demo-host-unknown',
    hostName: property.hostName || 'Anfitrión',
    requestMode,
    requestStatus: requestMode === 'protected' ? 'pending' : 'accepted',
    bookingStatus: booking.status,
    depositType: booking.depositType,
    depositStatus: booking.depositStatus,
    startDate,
    endDate,
    guests: booking.guests,
    totalPrice,
    last_message: requestMode === 'protected'
      ? 'Tu solicitud quedó creada. Podés seguirla desde el chat real.'
      : 'La solicitud quedó coordinada. Podés seguir hablando por el chat real.',
    unread_count: 0,
    updated_at: new Date().toISOString(),
  };

  store.guestBookings = [booking, ...store.guestBookings];
  store.conversations = [conversation, ...store.conversations];
  store.messagesByConversationId[conversationId] = [
    {
      id: `msg-${conversationId}-1`,
      conversation_id: conversationId,
      sender_id: 'system',
      sender_name: 'Sistema',
      content: requestMode === 'protected'
        ? 'La reserva quedó creada con seña protegida. Desde este chat podés seguir el flujo.'
        : 'La reserva quedó creada. Desde este chat podés seguir la conversación.',
      created_at: new Date().toISOString(),
      kind: 'system',
    },
  ];

  if (property.hostId === DEMO_USER_ID) {
    store.hostBookings = [booking, ...store.hostBookings];
    updateManagedProperty(property.id, {
      pendingRequestsCount: requestMode === 'protected' ? property.pendingRequestsCount + 1 : property.pendingRequestsCount,
      activeReservationsCount: requestMode === 'protected' ? property.activeReservationsCount : property.activeReservationsCount + 1,
      nextArrivalDate: property.nextArrivalDate || startDate,
    });
  }

  store.availabilityByPropertyId[property.id] = [
    ...(store.availabilityByPropertyId[property.id] ?? []),
    { start: startDate, end: endDate, source: 'booking' },
  ];

  addNotification('Nueva reserva', `La solicitud para ${property.title} quedó creada y podés seguirla desde el chat.`, 'success');

  return jsonResponse({
    booking: cloneValue(booking),
    contract: {
      accepted: true,
      acceptedAt: new Date().toISOString(),
    },
    pricing: {
      totalPrice,
      nights,
      nightlyPrice: property.price,
      protectedDepositPricing,
    },
  }, 201);
};

const handleConversationCreate = (body: Record<string, unknown>) => {
  const bookingId = typeof body.bookingId === 'string' ? body.bookingId : null;
  const existingBooking = getBookingById(bookingId);

  if (existingBooking?.conversationId) {
    const existingConversation = getConversationById(existingBooking.conversationId);
    if (existingConversation) {
      return jsonResponse(cloneValue(existingConversation));
    }
  }

  if (!existingBooking) {
    return errorResponse('No encontramos la reserva para abrir el chat.', 404);
  }

  const conversationId = `conv-demo-${Date.now()}`;
  const nextConversation: DemoConversation = {
    id: conversationId,
    booking_id: existingBooking.id,
    property_id: existingBooking.propertyId,
    propertyTitle: existingBooking.propertyTitle,
    propertyImageUrl: existingBooking.imageUrl,
    tenant_id: existingBooking.userId,
    tenantName: existingBooking.userName,
    host_id: existingBooking.hostId,
    hostName: existingBooking.hostName,
    requestMode: existingBooking.requestMode,
    requestStatus: existingBooking.requestMode === 'protected' ? 'pending' : 'accepted',
    bookingStatus: existingBooking.status,
    depositType: existingBooking.depositType,
    depositStatus: existingBooking.depositStatus,
    startDate: existingBooking.startDate,
    endDate: existingBooking.endDate,
    guests: existingBooking.guests,
    totalPrice: existingBooking.totalPrice,
    last_message: 'La conversación quedó lista.',
    unread_count: 0,
    updated_at: new Date().toISOString(),
  };

  store.conversations = [nextConversation, ...store.conversations];
  store.messagesByConversationId[conversationId] = [
    {
      id: `msg-${conversationId}-1`,
      conversation_id: conversationId,
      sender_id: 'system',
      sender_name: 'Sistema',
      content: 'Abriste una conversación dentro del chat.',
      created_at: nextConversation.updated_at,
      kind: 'system',
    },
  ];

  updateBooking(existingBooking.id, { conversationId });

  return jsonResponse(cloneValue(nextConversation), 201);
};

const buildProtectedCheckoutUrl = (booking: DemoBooking) => {
  const path = booking.conversationId
    ? `/chat/${booking.conversationId}`
    : '/chat';

  return withDemoQuery(`${path}?depositCheckout=success&bookingId=${booking.id}&payment_id=demo-payment-${booking.id}`, '?demo=true');
};

export const getMockApiResponse = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<Response | null> => {
  const url = getUrl(endpoint);
  const path = url.pathname;
  const method = (options.method || 'GET').toUpperCase();
  const body = parseJsonBody(options.body);

  if (!path.startsWith('/api/')) {
    return null;
  }

  if (path === '/api/funnel/events') {
    return emptyResponse();
  }

  if (path === '/api/auth/me' && method === 'GET') {
    return jsonResponse({ user: cloneValue(store.user) });
  }

  if ((path === '/api/auth/login' || path === '/api/auth/register') && method === 'POST') {
    const name = typeof body.name === 'string' ? body.name : typeof body.fullName === 'string' ? body.fullName : store.user.name;
    const email = typeof body.email === 'string' ? body.email : store.user.email;
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone : store.user.phone;

    store.user = {
      ...store.user,
      name,
      email,
      phone,
    };

    return jsonResponse({ user: cloneValue(store.user) });
  }

  if (path === '/api/auth/context' && method === 'PUT') {
    const mode = body.mode === 'host' ? 'host' : 'guest';
    store.user = { ...store.user, activeMode: mode };
    return jsonResponse({ user: cloneValue(store.user) });
  }

  if (path === '/api/auth/profile' && method === 'PUT') {
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((value): value is string => typeof value === 'string')
      : store.user.interests;

    store.user = {
      ...store.user,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : store.user.name,
      phone: typeof body.phone === 'string' ? body.phone : store.user.phone,
      zone: typeof body.zone === 'string' && body.zone.trim() ? body.zone.trim() : store.user.zone,
      bio: typeof body.bio === 'string' ? body.bio : store.user.bio,
      interests,
    };

    return jsonResponse({ user: cloneValue(store.user) });
  }

  if (path === '/api/auth/change-password' && method === 'POST') {
    return jsonResponse({ ok: true });
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    return jsonResponse({ ok: true });
  }

  if (path === '/api/notifications' && method === 'GET') {
    return jsonResponse(cloneValue(store.notifications));
  }

  if (path === '/api/notifications/read-all' && method === 'POST') {
    markNotificationsAsRead();
    return jsonResponse({ ok: true });
  }

  if (path === '/api/favorites' && method === 'GET') {
    return jsonResponse(cloneValue(getFavoriteProperties()));
  }

  if (path === '/api/favorites' && method === 'DELETE') {
    store.favorites = [];
    return jsonResponse({ ok: true });
  }

  const favoriteMatch = path.match(/^\/api\/favorites\/([^/]+)$/);
  if (favoriteMatch && method === 'POST') {
    const propertyId = decodeURIComponent(favoriteMatch[1]);
    if (!store.favorites.includes(propertyId)) {
      store.favorites = [propertyId, ...store.favorites];
    }
    return jsonResponse({ ok: true });
  }

  if (favoriteMatch && method === 'DELETE') {
    const propertyId = decodeURIComponent(favoriteMatch[1]);
    store.favorites = store.favorites.filter((id) => id !== propertyId);
    return jsonResponse({ ok: true });
  }

  if (path === '/api/properties' && method === 'GET') {
    return jsonResponse(cloneValue(buildPropertySearchResults(url.searchParams)));
  }

  if (path === '/api/properties' && method === 'POST') {
    return handlePropertyCreate(body);
  }

  const propertyReviewsMatch = path.match(/^\/api\/properties\/([^/]+)\/reviews$/);
  if (propertyReviewsMatch && method === 'GET') {
    const propertyId = decodeURIComponent(propertyReviewsMatch[1]);
    return jsonResponse(cloneValue(store.propertyReviews[propertyId] ?? []));
  }

  const propertyAvailabilityMatch = path.match(/^\/api\/properties\/([^/]+)\/availability$/);
  if (propertyAvailabilityMatch && method === 'GET') {
    const propertyId = decodeURIComponent(propertyAvailabilityMatch[1]);
    return jsonResponse(buildAvailability(propertyId));
  }

  if (propertyAvailabilityMatch && method === 'PUT') {
    const propertyId = decodeURIComponent(propertyAvailabilityMatch[1]);
    const nextManualBlocks = Array.isArray(body.manualBlocks)
      ? body.manualBlocks.filter((entry): entry is { start: string; end: string } => (
          typeof entry === 'object'
          && entry !== null
          && typeof (entry as { start?: string }).start === 'string'
          && typeof (entry as { end?: string }).end === 'string'
        ))
      : [];

    const bookingEntries = (store.availabilityByPropertyId[propertyId] ?? []).filter((entry) => entry.source === 'booking');
    store.availabilityByPropertyId[propertyId] = [
      ...bookingEntries,
      ...nextManualBlocks.map((entry) => ({ ...entry, source: 'manual' as const })),
    ];

    return jsonResponse({ manualBlocks: cloneValue(nextManualBlocks) });
  }

  const propertyMatch = path.match(/^\/api\/properties\/([^/]+)$/);
  if (propertyMatch && method === 'GET') {
    const propertyId = decodeURIComponent(propertyMatch[1]);
    const property = getPropertyById(propertyId);

    if (!property) {
      return errorResponse('No encontramos esta propiedad.', 404);
    }

    return jsonResponse(buildPropertyDetail(property));
  }

  if (propertyMatch && method === 'PUT') {
    const propertyId = decodeURIComponent(propertyMatch[1]);
    const property = getPropertyById(propertyId);

    if (!property) {
      return errorResponse('No encontramos esta propiedad.', 404);
    }

    const nextStatus = body.status === 'inactive' ? 'inactive' : body.status === 'active' ? 'active' : property.status;
    const nextProperty = { ...property, ...body, status: nextStatus } as DemoManagedProperty;
    updateManagedProperty(propertyId, nextProperty);

    return jsonResponse(cloneValue(nextProperty));
  }

  if (path === '/api/verification/status' && method === 'GET') {
    return jsonResponse(cloneValue(store.validationData));
  }

  if (path === '/api/verification/confirm-contact' && method === 'POST') {
    const field = body.field === 'phone' ? 'phone' : 'email';
    const currentChecks = store.validationData.checks;

    store.validationData = {
      ...store.validationData,
      checks: {
        emailVerified: field === 'email' ? true : Boolean(currentChecks?.emailVerified),
        phoneVerified: field === 'phone' ? true : Boolean(currentChecks?.phoneVerified),
        profileComplete: Boolean(currentChecks?.profileComplete),
        platformActivity: Boolean(currentChecks?.platformActivity),
        historyVerified: Boolean(currentChecks?.historyVerified),
        reviewsVerified: Boolean(currentChecks?.reviewsVerified),
        documentarySubmitted: Boolean(currentChecks?.documentarySubmitted),
        documentaryVerified: Boolean(currentChecks?.documentaryVerified),
      },
    };

    addNotification('Dato confirmado', field === 'email' ? 'El email quedó confirmado.' : 'El teléfono quedó confirmado.', 'success');

    return jsonResponse({ ok: true });
  }

  if (path === '/api/verification/premium-checkout' && method === 'POST') {
    const offerType = body.offerType === PREMIUM_ONSITE_OFFER_TYPE ? PREMIUM_ONSITE_OFFER_TYPE : PREMIUM_DOCUMENTARY_OFFER_TYPE;

    if (offerType === PREMIUM_ONSITE_OFFER_TYPE) {
      const propertyId = typeof body.propertyId === 'string' ? body.propertyId : null;
      const property = getPropertyById(propertyId);
      const redirectTo = property?.premiumOnsiteOffer?.redirectTo || withDemoQuery('/verification?mode=onsite&returnTo=/host-dashboard', '?demo=true');
      return jsonResponse({ redirectTo });
    }

    return jsonResponse({
      redirectTo: store.validationData.premiumDocumentaryOffer?.redirectTo || withDemoQuery(`/verification?mode=documentary&orderId=${DEMO_ORDER_ID}&returnTo=/profile`, '?demo=true'),
    });
  }

  if (path === '/api/verification/validate-id' && method === 'POST') {
    return jsonResponse({ ok: true, validated: true });
  }

  if (path === '/api/verification/complete' && method === 'POST') {
    updateValidationAfterDocumentaryCompletion();
    return jsonResponse({ ok: true });
  }

  if (path === '/api/verification/onsite/complete' && method === 'POST') {
    const propertyId = typeof body.propertyId === 'string' ? body.propertyId : null;
    const appointmentDate = typeof body.appointmentDate === 'string' ? body.appointmentDate : 'la próxima visita disponible';

    if (!propertyId) {
      return errorResponse('Falta la propiedad a validar.', 400);
    }

    updatePropertyAfterOnsiteCompletion(propertyId, appointmentDate);
    return jsonResponse({ ok: true });
  }

  if (path === '/api/users/activity' && method === 'GET') {
    return jsonResponse(cloneValue(store.activity));
  }

  if (path === '/api/users/reviews' && method === 'GET') {
    return jsonResponse(cloneValue(store.reviews));
  }

  if (path === '/api/users/preferences' && method === 'GET') {
    return jsonResponse(cloneValue(store.preferences));
  }

  if (path === '/api/users/preferences' && method === 'PUT') {
    store.preferences = {
      ...store.preferences,
      preferred_zone: typeof body.preferred_zone === 'string' ? body.preferred_zone : store.preferences.preferred_zone,
      max_price: Number.isFinite(Number(body.max_price)) ? Number(body.max_price) : store.preferences.max_price,
      preferred_property_type: typeof body.preferred_property_type === 'string'
        ? body.preferred_property_type
        : store.preferences.preferred_property_type,
    };

    return jsonResponse(cloneValue(store.preferences));
  }

  if (path === '/api/host/dashboard' && method === 'GET') {
    return jsonResponse(buildHostDashboardData());
  }

  const hostProfileMatch = path.match(/^\/api\/hosts\/([^/]+)$/);
  if (hostProfileMatch && method === 'GET') {
    const hostId = decodeURIComponent(hostProfileMatch[1]);
    const profile = store.hostProfiles[hostId];

    if (!profile) {
      return errorResponse('No encontramos este perfil.', 404);
    }

    return jsonResponse(cloneValue(profile));
  }

  if (path === '/api/bookings' && method === 'GET') {
    return jsonResponse(cloneValue(store.guestBookings));
  }

  if (path === '/api/bookings/all' && method === 'GET') {
    return jsonResponse(cloneValue(store.guestBookings));
  }

  if (path === '/api/bookings' && method === 'POST') {
    return handleBookingCreate(body);
  }

  const bookingActionMatch = path.match(/^\/api\/bookings\/([^/]+)\/([^/]+)$/);
  if (bookingActionMatch && method === 'POST') {
    const bookingId = decodeURIComponent(bookingActionMatch[1]);
    const action = bookingActionMatch[2];
    const booking = getBookingById(bookingId);

    if (!booking) {
      return errorResponse('No encontramos la reserva.', 404);
    }

    if (action === 'select-external-deposit') {
      const nextBooking = updateBooking(bookingId, {
        depositType: 'external',
        depositStatus: 'external_pending',
        status: booking.status === 'cancelled' ? booking.status : 'confirmed',
      });

      return jsonResponse({ booking: cloneValue(nextBooking) });
    }

    if (action === 'select-protected-deposit') {
      const pricing = booking.protectedDepositPricing || getProtectedDepositPricing({
        nights: getNightCount(booking.startDate, booking.endDate),
        nightlyPrice: booking.totalPrice / getNightCount(booking.startDate, booking.endDate),
        totalPrice: booking.totalPrice,
      });

      const nextBooking = updateBooking(bookingId, {
        requestMode: 'protected',
        depositType: 'protected',
        depositStatus: 'checkout_pending',
        protectedDepositPricing: pricing,
        status: 'pending',
      });

      return jsonResponse({ booking: cloneValue(nextBooking) });
    }

    if (action === 'pay-deposit') {
      const nextBooking = updateBooking(bookingId, {
        depositType: 'protected',
        depositStatus: 'checkout_pending',
        status: 'pending',
      });

      return jsonResponse({
        booking: cloneValue(nextBooking),
        checkoutUrl: buildProtectedCheckoutUrl(nextBooking || booking),
        preferenceId: `demo-pref-${bookingId}`,
      });
    }

    if (action === 'confirm-deposit-payment') {
      const nextBooking = updateBooking(bookingId, {
        depositType: 'protected',
        depositStatus: 'held',
        status: 'confirmed',
      });

      appendSystemMessage(booking.conversationId || '', 'La seña protegida quedó confirmada.');
      return jsonResponse({ booking: cloneValue(nextBooking), confirmed: true, paymentStatus: 'approved' });
    }

    if (action === 'confirm-arrival') {
      const nextBooking = updateBooking(bookingId, {
        status: 'completed',
        depositStatus: booking.depositType === 'protected' ? 'released' : booking.depositStatus,
      });

      appendSystemMessage(booking.conversationId || '', 'La llegada quedó confirmada.');
      return jsonResponse({ booking: cloneValue(nextBooking) });
    }

    if (action === 'report-arrival-problem') {
      const nextBooking = updateBooking(bookingId, {
        depositStatus: booking.depositType === 'protected' ? 'review' : booking.depositStatus,
      });

      appendSystemMessage(booking.conversationId || '', 'Se registró un problema de llegada para revisión.');
      return jsonResponse({ booking: cloneValue(nextBooking) });
    }

    if (action === 'report-no-show') {
      const nextBooking = updateBooking(bookingId, {
        depositStatus: booking.depositType === 'protected' ? 'pending_confirmation' : booking.depositStatus,
      });

      appendSystemMessage(booking.conversationId || '', 'Se marcó un no show.');
      return jsonResponse({ booking: cloneValue(nextBooking) });
    }

    if (action === 'cancel-as-host') {
      const nextBooking = updateBooking(bookingId, {
        status: 'cancelled',
        cancellationActor: 'host',
      });

      appendSystemMessage(booking.conversationId || '', 'La reserva fue cancelada por el anfitrión.');
      return jsonResponse({ booking: cloneValue(nextBooking) });
    }

    if (action === 'cancel') {
      const nextBooking = updateBooking(bookingId, {
        status: 'cancelled',
        cancellationActor: 'guest',
      });

      appendSystemMessage(booking.conversationId || '', 'La reserva fue cancelada por el huésped.');
      return jsonResponse({ booking: cloneValue(nextBooking) });
    }

    if (action === 'accept-contract') {
      const nextBooking = updateBooking(bookingId, {
        contractAccepted: true,
      });

      return jsonResponse({ booking: cloneValue(nextBooking) });
    }
  }

  if (path === '/api/conversations' && method === 'GET') {
    const ordered = [...store.conversations].sort((left, right) => (
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    ));

    return jsonResponse(cloneValue(ordered));
  }

  if (path === '/api/conversations' && method === 'POST') {
    return handleConversationCreate(body);
  }

  const conversationMessagesMatch = path.match(/^\/api\/conversations\/([^/]+)\/messages$/);
  if (conversationMessagesMatch && method === 'GET') {
    const conversationId = decodeURIComponent(conversationMessagesMatch[1]);
    return jsonResponse(cloneValue(store.messagesByConversationId[conversationId] ?? []));
  }

  const conversationActionMatch = path.match(/^\/api\/conversations\/([^/]+)\/([^/]+)$/);
  if (conversationActionMatch && method === 'POST') {
    const conversationId = decodeURIComponent(conversationActionMatch[1]);
    const action = conversationActionMatch[2];
    const conversation = getConversationById(conversationId);

    if (!conversation) {
      return errorResponse('No encontramos esta conversación.', 404);
    }

    const booking = conversation.booking_id ? getBookingById(conversation.booking_id) : null;

    if (action === 'accept-request') {
      const nextConversation = updateConversation(conversationId, {
        requestStatus: 'accepted',
        bookingStatus: 'confirmed',
        depositStatus: conversation.requestMode === 'protected' ? 'checkout_pending' : 'external_pending',
      });

      if (booking) {
        updateBooking(booking.id, {
          status: 'confirmed',
          depositStatus: conversation.requestMode === 'protected' ? 'checkout_pending' : 'external_pending',
        });
      }

      appendSystemMessage(conversationId, 'La solicitud fue aceptada.');
      return jsonResponse(cloneValue(nextConversation));
    }

    if (action === 'not-advance-request') {
      const nextConversation = updateConversation(conversationId, {
        requestStatus: 'not_advanced',
        bookingStatus: 'cancelled',
      });

      if (booking) {
        updateBooking(booking.id, {
          status: 'cancelled',
          cancellationActor: 'host',
        });
      }

      appendSystemMessage(conversationId, 'La solicitud no avanzó.');
      return jsonResponse(cloneValue(nextConversation));
    }

    if (action === 'report-direct-deposit') {
      const nextConversation = updateConversation(conversationId, {
        depositType: 'external',
        depositStatus: 'reported',
      });

      if (booking) {
        updateBooking(booking.id, {
          depositType: 'external',
          depositStatus: 'reported',
        });
      }

      appendSystemMessage(conversationId, 'Se marcó un comprobante de seña directa para revisar.');
      return jsonResponse(cloneValue(nextConversation));
    }

    if (action === 'confirm-direct-deposit') {
      const nextConversation = updateConversation(conversationId, {
        depositType: 'external',
        depositStatus: 'confirmed',
        bookingStatus: 'confirmed',
      });

      if (booking) {
        updateBooking(booking.id, {
          status: 'confirmed',
          depositType: 'external',
          depositStatus: 'confirmed',
        });
      }

      appendSystemMessage(conversationId, 'La seña directa quedó confirmada.');
      return jsonResponse(cloneValue(nextConversation));
    }
  }

  if (path === '/api/messages' && method === 'POST') {
    const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : null;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!conversationId || !content) {
      return errorResponse('No pudimos enviar este mensaje.', 400);
    }

    const conversation = getConversationById(conversationId);

    if (!conversation) {
      return errorResponse('No encontramos la conversación.', 404);
    }

    const nextMessage: DemoMessage = {
      id: `msg-${conversationId}-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: DEMO_USER_ID,
      sender_name: store.user.name,
      content,
      created_at: new Date().toISOString(),
    };

    store.messagesByConversationId[conversationId] = [...(store.messagesByConversationId[conversationId] ?? []), nextMessage];
    updateConversation(conversationId, {
      last_message: content,
      unread_count: 0,
    });

    return jsonResponse(cloneValue(nextMessage), 201);
  }

  if (path === '/api/chat/assistant' && method === 'POST') {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    return jsonResponse({
      text: prompt
        ? `Sobre "${prompt}", te conviene revisar primero disponibilidad, verificación visible y condiciones del aviso.`
        : 'Podés revisar disponibilidad, verificación visible y condiciones del aviso antes de avanzar.',
    });
  }

  if (path === '/api/chat/analyze' && method === 'POST') {
    return jsonResponse({
      isScam: false,
      reason: 'No hay señales de riesgo en esta conversación.',
      riskLevel: 'low',
    });
  }

  if (path === '/api/reports' && method === 'POST') {
    addNotification('Reporte recibido', 'Tu reporte quedó registrado correctamente.', 'success');
    return jsonResponse({ ok: true });
  }

  if (path === '/api/reviews' && method === 'POST') {
    return jsonResponse({ ok: true });
  }

  return errorResponse('No pudimos cargar esta información.', 404);
};

export const resetMockApiState = () => {
  store = createDemoStore();
};