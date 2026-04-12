export type PrivacyPolicyQuickGuideSectionId =
  | 'data-collected'
  | 'usage'
  | 'verification'
  | 'public-vs-private'
  | 'support-review'
  | 'user-controls';

export type PrivacyPolicyQuickGuideSection = {
  id: PrivacyPolicyQuickGuideSectionId;
  title: string;
  body: string;
};

export type PrivacyPolicySectionId =
  | 'data-collected'
  | 'usage'
  | 'verification'
  | 'public-vs-private'
  | 'storage-and-care'
  | 'user-controls';

export type PrivacyPolicySection = {
  id: PrivacyPolicySectionId;
  eyebrow: string;
  title: string;
  body: string;
};

export const PRIVACY_POLICY_INTRO = 'Esta política explica qué datos puede recibir Alquiler Real, para qué se usan y qué parte de esa información queda privada dentro del producto.';

export const PRIVACY_POLICY_QUICK_GUIDE_INTRO = 'En menos de un minuto: qué datos usamos para operar la app, qué puede servir para validar o revisar casos y qué nunca se muestra públicamente.';

export const PRIVACY_POLICY_QUICK_GUIDE_SECTIONS: PrivacyPolicyQuickGuideSection[] = [
  {
    id: 'data-collected',
    title: 'Qué datos recibimos',
    body: 'Datos de cuenta, perfil, reservas, chats y contenido que subís para publicar, validar o pedir soporte.',
  },
  {
    id: 'usage',
    title: 'Para qué se usan',
    body: 'Para operar la app, ordenar reservas, mostrar comprobaciones visibles, prevenir abuso y atender soporte.',
  },
  {
    id: 'verification',
    title: 'Documentos y validación',
    body: 'Podemos recibir documentos, selfies, imágenes, videos o datos de ubicación cuando elegís usar una validación o cuando hace falta revisar un caso.',
  },
  {
    id: 'public-vs-private',
    title: 'Qué queda público y qué no',
    body: 'La información sensible, los documentos privados y las coordenadas usadas para validar no se muestran como parte pública del aviso o del perfil.',
  },
  {
    id: 'support-review',
    title: 'Soporte y revisión',
    body: 'Mensajes, estados y registros dentro de la app pueden usarse para revisar problemas, reservas y reportes vinculados al flujo interno.',
  },
  {
    id: 'user-controls',
    title: 'Tus opciones',
    body: 'Podés revisar y actualizar datos de cuenta, pedir asistencia y consultar por información cargada dentro de los límites legales y operativos.',
  },
];

export const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    id: 'data-collected',
    eyebrow: 'Datos',
    title: 'Qué información puede recibir la plataforma',
    body: 'Alquiler Real puede recibir datos de cuenta, contacto, perfil, publicaciones, reservas, mensajes y contenido que cada persona carga para usar la app. Según el flujo, también puede recibir documentos, imágenes, videos, comprobantes o registros de ubicación para procesos de validación, confianza, soporte o revisión.',
  },
  {
    id: 'usage',
    eyebrow: 'Uso',
    title: 'Para qué usamos esa información',
    body: 'La información se usa para operar la app, ordenar el proceso entre huésped y anfitrión, mostrar comprobaciones visibles, prevenir abuso, revisar casos vinculados a flujos internos y responder consultas o reportes de soporte.',
  },
  {
    id: 'verification',
    eyebrow: 'Validación',
    title: 'Cómo tratamos documentos, imágenes, videos y datos de validación',
    body: 'Cuando una persona usa procesos de validación o respaldo, la plataforma puede recibir documentos, selfies, imágenes, videos, comprobantes o registros asociados a esa revisión. Ese material se usa como apoyo para validación, moderación, soporte o análisis de un caso y no se considera contenido público por defecto.',
  },
  {
    id: 'public-vs-private',
    eyebrow: 'Visibilidad',
    title: 'Qué parte puede verse públicamente y qué parte queda privada',
    body: 'La plataforma solo muestra como parte visible del producto la información que el flujo define como pública, por ejemplo ciertas comprobaciones, fotos del aviso, reseñas o datos básicos del perfil. Los documentos privados, selfies, comprobantes sensibles y coordenadas usadas para validar no se exponen públicamente.',
  },
  {
    id: 'storage-and-care',
    eyebrow: 'Resguardo',
    title: 'Cómo cuidamos la información sensible',
    body: 'Alquiler Real aplica medidas razonables de acceso, revisión y resguardo acordes al tipo de información y al uso que cumple dentro del producto. Eso no implica una promesa absoluta de invulnerabilidad, pero sí un criterio de uso restringido para datos sensibles y material privado.',
  },
  {
    id: 'user-controls',
    eyebrow: 'Control',
    title: 'Qué puede hacer cada persona sobre sus datos',
    body: 'Cada persona puede actualizar datos de cuenta y perfil desde la app y pedir asistencia cuando necesite revisar, corregir o consultar información cargada dentro del producto. Algunas piezas pueden conservarse mientras sean necesarias para operar la cuenta, sostener reservas, cumplir obligaciones aplicables o revisar incidentes reportados.',
  },
];

export const VERIFICATION_PRIVACY_NOTICES = {
  documentary: 'Los documentos, selfies e imágenes que cargás para validación se usan para verificación, soporte o revisión interna. No se muestran públicamente.',
  propertyDocuments: 'Los documentos privados del aviso se usan para validación, moderación, soporte o revisión interna. No se publican en la ficha.',
  geolocation: 'La coordenada o registro de ubicación se usa como respaldo de validación o revisión del caso. No se muestra como dato exacto dentro del aviso público.',
  bookingSupport: 'Los mensajes, estados y acciones registradas dentro de la app pueden usarse para soporte, prevención de abuso y revisión de problemas vinculados al flujo interno.',
} as const;