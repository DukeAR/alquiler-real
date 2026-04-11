export type PlatformTermsClauseId = 'property-information' | 'host-responsibility' | 'platform-intervention' | 'external-operations';

export type PlatformTermsClause = {
  id: PlatformTermsClauseId;
  eyebrow: string;
  title: string;
  body: string;
};

export type BookingContractPlatformTerm = {
  id: PlatformTermsClauseId;
  title: string;
  body: string;
};

export type PlatformTermsQuickGuideSectionId = 'properties' | 'contact' | 'deposit' | 'platform-intervention' | 'no-intervention';

export type PlatformTermsQuickGuideSection = {
  id: PlatformTermsQuickGuideSectionId;
  title: string;
  body: string;
};

export const PLATFORM_TERMS_INTRO = 'Estos términos explican qué depende del anfitrión, qué deja registrado Alquiler Real y en qué situaciones la plataforma puede revisar un caso.';

export const PLATFORM_TERMS_QUICK_GUIDE_INTRO = 'En menos de un minuto: qué registra la plataforma, qué depende del anfitrión y cuándo puede revisar un caso.';

export const PLATFORM_TERMS_QUICK_GUIDE_SECTIONS: PlatformTermsQuickGuideSection[] = [
  {
    id: 'properties',
    title: 'Propiedades',
    body: 'Cada aviso lo carga el anfitrión. La plataforma puede mostrar verificaciones, pero el anfitrión responde por lo que publica y por cómo está el lugar.',
  },
  {
    id: 'contact',
    title: 'Contacto',
    body: 'Si hablás dentro de la app, queda registro. Si deciden seguir por fuera, ese tramo deja de quedar asentado acá.',
  },
  {
    id: 'deposit',
    title: 'Seña',
    body: 'Tenés dos opciones: coordinarla por fuera o dejarla dentro de la app. Si la dejás acá, se paga dentro del flujo y queda registrada.',
  },
  {
    id: 'platform-intervention',
    title: 'Cuándo interviene la plataforma',
    body: 'Si la seña se gestiona acá, Alquiler Real puede revisar cancelaciones, problemas al llegar o situaciones reportadas para ayudar a ordenar cómo sigue.',
  },
  {
    id: 'no-intervention',
    title: 'Cuándo no interviene',
    body: 'No interviene en pagos, señas, acuerdos o devoluciones hechos por fuera, ni reemplaza lo que acuerdan huésped y anfitrión.',
  },
];

export const PLATFORM_TERMS_HIGHLIGHTS = [
  'La información de cada propiedad la carga el anfitrión.',
  'Cada anfitrión responde por la veracidad de lo publicado y por las condiciones reales del alojamiento.',
  'Si la seña se gestiona dentro de la plataforma, Alquiler Real puede revisar lo reportado y ayudar a resolver cómo sigue.',
  'Si el acuerdo o el pago fueron por fuera, la plataforma no interviene en esos movimientos.',
] as const;

export const PLATFORM_TERMS_CLAUSES: PlatformTermsClause[] = [
  {
    id: 'property-information',
    eyebrow: 'Propiedades',
    title: 'Lo que muestra cada aviso',
    body: 'La información, las fotos, los servicios, las reglas y las descripciones de cada propiedad son proporcionadas por el anfitrión. Alquiler Real puede mostrar verificaciones o historial visible, pero no garantiza coincidencia total con lo publicado.',
  },
  {
    id: 'host-responsibility',
    eyebrow: 'Responsabilidad',
    title: 'Qué responde cada anfitrión',
    body: 'Cada anfitrión es responsable por la veracidad de lo que publica y por las condiciones reales del alojamiento al momento de la estadía, incluyendo acceso, limpieza, funcionamiento y servicios ofrecidos.',
  },
  {
    id: 'platform-intervention',
    eyebrow: 'Intervención',
    title: 'Cuándo puede intervenir la plataforma',
    body: 'En reservas con seña gestionada dentro de la plataforma, Alquiler Real puede revisar situaciones reportadas y ayudar a ordenar cómo sigue esa seña según el estado de la reserva y la información disponible.',
  },
  {
    id: 'external-operations',
    eyebrow: 'Operaciones externas',
    title: 'Qué queda fuera de Alquiler Real',
    body: 'Cuando las partes hacen acuerdos, pagos o señas por fuera de la plataforma, Alquiler Real no interviene en esos movimientos, no actúa como parte del acuerdo y no decide sobre devoluciones o incumplimientos vinculados a operaciones externas.',
  },
];

export const BOOKING_CONTRACT_PLATFORM_TERMS: BookingContractPlatformTerm[] = PLATFORM_TERMS_CLAUSES.map(({ id, title, body }) => ({
  id,
  title,
  body,
}));