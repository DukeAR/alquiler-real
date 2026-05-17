import { BOOKING_CONTRACT_PLATFORM_TERMS } from '../src/lib/platformTerms';

export const DEMO_PASSWORD = '123456';

export const DEMO_CREDENTIALS = {
  guest: {
    email: 'lucia@demo.com',
    password: DEMO_PASSWORD,
  },
  host: {
    email: 'valeria@demo.com',
    password: DEMO_PASSWORD,
  },
} as const;

type DemoUserRole = 'tenant' | 'host';
type DemoTraceabilityLevel = 'low' | 'medium' | 'high';
type DemoReviewType = 'host_to_guest' | 'guest_to_host';
type DemoBookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type DemoUser = {
  id: string;
  email: string;
  password: string;
  role: DemoUserRole;
  isInternalOperator?: boolean;
  name: string;
  zone: string;
  phone: string;
  bio: string;
  interests: string[];
  memberSince: string;
  createdAt: string;
  profilePhoto: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityValidated: boolean;
  identityVerificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  identityVerificationProvider?: string | null;
  identityVerifiedAt?: string | null;
  validationLevel: string;
  badge: string;
  trustScore: number;
  riskScore: number;
};

export type DemoUserPreference = {
  userId: string;
  preferredZone: string | null;
  maxPrice: number | null;
  preferredPropertyType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DemoUserActivity = {
  userId: string;
  lastLogin: string;
  totalBookings: number;
  totalReviewsWritten: number;
  updatedAt: string;
};

export type DemoProperty = {
  id: string;
  title: string;
  location: string;
  price: number;
  hostId: string;
  hostName: string;
  description: string;
  imageUrl: string;
  traceabilityLevel: DemoTraceabilityLevel;
  lat: number;
  lng: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: 'house' | 'apartment' | 'cabin';
  status: 'active' | 'inactive';
  isVerifiedProperty: boolean;
  identityValidated: boolean;
  locationVerified: boolean;
  materialVerified?: boolean;
  videoValidated: boolean;
  hasPresencialVerification: boolean;
  onsiteVerifiedAt?: string | null;
  hasDigitalVerification: boolean;
  createdAt: string;
  manualBlockedDates: Array<{ start: string; end: string }>;
};

export type DemoBooking = {
  id: string;
  propertyId: string;
  userId: string;
  status: DemoBookingStatus;
  startDate: string;
  endDate: string;
  totalPrice: number;
  guests: number;
  date: string;
  stayCode: string;
  verified: number;
  createdAt: string;
  contractAccepted: boolean;
  contractJson: string | null;
};

export type DemoReview = {
  id: string;
  bookingId: string;
  conversationId?: string;
  reviewerId: string;
  reviewedUserId: string;
  propertyId: string;
  rating: number;
  comment: string;
  type: DemoReviewType;
  categoryScores?: Array<{
    key: string;
    label: string;
    score: number;
  }>;
  agreementKept: boolean;
  wouldInteractAgain: boolean;
  hadIncident: boolean;
  photosMatchReality: boolean;
  pressureToBookFast: boolean;
  createdAt: string;
};

export type DemoConversation = {
  id: string;
  propertyId: string;
  bookingId?: string;
  tenantId: string;
  hostId: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isSystem: boolean;
  isSuspicious: boolean;
  createdAt: string;
};

export type DemoFavorite = {
  userId: string;
  propertyId: string;
  createdAt: string;
};

export type DemoSeedCatalog = {
  users: DemoUser[];
  userPreferences: DemoUserPreference[];
  userActivity: DemoUserActivity[];
  properties: DemoProperty[];
  bookings: DemoBooking[];
  reviews: DemoReview[];
  conversations: DemoConversation[];
  messages: DemoMessage[];
  favorites: DemoFavorite[];
};

const addDays = (baseDate: Date, days: number) => {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const setClock = (baseDate: Date, hours: number, minutes = 0) => {
  const nextDate = new Date(baseDate);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
};

const formatDateOnly = (baseDate: Date) => {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTimestamp = (baseDate: Date) => baseDate.toISOString();

const getNightCount = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
};

const buildContractJson = (guestName: string, hostName: string, propertyTitle: string, location: string, startDate: string, endDate: string, totalPrice: number) => JSON.stringify({
  guestName,
  hostName,
  propertyTitle,
  location,
  startDate,
  endDate,
  totalPrice,
  currency: 'ARS',
  rules: [
    'Respetar horarios de silencio entre las 22:00 y las 08:00.',
    'No fumar dentro de la propiedad.',
    'Avisar con tiempo si la llegada se demora para coordinar el check-in.',
  ],
  platformTerms: BOOKING_CONTRACT_PLATFORM_TERMS,
});

export const buildDemoData = (referenceDate = new Date()): DemoSeedCatalog => {
  const baseDate = new Date(referenceDate);
  baseDate.setHours(12, 0, 0, 0);

  const date = (offsetDays: number) => formatDateOnly(addDays(baseDate, offsetDays));
  const timestamp = (offsetDays: number, hours = 11, minutes = 0) => formatTimestamp(setClock(addDays(baseDate, offsetDays), hours, minutes));

  const users: DemoUser[] = [
    {
      id: 'demo_guest_lucia',
      email: 'lucia@demo.com',
      password: DEMO_PASSWORD,
      role: 'tenant',
      name: 'Lucia Ferreyra',
      zone: 'Caballito, CABA',
      phone: '+54 11 4520 7781',
      bio: 'Disenadora de producto. Suele viajar a La Costa para cortar la semana y prioriza alojamientos prolijos, silenciosos y con check-in claro.',
      interests: ['escapadas cortas', 'lugares tranquilos', 'cerca del mar'],
      memberSince: timestamp(-420, 10, 15),
      createdAt: timestamp(-420, 10, 15),
      profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      emailVerified: true,
      phoneVerified: true,
      identityValidated: true,
      validationLevel: 'advanced',
      badge: 'Perfil verificado',
      trustScore: 82,
      riskScore: 6,
    },
    {
      id: 'demo_guest_martin',
      email: 'martin@demo.com',
      password: DEMO_PASSWORD,
      role: 'tenant',
      name: 'Martin Aguirre',
      zone: 'Banfield, Buenos Aires',
      phone: '+54 11 6134 2408',
      bio: 'Profesor de educacion fisica. Viaja con su pareja y busca cochera, parrilla y respuestas rapidas antes de reservar.',
      interests: ['parrilla', 'cochera', 'viajes de fin de semana'],
      memberSince: timestamp(-510, 9, 20),
      createdAt: timestamp(-510, 9, 20),
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      emailVerified: true,
      phoneVerified: true,
      identityValidated: true,
      validationLevel: 'advanced',
      badge: 'Huesped confiable',
      trustScore: 78,
      riskScore: 4,
    },
    {
      id: 'demo_guest_rocio',
      email: 'rocio@demo.com',
      password: DEMO_PASSWORD,
      role: 'tenant',
      name: 'Rocio Navarro',
      zone: 'La Plata, Buenos Aires',
      phone: '+54 221 498 2214',
      bio: 'Trabaja remoto algunos dias y prioriza wifi estable, buena luz y barrios tranquilos para descansar con mas calma.',
      interests: ['wifi estable', 'trabajo remoto', 'estadias de 4 a 7 noches'],
      memberSince: timestamp(-365, 11, 5),
      createdAt: timestamp(-365, 11, 5),
      profilePhoto: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=400&q=80',
      emailVerified: true,
      phoneVerified: true,
      identityValidated: true,
      validationLevel: 'advanced',
      badge: 'Perfil verificado',
      trustScore: 80,
      riskScore: 3,
    },
    {
      id: 'demo_guest_tomas',
      email: 'tomas@demo.com',
      password: DEMO_PASSWORD,
      role: 'tenant',
      name: 'Tomas Bianchi',
      zone: 'Belgrano, CABA',
      phone: '+54 11 4822 1146',
      bio: 'Viaja con amigos y familia en fines de semana largos. Le importan la limpieza, el trato directo y que la publicacion sea fiel a la realidad.',
      interests: ['viajes en grupo', 'estadias largas', 'alojamientos verificados'],
      memberSince: timestamp(-250, 14, 10),
      createdAt: timestamp(-250, 14, 10),
      profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
      emailVerified: true,
      phoneVerified: true,
      identityValidated: true,
      validationLevel: 'advanced',
      badge: 'Perfil verificado',
      trustScore: 75,
      riskScore: 5,
    },
    {
      id: 'demo_host_valeria',
      email: 'valeria@demo.com',
      password: DEMO_PASSWORD,
      role: 'host',
      isInternalOperator: true,
      name: 'Valeria Soria',
      zone: 'Costa del Este',
      phone: '+54 2257 48 1192',
      bio: 'Vive en Costa del Este desde hace anos y administra propiedades familiares con check-in ordenado, respuestas rapidas y fotos actualizadas.',
      interests: ['familias', 'estadias tranquilas', 'check-in claro'],
      memberSince: timestamp(-820, 9, 0),
      createdAt: timestamp(-820, 9, 0),
      profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      emailVerified: true,
      phoneVerified: true,
      identityValidated: true,
      validationLevel: 'advanced',
      badge: 'Super anfitriona',
      trustScore: 93,
      riskScore: 2,
    },
    {
      id: 'demo_host_ignacio',
      email: 'ignacio@demo.com',
      password: DEMO_PASSWORD,
      role: 'host',
      name: 'Ignacio Costa',
      zone: 'Santa Teresita',
      phone: '+54 2257 51 3347',
      bio: 'Arquitecto y anfitrion. Publica propiedades remodeladas, responde desde la app y deja todo preparado para llegadas autonomas.',
      interests: ['publicaciones claras', 'lugares funcionales', 'huespedes recurrentes'],
      memberSince: timestamp(-760, 10, 30),
      createdAt: timestamp(-760, 10, 30),
      profilePhoto: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=400&q=80',
      emailVerified: true,
      phoneVerified: true,
      identityValidated: true,
      validationLevel: 'advanced',
      badge: 'Perfil verificado',
      trustScore: 88,
      riskScore: 8,
    },
    {
      id: 'demo_host_camila',
      email: 'camila@demo.com',
      password: DEMO_PASSWORD,
      role: 'host',
      name: 'Camila Rivas',
      zone: 'Mar del Tuyu',
      phone: '+54 2257 63 9104',
      bio: 'Se sumo hace poco a la plataforma y todavia esta armando sus primeras publicaciones. Prefiere avanzar paso a paso antes de validar identidad, fotos y datos operativos.',
      interests: ['primeras reservas', 'estadias cortas', 'alojamientos funcionales'],
      memberSince: timestamp(-18, 12, 30),
      createdAt: timestamp(-18, 12, 30),
      profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      emailVerified: false,
      phoneVerified: false,
      identityValidated: false,
      validationLevel: 'initial',
      badge: 'Anfitriona nueva',
      trustScore: 18,
      riskScore: 34,
    },
  ];

  const userById = new Map(users.map((user) => [user.id, user]));

  const properties: DemoProperty[] = [
    {
      id: 'demo_prop_playa_norte_1',
      title: 'Monoambiente con balcon frente a Playa Norte',
      location: 'San Clemente del Tuyu',
      price: 38000,
      hostId: 'demo_host_valeria',
      hostName: userById.get('demo_host_valeria')?.name || 'Anfitriona',
      description: 'Monoambiente reciclado para dos personas, con balcon al frente, cocina completa, wifi estable y cerradura digital. A una cuadra de la costanera y cerca del centro.',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'high',
      lat: -36.3585,
      lng: -56.7228,
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      propertyType: 'apartment',
      status: 'active',
      isVerifiedProperty: true,
      identityValidated: true,
      locationVerified: true,
      videoValidated: true,
      hasPresencialVerification: false,
      hasDigitalVerification: true,
      createdAt: timestamp(-320, 14, 0),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_parrilla_1',
      title: 'PH con patio y parrilla en calle tranquila',
      location: 'Costa del Este',
      price: 47000,
      hostId: 'demo_host_valeria',
      hostName: userById.get('demo_host_valeria')?.name || 'Anfitriona',
      description: 'PH de dos ambientes con patio propio, parrilla, ducha exterior y espacio para guardar bici. Ideal para escapadas de pareja o con un nene.',
      imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'high',
      lat: -36.6215,
      lng: -56.6907,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'house',
      status: 'active',
      isVerifiedProperty: true,
      identityValidated: true,
      locationVerified: true,
      videoValidated: true,
      hasPresencialVerification: true,
      hasDigitalVerification: true,
      createdAt: timestamp(-250, 11, 30),
      manualBlockedDates: [{ start: date(32), end: date(34) }],
    },
    {
      id: 'demo_prop_duplex_1',
      title: 'Duplex para 6 con comedor amplio y patio',
      location: 'Costa del Este',
      price: 69000,
      hostId: 'demo_host_valeria',
      hostName: userById.get('demo_host_valeria')?.name || 'Anfitriona',
      description: 'Duplex comodo para grupos chicos o familias. Tiene tres dormitorios, living separado, patio con mesa exterior y cochera descubierta.',
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'high',
      lat: -36.6248,
      lng: -56.6876,
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: 2,
      propertyType: 'house',
      status: 'active',
      isVerifiedProperty: true,
      identityValidated: true,
      locationVerified: true,
      videoValidated: true,
      hasPresencialVerification: true,
      hasDigitalVerification: true,
      createdAt: timestamp(-180, 16, 0),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_casa_familiar_1',
      title: 'Casa familiar con jardin y galeria cubierta',
      location: 'Santa Teresita',
      price: 62000,
      hostId: 'demo_host_ignacio',
      hostName: userById.get('demo_host_ignacio')?.name || 'Anfitrion',
      description: 'Casa de una planta con jardin, galeria techada, lavadero y entrada lateral para auto chico. A seis cuadras de la playa y cerca del centro comercial.',
      imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'medium',
      lat: -36.5421,
      lng: -56.6911,
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: 2,
      propertyType: 'house',
      status: 'active',
      isVerifiedProperty: true,
      identityValidated: true,
      locationVerified: true,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: true,
      createdAt: timestamp(-290, 13, 45),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_depto_reciclado_1',
      title: 'Departamento reciclado a dos cuadras del centro',
      location: 'San Bernardo',
      price: 41000,
      hostId: 'demo_host_ignacio',
      hostName: userById.get('demo_host_ignacio')?.name || 'Anfitrion',
      description: 'Departamento luminoso para tres personas, con cocina renovada, smart TV y balcon chico. Funciona muy bien para estadias de trabajo remoto y escapadas cortas.',
      imageUrl: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'medium',
      lat: -36.6882,
      lng: -56.6816,
      maxGuests: 3,
      bedrooms: 1,
      bathrooms: 1,
      propertyType: 'apartment',
      status: 'active',
      isVerifiedProperty: true,
      identityValidated: true,
      locationVerified: true,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: true,
      createdAt: timestamp(-160, 12, 10),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_chalet_cochera_1',
      title: 'Chalet con cochera y patio arbolado',
      location: 'Mar de Ajo',
      price: 74000,
      hostId: 'demo_host_ignacio',
      hostName: userById.get('demo_host_ignacio')?.name || 'Anfitrion',
      description: 'Chalet de tres ambientes con cochera semicubierta, patio arbolado y living amplio. Buena opcion para quienes llegan en auto y quieren moverse sin depender del centro.',
      imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'medium',
      lat: -36.7268,
      lng: -56.6762,
      maxGuests: 5,
      bedrooms: 2,
      bathrooms: 2,
      propertyType: 'house',
      status: 'active',
      isVerifiedProperty: false,
      identityValidated: true,
      locationVerified: true,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: true,
      createdAt: timestamp(-110, 15, 20),
      manualBlockedDates: [{ start: date(40), end: date(42) }],
    },
    {
      id: 'demo_prop_cabana_pinos_1',
      title: 'Cabana entre pinos a diez minutos del mar',
      location: 'Aguas Verdes',
      price: 48000,
      hostId: 'demo_host_ignacio',
      hostName: userById.get('demo_host_ignacio')?.name || 'Anfitrion',
      description: 'Cabana compacta y silenciosa, con deck de madera, estufa a lena y cocina bien equipada. Pensada para quienes quieren descansar mas que estar en el centro.',
      imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'medium',
      lat: -36.6424,
      lng: -56.6881,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'cabin',
      status: 'active',
      isVerifiedProperty: false,
      identityValidated: true,
      locationVerified: true,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: true,
      createdAt: timestamp(-45, 10, 45),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_terraza_premium_1',
      title: 'Loft con terraza privada y parrilla cerca del mar',
      location: 'Costa del Este',
      price: 72000,
      hostId: 'demo_host_ignacio',
      hostName: userById.get('demo_host_ignacio')?.name || 'Anfitrion',
      description: 'Loft amplio con terraza privada, parrilla, living integrado y cerradura digital. Pensado para quienes quieren comodidad, check-in simple y una publicacion 100% validada.',
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'high',
      lat: -36.6279,
      lng: -56.6859,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'apartment',
      status: 'active',
      isVerifiedProperty: true,
      identityValidated: true,
      locationVerified: true,
      materialVerified: true,
      videoValidated: true,
      hasPresencialVerification: true,
      onsiteVerifiedAt: timestamp(-42, 11, 10),
      hasDigitalVerification: true,
      createdAt: timestamp(-60, 16, 20),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_depto_visible_2',
      title: 'Departamento luminoso con balcon y cochera descubierta',
      location: 'Santa Teresita',
      price: 45000,
      hostId: 'demo_host_valeria',
      hostName: userById.get('demo_host_valeria')?.name || 'Anfitriona',
      description: 'Departamento funcional con balcon al frente, cochera descubierta y living comedor. Tiene varios datos visibles validados, pero todavia no completo la presencial.',
      imageUrl: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'medium',
      lat: -36.5429,
      lng: -56.6892,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'apartment',
      status: 'active',
      isVerifiedProperty: true,
      identityValidated: true,
      locationVerified: true,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: true,
      createdAt: timestamp(-36, 12, 0),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_estudio_nuevo_1',
      title: 'Estudio simple para escapadas a tres cuadras de la playa',
      location: 'Mar del Tuyu',
      price: 31000,
      hostId: 'demo_host_camila',
      hostName: userById.get('demo_host_camila')?.name || 'Anfitriona',
      description: 'Estudio basico para dos personas, con cocina compacta y entrada independiente. Publicacion nueva, todavia sin datos validados dentro de la plataforma.',
      imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'low',
      lat: -36.5781,
      lng: -56.6884,
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      propertyType: 'apartment',
      status: 'active',
      isVerifiedProperty: false,
      identityValidated: false,
      locationVerified: false,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: false,
      createdAt: timestamp(-8, 10, 20),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_casa_nueva_1',
      title: 'Casa nueva con patio chico y cochera descubierta',
      location: 'Costa Azul',
      price: 36000,
      hostId: 'demo_host_camila',
      hostName: userById.get('demo_host_camila')?.name || 'Anfitriona',
      description: 'Casa recien publicada con patio chico, cocina completa y espacio para auto. El anfitrion recien entra a la plataforma y aun no valido identidad ni informacion del aviso.',
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'low',
      lat: -36.6124,
      lng: -56.7048,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'house',
      status: 'active',
      isVerifiedProperty: false,
      identityValidated: false,
      locationVerified: false,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: false,
      createdAt: timestamp(-6, 14, 15),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_duplex_basico_1',
      title: 'Duplex básico con cocina integrada y patio chico',
      location: 'Las Toninas',
      price: 34000,
      hostId: 'demo_host_camila',
      hostName: userById.get('demo_host_camila')?.name || 'Anfitriona',
      description: 'Duplex nuevo en la plataforma, con patio chico y cocina integrada. Todavía no tiene identidad confirmada ni validaciones visibles.',
      imageUrl: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'low',
      lat: -36.4872,
      lng: -56.6963,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'house',
      status: 'active',
      isVerifiedProperty: false,
      identityValidated: false,
      locationVerified: false,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: false,
      createdAt: timestamp(-4, 11, 10),
      manualBlockedDates: [],
    },
    {
      id: 'demo_prop_ph_inicial_1',
      title: 'PH inicial con comedor chico y entrada independiente',
      location: 'Nueva Atlantis',
      price: 33000,
      hostId: 'demo_host_camila',
      hostName: userById.get('demo_host_camila')?.name || 'Anfitriona',
      description: 'PH recién publicado para escapadas cortas. El anfitrión todavía no avanzó con identidad confirmada ni verificación presencial.',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      traceabilityLevel: 'low',
      lat: -36.5634,
      lng: -56.7127,
      maxGuests: 3,
      bedrooms: 1,
      bathrooms: 1,
      propertyType: 'apartment',
      status: 'active',
      isVerifiedProperty: false,
      identityValidated: false,
      locationVerified: false,
      videoValidated: false,
      hasPresencialVerification: false,
      hasDigitalVerification: false,
      createdAt: timestamp(-3, 15, 5),
      manualBlockedDates: [],
    },
  ];

  const propertyById = new Map(properties.map((property) => [property.id, property]));

  const createBooking = (config: {
    id: string;
    propertyId: string;
    userId: string;
    status: DemoBookingStatus;
    startOffset: number;
    endOffset: number;
    guests: number;
    createdAtOffset: number;
    createdAtHour?: number;
    stayCode: string;
    verified?: number;
    contractAccepted?: boolean;
  }): DemoBooking => {
    const property = propertyById.get(config.propertyId);
    const guest = userById.get(config.userId);
    const host = property ? userById.get(property.hostId) : null;
    const startDate = date(config.startOffset);
    const endDate = date(config.endOffset);
    const totalPrice = (property?.price || 0) * getNightCount(startDate, endDate);

    return {
      id: config.id,
      propertyId: config.propertyId,
      userId: config.userId,
      status: config.status,
      startDate,
      endDate,
      totalPrice,
      guests: config.guests,
      date: startDate,
      stayCode: config.stayCode,
      verified: config.verified ?? (config.status === 'completed' ? 1 : 0),
      createdAt: timestamp(config.createdAtOffset, config.createdAtHour ?? 12, 0),
      contractAccepted: config.contractAccepted ?? config.status === 'completed',
      contractJson: property && guest && host
        ? buildContractJson(guest.name, host.name, property.title, property.location, startDate, endDate, totalPrice)
        : null,
    };
  };

  const bookings: DemoBooking[] = [
    createBooking({ id: 'demo_booking_lucia_past_1', propertyId: 'demo_prop_parrilla_1', userId: 'demo_guest_lucia', status: 'completed', startOffset: -28, endOffset: -24, guests: 2, createdAtOffset: -30, createdAtHour: 18, stayCode: 'LUCPH1' }),
    createBooking({ id: 'demo_booking_lucia_future_1', propertyId: 'demo_prop_playa_norte_1', userId: 'demo_guest_lucia', status: 'confirmed', startOffset: 9, endOffset: 13, guests: 2, createdAtOffset: -4, createdAtHour: 19, stayCode: 'LUCMAR', contractAccepted: false }),
    createBooking({ id: 'demo_booking_lucia_current_1', propertyId: 'demo_prop_casa_familiar_1', userId: 'demo_guest_lucia', status: 'confirmed', startOffset: -1, endOffset: 3, guests: 4, createdAtOffset: -12, createdAtHour: 17, stayCode: 'LUCNOW' }),
    createBooking({ id: 'demo_booking_lucia_cancelled_1', propertyId: 'demo_prop_chalet_cochera_1', userId: 'demo_guest_lucia', status: 'cancelled', startOffset: 26, endOffset: 30, guests: 3, createdAtOffset: -2, createdAtHour: 16, stayCode: 'LUCCAN', contractAccepted: false }),
    createBooking({ id: 'demo_booking_martin_past_1', propertyId: 'demo_prop_playa_norte_1', userId: 'demo_guest_martin', status: 'completed', startOffset: -52, endOffset: -48, guests: 2, createdAtOffset: -56, createdAtHour: 20, stayCode: 'MRTPN1' }),
    createBooking({ id: 'demo_booking_martin_past_2', propertyId: 'demo_prop_duplex_1', userId: 'demo_guest_martin', status: 'completed', startOffset: -14, endOffset: -10, guests: 5, createdAtOffset: -18, createdAtHour: 19, stayCode: 'MRTDP1' }),
    createBooking({ id: 'demo_booking_rocio_future_1', propertyId: 'demo_prop_duplex_1', userId: 'demo_guest_rocio', status: 'confirmed', startOffset: 18, endOffset: 25, guests: 5, createdAtOffset: -1, createdAtHour: 13, stayCode: 'ROCDF1', contractAccepted: false }),
    createBooking({ id: 'demo_booking_rocio_future_2', propertyId: 'demo_prop_terraza_premium_1', userId: 'demo_guest_rocio', status: 'confirmed', startOffset: 22, endOffset: 26, guests: 3, createdAtOffset: -2, createdAtHour: 11, stayCode: 'ROCTER', contractAccepted: false }),
    createBooking({ id: 'demo_booking_rocio_past_1', propertyId: 'demo_prop_depto_reciclado_1', userId: 'demo_guest_rocio', status: 'completed', startOffset: -36, endOffset: -32, guests: 2, createdAtOffset: -40, createdAtHour: 15, stayCode: 'ROCDEP' }),
    createBooking({ id: 'demo_booking_tomas_past_1', propertyId: 'demo_prop_playa_norte_1', userId: 'demo_guest_tomas', status: 'completed', startOffset: -70, endOffset: -66, guests: 2, createdAtOffset: -73, createdAtHour: 18, stayCode: 'TOMEST' }),
    createBooking({ id: 'demo_booking_tomas_past_2', propertyId: 'demo_prop_casa_familiar_1', userId: 'demo_guest_tomas', status: 'completed', startOffset: -58, endOffset: -54, guests: 4, createdAtOffset: -62, createdAtHour: 14, stayCode: 'TOMCAS' }),
    createBooking({ id: 'demo_booking_martin_future_1', propertyId: 'demo_prop_cabana_pinos_1', userId: 'demo_guest_martin', status: 'pending', startOffset: 34, endOffset: 38, guests: 2, createdAtOffset: -3, createdAtHour: 12, stayCode: 'MRTCAB', contractAccepted: false }),
  ];

  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));

  const createReview = (config: {
    id: string;
    bookingId: string;
    reviewerId: string;
    reviewedUserId: string;
    type: DemoReviewType;
    rating: number;
    comment: string;
    createdAtOffset: number;
    agreementKept?: boolean;
    wouldInteractAgain?: boolean;
    hadIncident?: boolean;
    photosMatchReality?: boolean;
    pressureToBookFast?: boolean;
  }): DemoReview => ({
    id: config.id,
    bookingId: config.bookingId,
    reviewerId: config.reviewerId,
    reviewedUserId: config.reviewedUserId,
    propertyId: bookingById.get(config.bookingId)?.propertyId || '',
    rating: config.rating,
    comment: config.comment,
    type: config.type,
    agreementKept: config.agreementKept ?? (config.photosMatchReality !== false && config.pressureToBookFast !== true && config.rating >= 4),
    wouldInteractAgain: config.wouldInteractAgain ?? (config.pressureToBookFast !== true && config.rating >= 4),
    hadIncident: config.hadIncident ?? (config.pressureToBookFast === true || config.photosMatchReality === false || config.rating <= 3),
    photosMatchReality: config.photosMatchReality ?? true,
    pressureToBookFast: config.pressureToBookFast ?? false,
    createdAt: timestamp(config.createdAtOffset, 20, 15),
  });

  const reviews: DemoReview[] = [
    createReview({ id: 'demo_review_lucia_to_valeria_1', bookingId: 'demo_booking_lucia_past_1', reviewerId: 'demo_guest_lucia', reviewedUserId: 'demo_host_valeria', type: 'guest_to_host', rating: 5, comment: 'El PH estaba impecable, la parrilla lista para usar y el check-in fue tan claro como en la publicacion.', createdAtOffset: -23 }),
    createReview({ id: 'demo_review_valeria_to_lucia_1', bookingId: 'demo_booking_lucia_past_1', reviewerId: 'demo_host_valeria', reviewedUserId: 'demo_guest_lucia', type: 'host_to_guest', rating: 5, comment: 'Lucia llego en horario, cuido la casa y dejo todo en orden. Comunicacion muy clara durante la estadia.', createdAtOffset: -23 }),
    createReview({ id: 'demo_review_martin_to_valeria_1', bookingId: 'demo_booking_martin_past_1', reviewerId: 'demo_guest_martin', reviewedUserId: 'demo_host_valeria', type: 'guest_to_host', rating: 4, comment: 'La vista y la ubicacion son muy buenas. El lugar coincide con las fotos y Valeria respondio rapido cuando consultamos por el estacionamiento.', createdAtOffset: -47, agreementKept: true, wouldInteractAgain: true, hadIncident: true }),
    createReview({ id: 'demo_review_valeria_to_martin_1', bookingId: 'demo_booking_martin_past_1', reviewerId: 'demo_host_valeria', reviewedUserId: 'demo_guest_martin', type: 'host_to_guest', rating: 5, comment: 'Martin fue respetuoso con las normas y muy prolijo. Lo recomendaria para otra reserva sin problema.', createdAtOffset: -47 }),
    createReview({ id: 'demo_review_martin_to_valeria_2', bookingId: 'demo_booking_martin_past_2', reviewerId: 'demo_guest_martin', reviewedUserId: 'demo_host_valeria', type: 'guest_to_host', rating: 5, comment: 'El duplex esta bien pensado para grupos, con espacios amplios y patio comodo. Todo estaba preparado antes de llegar.', createdAtOffset: -9 }),
    createReview({ id: 'demo_review_valeria_to_martin_2', bookingId: 'demo_booking_martin_past_2', reviewerId: 'demo_host_valeria', reviewedUserId: 'demo_guest_martin', type: 'host_to_guest', rating: 4, comment: 'Buen trato y salida en horario. Tuvimos que coordinar una consulta extra por la cochera, pero se resolvio bien.', createdAtOffset: -9, agreementKept: true, wouldInteractAgain: true, hadIncident: true }),
    createReview({ id: 'demo_review_rocio_to_ignacio_1', bookingId: 'demo_booking_rocio_past_1', reviewerId: 'demo_guest_rocio', reviewedUserId: 'demo_host_ignacio', type: 'guest_to_host', rating: 4, comment: 'El depto estaba prolijo y el wifi funciono bien para trabajar. El bano es chico, pero todo lo demas coincidió con lo publicado.', createdAtOffset: -31 }),
    createReview({ id: 'demo_review_ignacio_to_rocio_1', bookingId: 'demo_booking_rocio_past_1', reviewerId: 'demo_host_ignacio', reviewedUserId: 'demo_guest_rocio', type: 'host_to_guest', rating: 5, comment: 'Rocio aviso su horario de llegada, cuido el departamento y mantuvo muy buena comunicacion durante la estadia.', createdAtOffset: -31 }),
    createReview({ id: 'demo_review_tomas_to_valeria_1', bookingId: 'demo_booking_tomas_past_1', reviewerId: 'demo_guest_tomas', reviewedUserId: 'demo_host_valeria', type: 'guest_to_host', rating: 5, comment: 'El monoambiente es compacto pero muy funcional. La limpieza fue excelente y la informacion sobre el edificio estaba actualizada.', createdAtOffset: -65 }),
    createReview({ id: 'demo_review_valeria_to_tomas_1', bookingId: 'demo_booking_tomas_past_1', reviewerId: 'demo_host_valeria', reviewedUserId: 'demo_guest_tomas', type: 'host_to_guest', rating: 4, comment: 'Tomas fue correcto y dejo todo bien. Se extendio un poco con el horario de salida, pero aviso y lo resolvimos sin problema.', createdAtOffset: -65, agreementKept: true, wouldInteractAgain: true, hadIncident: true }),
    createReview({ id: 'demo_review_tomas_to_ignacio_1', bookingId: 'demo_booking_tomas_past_2', reviewerId: 'demo_guest_tomas', reviewedUserId: 'demo_host_ignacio', type: 'guest_to_host', rating: 4, comment: 'La casa es comoda para familia y el jardin suma mucho. El barrio es tranquilo y el ingreso fue simple con instrucciones por mensaje.', createdAtOffset: -53 }),
    createReview({ id: 'demo_review_ignacio_to_tomas_1', bookingId: 'demo_booking_tomas_past_2', reviewerId: 'demo_host_ignacio', reviewedUserId: 'demo_guest_tomas', type: 'host_to_guest', rating: 5, comment: 'Buen huesped, respetuoso con la casa y con excelente comunicacion antes y durante la estadia.', createdAtOffset: -53 }),
  ];

  const conversationDrafts = [
    {
      id: 'demo_conversation_lucia_valeria_1',
      propertyId: 'demo_prop_playa_norte_1',
      bookingId: 'demo_booking_lucia_future_1',
      tenantId: 'demo_guest_lucia',
      hostId: 'demo_host_valeria',
      createdAt: timestamp(-6, 10, 5),
    },
    {
      id: 'demo_conversation_lucia_ignacio_1',
      propertyId: 'demo_prop_casa_familiar_1',
      bookingId: 'demo_booking_lucia_current_1',
      tenantId: 'demo_guest_lucia',
      hostId: 'demo_host_ignacio',
      createdAt: timestamp(-2, 9, 10),
    },
  ];

  const messages: DemoMessage[] = [
    {
      id: 'demo_message_valeria_1',
      conversationId: 'demo_conversation_lucia_valeria_1',
      senderId: 'demo_guest_lucia',
      receiverId: 'demo_host_valeria',
      content: 'Hola Valeria, vi el monoambiente de Playa Norte. Queria saber si el balcon queda resguardado cuando corre viento del mar.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-6, 10, 12),
    },
    {
      id: 'demo_message_valeria_2',
      conversationId: 'demo_conversation_lucia_valeria_1',
      senderId: 'demo_host_valeria',
      receiverId: 'demo_guest_lucia',
      content: 'Hola Lucia, si. Tiene un cerramiento bajo y queda bastante reparado. Para desayunar o estar al atardecer funciona muy bien.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-6, 10, 28),
    },
    {
      id: 'demo_message_valeria_3',
      conversationId: 'demo_conversation_lucia_valeria_1',
      senderId: 'demo_guest_lucia',
      receiverId: 'demo_host_valeria',
      content: 'Perfecto. Trabajo remoto un dia desde alla, asi que tambien me importa que el wifi sea estable.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-6, 10, 31),
    },
    {
      id: 'demo_message_valeria_4',
      conversationId: 'demo_conversation_lucia_valeria_1',
      senderId: 'demo_host_valeria',
      receiverId: 'demo_guest_lucia',
      content: 'Tenemos fibra y escritorio plegable. Esta semana hubo dos huespedes trabajando desde el depto y no reportaron cortes.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-6, 10, 44),
    },
    {
      id: 'demo_message_valeria_5',
      conversationId: 'demo_conversation_lucia_valeria_1',
      senderId: 'demo_guest_lucia',
      receiverId: 'demo_host_valeria',
      content: 'Buenisimo. Reserve del 11 al 15 y voy a llegar despues de las 18. Te aviso el horario exacto cuando salga de Capital.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-4, 18, 50),
    },
    {
      id: 'demo_message_valeria_6',
      conversationId: 'demo_conversation_lucia_valeria_1',
      senderId: 'demo_host_valeria',
      receiverId: 'demo_guest_lucia',
      content: 'Dale, no hay problema. Te dejo el ingreso autonomo preparado y si te demoras tambien te puedo mandar un video corto de referencia.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-4, 19, 4),
    },
    {
      id: 'demo_message_valeria_7',
      conversationId: 'demo_conversation_lucia_valeria_1',
      senderId: 'demo_guest_lucia',
      receiverId: 'demo_host_valeria',
      content: 'Gracias. Con eso estoy. Me gusto que la publicacion fuera tan clara con el edificio y la distancia al mar.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-4, 19, 7),
    },
    {
      id: 'demo_message_valeria_8',
      conversationId: 'demo_conversation_lucia_valeria_1',
      senderId: 'demo_host_valeria',
      receiverId: 'demo_guest_lucia',
      content: 'Gracias a vos. Apenas tengas horario de llegada me escribis por aca y dejamos todo listo.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-4, 19, 15),
    },
    {
      id: 'demo_message_ignacio_1',
      conversationId: 'demo_conversation_lucia_ignacio_1',
      senderId: 'demo_guest_lucia',
      receiverId: 'demo_host_ignacio',
      content: 'Hola Ignacio, ya estamos en camino a Santa Teresita. Te consulto si la llave queda en la caja negra del frente.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-1, 14, 20),
    },
    {
      id: 'demo_message_ignacio_2',
      conversationId: 'demo_conversation_lucia_ignacio_1',
      senderId: 'demo_host_ignacio',
      receiverId: 'demo_guest_lucia',
      content: 'Si, exacto. El codigo termina en 47. La galeria queda abierta y adentro te deje el manual rapido de la casa.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-1, 14, 33),
    },
    {
      id: 'demo_message_ignacio_3',
      conversationId: 'demo_conversation_lucia_ignacio_1',
      senderId: 'demo_guest_lucia',
      receiverId: 'demo_host_ignacio',
      content: 'Perfecto. Llegamos un poco antes, asi que dejamos las cosas y despues salimos a caminar. Todo coincide con las fotos.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-1, 16, 5),
    },
    {
      id: 'demo_message_ignacio_4',
      conversationId: 'demo_conversation_lucia_ignacio_1',
      senderId: 'demo_host_ignacio',
      receiverId: 'demo_guest_lucia',
      content: 'Buenisimo. Si necesitan secador o una reposera extra, me avisan por aca y se los acerco a la tarde.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(-1, 16, 22),
    },
    {
      id: 'demo_message_ignacio_5',
      conversationId: 'demo_conversation_lucia_ignacio_1',
      senderId: 'demo_guest_lucia',
      receiverId: 'demo_host_ignacio',
      content: 'Gracias. Por ahora estamos bien. Solo te escribo para confirmar si el horario de salida sigue siendo a las 10.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(0, 9, 8),
    },
    {
      id: 'demo_message_ignacio_6',
      conversationId: 'demo_conversation_lucia_ignacio_1',
      senderId: 'demo_host_ignacio',
      receiverId: 'demo_guest_lucia',
      content: 'Si, a las 10 esta perfecto. Si el trafico se complica y necesitan media hora mas, avisenme con tiempo.',
      isSystem: false,
      isSuspicious: false,
      createdAt: timestamp(0, 9, 19),
    },
  ];

  const conversationMetaById = new Map<string, { lastMessage: string; updatedAt: string }>();
  for (const message of messages) {
    conversationMetaById.set(message.conversationId, {
      lastMessage: message.content,
      updatedAt: message.createdAt,
    });
  }

  const conversations: DemoConversation[] = conversationDrafts.map((conversation) => ({
    id: conversation.id,
    propertyId: conversation.propertyId,
    bookingId: conversation.bookingId,
    tenantId: conversation.tenantId,
    hostId: conversation.hostId,
    lastMessage: conversationMetaById.get(conversation.id)?.lastMessage || '',
    createdAt: conversation.createdAt,
    updatedAt: conversationMetaById.get(conversation.id)?.updatedAt || conversation.createdAt,
  }));

  const favorites: DemoFavorite[] = [
    { userId: 'demo_guest_lucia', propertyId: 'demo_prop_playa_norte_1', createdAt: timestamp(-12, 21, 0) },
    { userId: 'demo_guest_lucia', propertyId: 'demo_prop_duplex_1', createdAt: timestamp(-7, 20, 10) },
    { userId: 'demo_guest_lucia', propertyId: 'demo_prop_cabana_pinos_1', createdAt: timestamp(-2, 22, 5) },
  ];

  const userPreferences: DemoUserPreference[] = [
    {
      userId: 'demo_guest_lucia',
      preferredZone: 'Costa del Este',
      maxPrice: 70000,
      preferredPropertyType: 'house',
      createdAt: timestamp(-90, 9, 0),
      updatedAt: timestamp(-2, 8, 45),
    },
    {
      userId: 'demo_guest_rocio',
      preferredZone: 'San Bernardo',
      maxPrice: 50000,
      preferredPropertyType: 'apartment',
      createdAt: timestamp(-45, 11, 30),
      updatedAt: timestamp(-12, 10, 5),
    },
  ];

  const totalBookingsByUser = bookings.reduce<Record<string, number>>((accumulator, booking) => {
    accumulator[booking.userId] = (accumulator[booking.userId] || 0) + 1;
    return accumulator;
  }, {});

  const totalReviewsByReviewer = reviews.reduce<Record<string, number>>((accumulator, review) => {
    accumulator[review.reviewerId] = (accumulator[review.reviewerId] || 0) + 1;
    return accumulator;
  }, {});

  const userActivity: DemoUserActivity[] = users.map((user, index) => ({
    userId: user.id,
    lastLogin: timestamp(-(index % 3), 8 + index, 15),
    totalBookings: totalBookingsByUser[user.id] || 0,
    totalReviewsWritten: totalReviewsByReviewer[user.id] || 0,
    updatedAt: timestamp(0, 7 + index, 45),
  }));

  return {
    users,
    userPreferences,
    userActivity,
    properties,
    bookings,
    reviews,
    conversations,
    messages,
    favorites,
  };
};