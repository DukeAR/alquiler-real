import type { Property } from '../types';

export type DemoProfileHistoryItem = {
  id: string;
  title: string;
  date: string;
  note: string;
  tone: 'positive' | 'neutral';
};

export type DemoProfileData = {
  name: string;
  role: string;
  location: string;
  memberSince: string;
  summary: string;
  verification: {
    label: string;
    detail: string;
    status: 'verified' | 'partial';
  };
  highlights: string[];
  stats: Array<{
    label: string;
    value: string;
    help: string;
  }>;
  history: DemoProfileHistoryItem[];
};

const buildDemoProperty = (overrides: Partial<Property> & Pick<Property, 'id' | 'title' | 'location' | 'price' | 'description' | 'imageUrl'>): Property => {
  const coordinates = overrides.coordinates ?? { lat: -36.7263, lng: -56.6784 };

  return {
    id: overrides.id,
    title: overrides.title,
    location: overrides.location,
    propertyType: overrides.propertyType ?? 'Casa',
    images: overrides.images ?? [overrides.imageUrl],
    verificationScore: overrides.verificationScore ?? 0,
    verificationSummary: overrides.verificationSummary,
    verificationItems: overrides.verificationItems,
    advancedVerificationItems: overrides.advancedVerificationItems,
    verificationProgress: overrides.verificationProgress,
    hostTrustScore: overrides.hostTrustScore,
    hostTrust: overrides.hostTrust,
    hostInteractionHistory: overrides.hostInteractionHistory,
    price: overrides.price,
    hostName: overrides.hostName ?? 'Paula Medina',
    hostId: overrides.hostId ?? `demo-host-${overrides.id}`,
    hostSince: overrides.hostSince ?? '2023-01-12',
    hostExperienceYears: overrides.hostExperienceYears ?? 3,
    historicalConsistency: overrides.historicalConsistency ?? 91,
    unresolvedReviewsCount: overrides.unresolvedReviewsCount ?? 0,
    identityValidated: overrides.identityValidated ?? false,
    locationVerified: overrides.locationVerified ?? false,
    materialVerified: overrides.materialVerified,
    videoValidated: overrides.videoValidated ?? false,
    traceabilityLevel: overrides.traceabilityLevel ?? 'medium',
    traceabilityReport: overrides.traceabilityReport,
    imageUrl: overrides.imageUrl,
    coordinates,
    lat: overrides.lat ?? coordinates.lat,
    lng: overrides.lng ?? coordinates.lng,
    description: overrides.description,
    rating: overrides.rating ?? 4.8,
    reviewsCount: overrides.reviewsCount ?? 18,
    isSuperHost: overrides.isSuperHost ?? false,
    maxGuests: overrides.maxGuests ?? 4,
    beds: overrides.beds ?? 3,
    bedrooms: overrides.bedrooms ?? 2,
    bathrooms: overrides.bathrooms ?? 1,
    verificationPhotoCount: overrides.verificationPhotoCount ?? 4,
    verificationVideoCount: overrides.verificationVideoCount ?? 0,
    verificationDocumentCount: overrides.verificationDocumentCount ?? 0,
    verificationDocumentsReviewedCount: overrides.verificationDocumentsReviewedCount ?? 0,
    documentationSubmitted: overrides.documentationSubmitted,
    documentationVerified: overrides.documentationVerified,
    manualReviewReady: overrides.manualReviewReady,
    manualReviewCompleted: overrides.manualReviewCompleted,
    availabilityValidated: overrides.availabilityValidated ?? true,
    propertyRelationshipVerified: overrides.propertyRelationshipVerified ?? false,
    hasPresencialVerification: overrides.hasPresencialVerification ?? false,
    onsiteVerifiedAt: overrides.onsiteVerifiedAt,
    hasDigitalVerification: overrides.hasDigitalVerification ?? false,
    hostPremiumDocumentaryVerified: overrides.hostPremiumDocumentaryVerified,
    premiumVisibilityBoost: overrides.premiumVisibilityBoost,
    premiumOnsiteOffer: overrides.premiumOnsiteOffer ?? null,
    isVerifiedProperty: overrides.isVerifiedProperty ?? false,
    interactionContinuity: overrides.interactionContinuity,
    isOwnedByViewer: overrides.isOwnedByViewer,
    verificationMedia: overrides.verificationMedia,
  };
};

