export type PlatformTermsClauseId =
  | 'platform-role'
  | 'property-information'
  | 'host-responsibility'
  | 'internal-operations'
  | 'external-operations'
  | 'conflict-review'
  | 'verification-scope'
  | 'deposits-and-cancellations';

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

export type PlatformTermsQuickGuideSectionId =
  | 'who-publishes'
  | 'platform-role'
  | 'inside-platform'
  | 'outside-platform'
  | 'conflict-review'
  | 'data-and-validation';

export type PlatformTermsQuickGuideSection = {
  id: PlatformTermsQuickGuideSectionId;
  title: string;
  body: string;
};

export type PlatformOperationScopeId = 'inside-platform' | 'outside-platform';

export type PlatformOperationScope = {
  id: PlatformOperationScopeId;
  eyebrow: string;
  title: string;
  bullets: string[];
  tone: 'brand' | 'neutral';
};

export const PLATFORM_TERMS_INTRO = 'Estos términos explican qué hace Alquiler Real, qué sigue siendo responsabilidad del anfitrión y cómo cambia el alcance de la plataforma según si la seña y el acuerdo quedan dentro o fuera de la app.';

export const PLATFORM_TERMS_QUICK_GUIDE_INTRO = 'Lo importante en 1 minuto: quién publica, qué registra la plataforma, cuándo la seña queda retenida hasta check-in y cuándo corresponde revisión manual.';

export const PLATFORM_TERMS_QUICK_GUIDE_SECTIONS: PlatformTermsQuickGuideSection[] = [
  {
    id: 'who-publishes',
    title: 'Quién publica',
    body: 'Cada aviso lo carga un anfitrión. La app no es dueña del inmueble ni reemplaza el acuerdo entre las partes.',
  },
  {
    id: 'platform-role',
    title: 'Qué hace la plataforma',
    body: 'Conecta personas, ordena el proceso y deja registro de mensajes, estados y acciones cuando el flujo sigue dentro de la app.',
  },
  {
    id: 'inside-platform',
    title: 'Si la seña queda acá',
    body: 'Si la seña protegida queda registrada, queda retenida hasta check-in y la plataforma puede revisar lo asentado para evaluar existencia y acceso.',
  },
  {
    id: 'outside-platform',
    title: 'Si siguen por fuera',
    body: 'La app no registra ese pago ni interviene sobre conflictos, devoluciones o incumplimientos vinculados a ese tramo externo.',
  },
  {
    id: 'conflict-review',
    title: 'Cuándo puede revisar',
    body: 'Puede abrir revisión manual con la información registrada dentro de la app para evaluar existencia y acceso, pero no decide automáticamente todos los casos ni actúa como juez absoluto.',
  },
  {
    id: 'data-and-validation',
    title: 'Datos y validación',
    body: 'Puede recibir documentos, imágenes o datos de ubicación para dejar identidad, ubicación y acceso confirmados cuando el flujo lo permite. Lo sensible no se muestra públicamente.',
  },
];

export const PLATFORM_TERMS_HIGHLIGHTS = [
  'Cada aviso lo carga un anfitrión y cada anfitrión responde por la información publicada y por las condiciones reales del alojamiento.',
  'Alquiler Real funciona como herramienta de contacto, claridad y trazabilidad dentro de la app.',
  'Si la seña o el acuerdo relevante quedaron dentro de la app, la plataforma puede revisar lo registrado y ayudar a evaluar el caso.',
  'Si el pago o la seña fueron por fuera, la plataforma no administra ese dinero ni decide sobre devoluciones externas.',
  'Las validaciones ayudan a revisar mejor y a dejar identidad, ubicación y acceso confirmados cuando corresponde, pero no evaluamos estado, calidad ni amenities del inmueble.',
] as const;

export const PLATFORM_OPERATION_SCOPES: PlatformOperationScope[] = [
  {
    id: 'inside-platform',
    eyebrow: 'Dentro de la app',
    title: 'Cuando la seña queda registrada',
    bullets: [
      'La seña y el estado de la reserva quedan asentados.',
      'Hay trazabilidad de mensajes, acciones y cambios dentro del flujo.',
      'La plataforma puede revisar cancelaciones, problemas reportados o conflictos vinculados a esa seña interna.',
    ],
    tone: 'brand',
  },
  {
    id: 'outside-platform',
    eyebrow: 'Por fuera de la app',
    title: 'Cuando el pago o el acuerdo salen del flujo interno',
    bullets: [
      'La plataforma no registra ese pago ni administra ese dinero.',
      'Puede quedar el chat o el estado visible, pero no el movimiento económico externo.',
      'Los conflictos, devoluciones o incumplimientos de esa operación externa quedan entre huésped y anfitrión.',
    ],
    tone: 'neutral',
  },
];

