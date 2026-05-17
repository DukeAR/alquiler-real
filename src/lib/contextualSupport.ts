export const SUPPORT_ENTRY_POINTS = ['booking', 'conversation', 'checkin', 'review', 'publishing'] as const;

export type SupportEntryPoint = (typeof SUPPORT_ENTRY_POINTS)[number];

export const SUPPORT_CASE_STATUSES = ['received', 'in_review', 'waiting_response', 'resolved'] as const;

export type SupportCaseStatus = (typeof SUPPORT_CASE_STATUSES)[number];

export type SupportCaseReviewHistoryEntry = {
  id: string;
  eventType: 'case_opened' | 'status_updated';
  title: string;
  description: string;
  status: SupportCaseStatus;
  decision: string;
  note: string | null;
  actorName: string | null;
  actorId: string | null;
  actorType: 'user' | 'internal_operator';
  createdAt: string;
};

export const SUPPORT_CASE_CATEGORIES = [
  'no_access',
  'deposit_issue',
  'inappropriate_behavior',
  'listing_error',
  'other',
] as const;

export type SupportCaseCategory = (typeof SUPPORT_CASE_CATEGORIES)[number];

export const SUPPORT_CATEGORY_OPTIONS: Array<{
  value: SupportCaseCategory;
  label: string;
  description: string;
}> = [
  {
    value: 'no_access',
    label: 'No pude ingresar',
    description: 'Tomamos reserva, chat y horarios del ingreso para revisar mejor que paso.',
  },
  {
    value: 'deposit_issue',
    label: 'Problema con la sena',
    description: 'Sumamos el estado de la operacion y lo que quedo registrado dentro de la app.',
  },
  {
    value: 'inappropriate_behavior',
    label: 'Comportamiento inapropiado',
    description: 'Reunimos la operacion vinculada y el contexto disponible para revisar el caso.',
  },
  {
    value: 'listing_error',
    label: 'Error en publicacion',
    description: 'Guardamos la publicacion vinculada y el momento en que reportaste el problema.',
  },
  {
    value: 'other',
    label: 'Otro problema',
    description: 'Si no entra en una categoria puntual, igual dejamos el caso contextualizado.',
  },
];

export const SUPPORT_STATUS_COPY: Record<SupportCaseStatus, { label: string; description: string }> = {
  received: {
    label: 'Recibido',
    description: 'Lo registramos con el contexto disponible.',
  },
  in_review: {
    label: 'En revision',
    description: 'Estamos revisando lo asentado en la operacion.',
  },
  waiting_response: {
    label: 'Esperando respuesta',
    description: 'Necesitamos una aclaracion tuya o de la otra parte.',
  },
  resolved: {
    label: 'Resuelto',
    description: 'Cerramos el caso con la informacion disponible.',
  },
};