export const demoProperties: Property[] = [
  buildDemoProperty({
    id: '1',
    title: 'Casa frente al mar con galería y parrilla',
    location: 'Costa del Este',
    price: 92000,
    propertyType: 'Casa',
    description: 'Casa amplia con living integrado, galería con parrilla y salida rápida a la playa. Ideal para grupos o estadías familiares.',
    imageUrl: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80',
    hostName: 'Valentina Ríos',
    hostId: 'demo-host-1',
    hostExperienceYears: 5,
    identityValidated: true,
    locationVerified: true,
    propertyRelationshipVerified: true,
    hasPresencialVerification: true,
    onsiteVerifiedAt: '2026-03-10T10:00:00.000Z',
    availabilityValidated: true,
    videoValidated: true,
    traceabilityLevel: 'high',
    rating: 4.9,
    reviewsCount: 26,
    maxGuests: 6,
    beds: 5,
    bedrooms: 3,
    bathrooms: 2,
    isSuperHost: true,
  }),
  buildDemoProperty({
    id: '2',
    title: 'Departamento tranquilo a tres cuadras del centro',
    location: 'San Bernardo',
    price: 61000,
    propertyType: 'Departamento',
    description: 'Alternativa urbana con balcón, cocina equipada y buena luz natural. Cómoda para una escapada corta cerca del centro.',
    imageUrl: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    hostName: 'Martín Quiroga',
    hostId: 'demo-host-2',
    identityValidated: true,
    locationVerified: true,
    propertyRelationshipVerified: false,
    hasPresencialVerification: false,
    availabilityValidated: true,
    videoValidated: false,
    traceabilityLevel: 'medium',
    rating: 4.7,
    reviewsCount: 14,
    maxGuests: 4,
    beds: 3,
    bedrooms: 2,
    bathrooms: 1,
  }),
  buildDemoProperty({
    id: '3',
    title: 'Cabaña entre pinos para escapada corta',
    location: 'Aguas Verdes',
    price: 54000,
    propertyType: 'Cabaña',
    description: 'Cabaña rodeada de pinos, simple y funcional, pensada para descansar unos días cerca del mar.',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    hostName: 'Sofía Acosta',
    hostId: 'demo-host-3',
    identityValidated: false,
    locationVerified: true,
    propertyRelationshipVerified: false,
    hasPresencialVerification: false,
    availabilityValidated: false,
    videoValidated: false,
    traceabilityLevel: 'low',
    rating: 4.5,
    reviewsCount: 8,
    maxGuests: 3,
    beds: 2,
    bedrooms: 1,
    bathrooms: 1,
  }),
  buildDemoProperty({
    id: '4',
    title: 'PH con patio y escritorio para workation',
    location: 'Santa Teresita',
    price: 70000,
    propertyType: 'PH',
    description: 'PH con patio, escritorio y ambientes luminosos. Cómodo para combinar descanso y trabajo remoto.',
    imageUrl: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    hostName: 'Diego Ferreyra',
    hostId: 'demo-host-4',
    identityValidated: true,
    locationVerified: true,
    propertyRelationshipVerified: true,
    hasPresencialVerification: false,
    availabilityValidated: true,
    videoValidated: true,
    traceabilityLevel: 'medium',
    rating: 4.8,
    reviewsCount: 11,
    maxGuests: 5,
    beds: 4,
    bedrooms: 2,
    bathrooms: 1,
  }),
];

export const getDemoPropertyById = (id?: string) => demoProperties.find((property) => property.id === id) ?? null;

export const demoProfile: DemoProfileData = {
  name: 'Lucía Navarro',
  role: 'Perfil de huésped',
  location: 'La Plata, Buenos Aires',
  memberSince: 'Enero 2024',
  summary: 'Perfil con historial y datos completos para dar contexto antes de aceptar una consulta.',
  verification: {
    label: 'Cuenta verificada',
    detail: 'Tiene email, teléfono e identidad visibles para dar contexto antes de aceptar una consulta.',
    status: 'verified',
  },
  highlights: [
    'Historial de estadías sin incidentes recientes',
    'Perfil completo con datos de contacto cargados',
    'Actividad suficiente para entender con quién hablás',
  ],
  stats: [
    { label: 'Reservas concretadas', value: '6', help: 'en el último año' },
    { label: 'Reseñas recibidas', value: '5', help: 'registradas dentro de la plataforma' },
    { label: 'Nivel visible', value: '4/5', help: 'validaciones cargadas' },
  ],
  history: [
    {
      id: 'history-1',
      title: 'Reserva completada en Costa del Este',
      date: 'Febrero 2026',
      note: 'La estadía terminó sin desvíos y con buena comunicación previa.',
      tone: 'positive',
    },
    {
      id: 'history-2',
      title: 'Consulta aceptada por anfitrión verificado',
      date: 'Noviembre 2025',
      note: 'El anfitrión destacó que el perfil ya mostraba información suficiente para responder rápido.',
      tone: 'positive',
    },
    {
      id: 'history-3',
      title: 'Perfil reforzado con identidad visible',
      date: 'Agosto 2025',
      note: 'Se cargó la validación documental opcional para reforzar la identidad visible en el perfil.',
      tone: 'neutral',
    },
  ],
};