export const PLATFORM_TERMS_CLAUSES: PlatformTermsClause[] = [
  {
    id: 'platform-role',
    eyebrow: 'Rol de la plataforma',
    title: 'Qué hace Alquiler Real',
    body: 'Alquiler Real conecta personas, ordena el proceso de reserva y deja registro de lo que pasa dentro de la app. No actúa como dueña del alojamiento, inmobiliaria ni evalúa estado, calidad ni amenities del inmueble.',
  },
  {
    id: 'property-information',
    eyebrow: 'Propiedades',
    title: 'Lo que muestra cada aviso',
    body: 'La información, las fotos, los servicios, las reglas y las descripciones de cada propiedad son proporcionadas por el anfitrión. Alquiler Real puede mostrar validaciones o historial visible, pero no evaluamos estado, calidad ni amenities del inmueble.',
  },
  {
    id: 'host-responsibility',
    eyebrow: 'Responsabilidad',
    title: 'Qué responde cada anfitrión',
    body: 'Cada anfitrión es responsable por la veracidad de lo que publica y por las condiciones reales del alojamiento al momento de la estadía, incluyendo acceso, limpieza, funcionamiento y servicios ofrecidos.',
  },
  {
    id: 'internal-operations',
    eyebrow: 'Operaciones internas',
    title: 'Qué pasa si la seña o el acuerdo relevante quedan dentro de la app',
    body: 'Cuando la seña o el acuerdo relevante se gestionan dentro de Alquiler Real, ese tramo queda registrado. Eso permite revisar mensajes, estados, reportes y comprobantes del flujo interno para ayudar a evaluar cómo sigue la reserva.',
  },
  {
    id: 'external-operations',
    eyebrow: 'Operaciones externas',
    title: 'Qué queda fuera de Alquiler Real',
    body: 'Cuando las partes hacen acuerdos, pagos o señas por fuera de la plataforma, Alquiler Real no interviene en esos movimientos, no actúa como parte del acuerdo y no decide sobre devoluciones o incumplimientos vinculados a operaciones externas.',
  },
  {
    id: 'conflict-review',
    eyebrow: 'Conflictos',
    title: 'Cómo puede revisar un caso la plataforma',
    body: 'Si el conflicto se vincula con información o acciones registradas dentro de la app, Alquiler Real puede abrir una revisión manual y ayudar a evaluar existencia y acceso. Esa revisión no decide automáticamente todos los casos ni convierte a la plataforma en juez absoluto de cualquier disputa.',
  },
  {
    id: 'verification-scope',
    eyebrow: 'Validaciones',
    title: 'Qué significan las validaciones y qué no significan',
    body: 'Las validaciones pueden dejar identidad, ubicación y acceso confirmados cuando el flujo disponible lo permite, además de vincular documentos o actividad registrada. Sirven para dar más contexto y trazabilidad. No evaluamos estado, calidad ni amenities.',
  },
  {
    id: 'deposits-and-cancellations',
    eyebrow: 'Seña y cancelaciones',
    title: 'Cómo se leen las devoluciones y revisiones',
    body: 'La seña no se considera automáticamente reembolsable en todos los casos. Si el flujo fue interno, la plataforma puede revisar cancelaciones, no show o problemas reportados según lo ocurrido y la información disponible. Si el pago fue por fuera, esa resolución queda entre huésped y anfitrión.',
  },
];

const bookingContractTermIds: PlatformTermsClauseId[] = [
  'platform-role',
  'host-responsibility',
  'internal-operations',
  'external-operations',
  'conflict-review',
  'verification-scope',
];

export const BOOKING_CONTRACT_PLATFORM_TERMS: BookingContractPlatformTerm[] = PLATFORM_TERMS_CLAUSES.map(({ id, title, body }) => ({
  id,
  title,
  body,
}))
  .filter((term) => bookingContractTermIds.includes(term.id));

export const PLATFORM_PROPERTY_DISCLAIMER = 'La información del aviso la carga el anfitrión. Puede haber identidad, ubicación y acceso confirmados según el flujo, pero no evaluamos estado, calidad ni amenities.';

export const PROTECTED_DEPOSIT_REFUND_PRIMARY = 'Si se reporta que la propiedad no existe o que no hubo acceso, la seña protegida pasa a revisión manual.';

export const PROTECTED_DEPOSIT_REFUND_EXCLUSIONS = [
  'el huésped cambia de opinión',
  'el huésped no se presenta',
  'el estado, la calidad o los amenities del inmueble no coinciden con lo esperado',
] as const;

export const PROTECTED_DEPOSIT_REFUND_SCOPE_NOTE = 'Alquiler Real revisa existencia y acceso con la información disponible. Según el flujo, la revisión puede incluir identidad, ubicación y acceso confirmados. No evaluamos estado, calidad ni amenities.';

export const PLATFORM_PUBLISHING_RESPONSIBILITY_NOTE = 'Al publicar, confirmás que las fotos, la descripción, los servicios, las reglas y las condiciones reales del alojamiento dependen de vos como anfitrión.';

export const PLATFORM_DIRECT_FLOW_NOTE = 'Si después coordinan la seña o el pago por fuera, la app no registra ese movimiento ni interviene sobre esa parte del acuerdo.';

export const PLATFORM_PROTECTED_FLOW_NOTE = 'Si más adelante dejan la seña dentro de la app, ese tramo queda registrado, la seña queda retenida hasta check-in y la plataforma puede abrir revisión manual sobre lo asentado.';