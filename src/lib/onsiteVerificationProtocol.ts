import type { PremiumVerificationOffer } from './premiumVerification';
import { VERIFIED_ONSITE_LABEL } from './productTerminology';

export type OnsiteVerificationProtocolStatus = 'approved' | 'rejected' | 'requires_review';

export type OnsiteVerificationFreshnessStatus = 'current' | 'requires_reverification';

export type OnsiteVerificationMaintenanceStatus = 'verified' | 'requires_reverification' | 'reverification_pending';

export type OnsiteVerificationMaintenanceReason = 'expiration' | 'address_change' | 'relevant_report' | 'detected_inconsistency';

export type OnsiteVerificationMaintenanceHistoryEntry = {
  id: string;
  date: string;
  status: OnsiteVerificationMaintenanceStatus;
  reason: OnsiteVerificationMaintenanceReason | null;
  actorLabel: string;
  notes: string | null;
};

export type OnsiteVerificationScopeItem = {
  key: 'physical_existence' | 'listing_match' | 'real_location' | 'host_access' | 'host_identity';
  title: string;
  description: string;
  shortLabel: string;
};

export type OnsiteVerificationExcludedItem = {
  key: 'property_quality' | 'cleanliness' | 'amenities' | 'technical_operation' | 'building_safety' | 'absolute_photo_accuracy';
  title: string;
  description: string;
};

export type OnsiteVerificationEvidenceItem = {
  key: 'facade_or_access_photo' | 'main_entry_or_interior_photo' | 'geolocation' | 'timestamp' | 'validation_status';
  title: string;
  description: string;
};

type OnsiteVerificationProtocolSource = {
  hasPresencialVerification?: boolean;
  onsiteVerifiedAt?: string | Date | null;
  manualReviewReady?: boolean;
  manualReviewCompleted?: boolean;
  onsiteVerificationStatus?: string | null;
  onsiteVerificationMaintenanceStatus?: string | null;
  onsiteVerificationLastValidatedAt?: string | Date | null;
  onsiteVerificationExpiresAt?: string | Date | null;
  onsiteVerificationTriggerReason?: string | null;
  onsiteVerificationMaintenanceHistory?: OnsiteVerificationMaintenanceHistoryEntry[] | null;
  premiumOnsiteOffer?: Pick<PremiumVerificationOffer, 'purchased' | 'completed'> | null;
};

export const ONSITE_VERIFICATION_LABEL = VERIFIED_ONSITE_LABEL;

export const ONSITE_VERIFICATION_SUMMARY = 'Confirmamos existencia física de la propiedad, coincidencia general con la publicación, ubicación real, acceso real del anfitrión e identidad básica durante una visita presencial.';

export const ONSITE_VERIFICATION_NON_SCOPE_SUMMARY = 'No verificamos calidad del inmueble, limpieza, amenities, funcionamiento técnico, seguridad edilicia ni exactitud absoluta de fotos.';

export const ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS = 6;

export const ONSITE_VERIFICATION_REVERIFICATION_LABEL = 'Requiere reverificación';

export const ONSITE_VERIFICATION_AVOIDED_TERMS = ['certificado', 'garantizado', 'inspeccionado'] as const;

export const ONSITE_VERIFICATION_OPERATING_PRINCIPLES = ['Operativo', 'Escalable', 'Legalmente consistente'] as const;

export const ONSITE_VERIFICATION_SCOPE_ITEMS: OnsiteVerificationScopeItem[] = [
  {
    key: 'physical_existence',
    title: 'Existencia física de la propiedad',
    shortLabel: 'Existencia física',
    description: 'Confirmamos que la propiedad existe físicamente en el lugar visitado.',
  },
  {
    key: 'listing_match',
    title: 'Coincidencia general con la publicación',
    shortLabel: 'Coincidencia general',
    description: 'Validamos una coincidencia general entre el lugar visitado y lo publicado, sin prometer exactitud absoluta de fotos.',
  },
  {
    key: 'real_location',
    title: 'Ubicación real',
    shortLabel: 'Ubicación real',
    description: 'Validamos que la ubicación registrada corresponde al lugar visitado.',
  },
  {
    key: 'host_access',
    title: 'Acceso real del anfitrión',
    shortLabel: 'Acceso real',
    description: 'Confirmamos que el anfitrión o su responsable tiene acceso real al lugar.',
  },
  {
    key: 'host_identity',
    title: 'Identidad básica del anfitrión',
    shortLabel: 'Identidad básica',
    description: 'Registramos la identidad básica de la persona que recibe la visita o acredita el aviso.',
  },
];

export const ONSITE_VERIFICATION_EXCLUDED_ITEMS: OnsiteVerificationExcludedItem[] = [
  {
    key: 'property_quality',
    title: 'Calidad del inmueble',
    description: 'No calificamos si el inmueble es mejor o peor que otras opciones.',
  },
  {
    key: 'cleanliness',
    title: 'Limpieza',
    description: 'La limpieza no forma parte de esta validación operativa.',
  },
  {
    key: 'amenities',
    title: 'Amenities',
    description: 'No verificamos la disponibilidad o calidad de amenities y servicios.',
  },
  {
    key: 'technical_operation',
    title: 'Funcionamiento técnico',
    description: 'No inspeccionamos instalaciones, artefactos ni funcionamiento técnico.',
  },
  {
    key: 'building_safety',
    title: 'Seguridad edilicia',
    description: 'No emitimos un juicio técnico sobre seguridad edilicia o estructural.',
  },
  {
    key: 'absolute_photo_accuracy',
    title: 'Exactitud absoluta de fotos',
    description: 'La coincidencia es general; no prometemos exactitud absoluta entre fotos y estado actual.',
  },
];

export const ONSITE_VERIFICATION_MINIMUM_EVIDENCE: OnsiteVerificationEvidenceItem[] = [
  {
    key: 'facade_or_access_photo',
    title: 'Foto de fachada o acceso',
    description: 'Deja una referencia visual mínima del ingreso o frente del lugar.',
  },
  {
    key: 'main_entry_or_interior_photo',
    title: 'Foto de ingreso o interior principal',
    description: 'Deja una segunda referencia visual mínima de acceso o interior principal.',
  },
  {
    key: 'geolocation',
    title: 'Geolocalización',
    description: 'Registra la geolocalización asociada a la visita.',
  },
  {
    key: 'timestamp',
    title: 'Timestamp',
    description: 'Registra fecha y hora de la revisión o aprobación.',
  },
  {
    key: 'validation_status',
    title: 'Estado de validación',
    description: 'Registra si la verificación quedó aprobada, rechazada o requiere revisión.',
  },
];

const ONSITE_VERIFICATION_STATUS_COPY: Record<OnsiteVerificationProtocolStatus, { label: string; description: string }> = {
  approved: {
    label: 'Aprobado',
    description: 'La evidencia mínima quedó registrada y la verificación presencial fue aprobada.',
  },
  rejected: {
    label: 'Rechazado',
    description: 'La revisión se cerró sin aprobar la presencial porque no alcanzó el protocolo mínimo.',
  },
  requires_review: {
    label: 'Requiere revisión',
    description: 'La coordinación o la visita existe, pero todavía falta revisar la evidencia mínima y cerrar el estado final.',
  },
};

const normalizeProtocolStatus = (value?: string | null): OnsiteVerificationProtocolStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'approved') {
    return 'approved';
  }

  if (normalizedValue === 'rejected') {
    return 'rejected';
  }

  if (normalizedValue === 'requires_review' || normalizedValue === 'pending_review' || normalizedValue === 'in_review') {
    return 'requires_review';
  }

  return null;
};

const normalizeMaintenanceStatus = (value?: string | null): OnsiteVerificationMaintenanceStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'verified' || normalizedValue === 'verificada') {
    return 'verified';
  }

  if (normalizedValue === 'requires_reverification' || normalizedValue === 'requiere_reverificacion' || normalizedValue === 'requires-reverification') {
    return 'requires_reverification';
  }

  if (normalizedValue === 'reverification_pending' || normalizedValue === 'reverificacion_pendiente' || normalizedValue === 'reverification-pending') {
    return 'reverification_pending';
  }

  return null;
};

const normalizeMaintenanceReason = (value?: string | null): OnsiteVerificationMaintenanceReason | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'expiration' || normalizedValue === 'vencimiento') {
    return 'expiration';
  }

  if (normalizedValue === 'address_change' || normalizedValue === 'important_address_change' || normalizedValue === 'cambio_importante_direccion') {
    return 'address_change';
  }

  if (normalizedValue === 'relevant_report' || normalizedValue === 'relevant_reports' || normalizedValue === 'reportes_relevantes') {
    return 'relevant_report';
  }

  if (normalizedValue === 'detected_inconsistency' || normalizedValue === 'inconsistency' || normalizedValue === 'inconsistencias_detectadas') {
    return 'detected_inconsistency';
  }

  return null;
};

const parseProtocolDate = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addMonths = (value: Date, months: number) => {
  const nextDate = new Date(value.getTime());
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
};

const resolveProtocolStatus = (source: OnsiteVerificationProtocolSource): OnsiteVerificationProtocolStatus | null => {
  const explicitStatus = normalizeProtocolStatus(source.onsiteVerificationStatus);

  if (explicitStatus) {
    return explicitStatus;
  }

  if (
    source.hasPresencialVerification
    || source.manualReviewCompleted
    || source.premiumOnsiteOffer?.completed
    || parseProtocolDate(source.onsiteVerifiedAt)
  ) {
    return 'approved';
  }

  if (source.manualReviewReady || source.premiumOnsiteOffer?.purchased) {
    return 'requires_review';
  }

  return null;
};

export const getOnsiteVerificationExpiryDate = (value?: string | Date | null) => {
  const parsedDate = parseProtocolDate(value);

  if (!parsedDate) {
    return null;
  }

  return addMonths(parsedDate, ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS).toISOString();
};

export const getOnsiteVerificationMaintenanceState = (source: OnsiteVerificationProtocolSource = {}) => {
  const explicitStatus = normalizeMaintenanceStatus(source.onsiteVerificationMaintenanceStatus);
  const lastValidatedAt = parseProtocolDate(source.onsiteVerificationLastValidatedAt ?? source.onsiteVerifiedAt);
  const explicitExpiresAt = parseProtocolDate(source.onsiteVerificationExpiresAt);
  const expiresAt = explicitExpiresAt ?? (lastValidatedAt ? addMonths(lastValidatedAt, ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS) : null);
  const triggerReason = normalizeMaintenanceReason(source.onsiteVerificationTriggerReason);
  const protocolStatus = resolveProtocolStatus(source);
  const hasApprovedHistory = Boolean(lastValidatedAt || source.hasPresencialVerification || source.manualReviewCompleted || protocolStatus === 'approved');
  const history = Array.isArray(source.onsiteVerificationMaintenanceHistory)
    ? source.onsiteVerificationMaintenanceHistory
        .filter((entry): entry is OnsiteVerificationMaintenanceHistoryEntry => Boolean(entry && typeof entry === 'object'))
        .map((entry) => ({
          ...entry,
          status: normalizeMaintenanceStatus(entry.status) ?? 'verified',
          reason: normalizeMaintenanceReason(entry.reason) ?? null,
          date: parseProtocolDate(entry.date)?.toISOString() ?? new Date().toISOString(),
          actorLabel: typeof entry.actorLabel === 'string' && entry.actorLabel.trim().length > 0 ? entry.actorLabel.trim() : 'Equipo Alquiler Real',
          notes: typeof entry.notes === 'string' && entry.notes.trim().length > 0 ? entry.notes.trim() : null,
        }))
    : [];

  let currentStatus: OnsiteVerificationMaintenanceStatus | null = null;

  if (explicitStatus === 'reverification_pending') {
    currentStatus = 'reverification_pending';
  } else if (hasApprovedHistory && expiresAt && expiresAt.getTime() <= Date.now()) {
    currentStatus = 'requires_reverification';
  } else if (explicitStatus === 'requires_reverification') {
    currentStatus = 'requires_reverification';
  } else if (hasApprovedHistory && protocolStatus === 'approved') {
    currentStatus = 'verified';
  } else if (explicitStatus === 'verified' && hasApprovedHistory) {
    currentStatus = 'verified';
  }

  const label = currentStatus === 'verified'
    ? 'Verificada'
    : currentStatus === 'requires_reverification'
      ? 'Requiere reverificación'
      : currentStatus === 'reverification_pending'
        ? 'Reverificación pendiente'
        : null;

  const description = currentStatus === 'verified'
    ? `La verificación presencial sigue vigente dentro de la ventana recomendada de ${ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS} meses.`
    : currentStatus === 'requires_reverification'
      ? 'La verificación presencial necesita actualizarse.'
      : currentStatus === 'reverification_pending'
        ? 'La verificación presencial necesita actualizarse. Ya quedó marcada para una nueva revisión.'
        : null;

  return {
    currentStatus,
    label,
    description,
    lastValidatedAt: lastValidatedAt?.toISOString() ?? null,
    expiresAt: expiresAt?.toISOString() ?? null,
    triggerReason,
    history,
    hasApprovedHistory,
    isCurrentlyValid: currentStatus === 'verified',
    needsRefresh: currentStatus === 'requires_reverification' || currentStatus === 'reverification_pending',
  };
};

export const buildOnsiteVerificationProtocol = (source: OnsiteVerificationProtocolSource = {}) => {
  const status = resolveProtocolStatus(source);
  const verifiedAt = status === 'approved' ? parseProtocolDate(source.onsiteVerifiedAt) : null;
  const expiresAt = verifiedAt ? addMonths(verifiedAt, ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS) : null;
  const maintenanceState = getOnsiteVerificationMaintenanceState(source);
  const freshnessStatus: OnsiteVerificationFreshnessStatus | null = status === 'approved' && expiresAt
    ? expiresAt.getTime() <= Date.now()
      ? 'requires_reverification'
      : 'current'
    : null;
  const statusCopy = status ? ONSITE_VERIFICATION_STATUS_COPY[status] : null;

  return {
    label: ONSITE_VERIFICATION_LABEL,
    summary: ONSITE_VERIFICATION_SUMMARY,
    exclusionsSummary: ONSITE_VERIFICATION_NON_SCOPE_SUMMARY,
    scopeItems: ONSITE_VERIFICATION_SCOPE_ITEMS,
    excludedItems: ONSITE_VERIFICATION_EXCLUDED_ITEMS,
    minimumEvidence: ONSITE_VERIFICATION_MINIMUM_EVIDENCE,
    statusOptions: (Object.entries(ONSITE_VERIFICATION_STATUS_COPY) as Array<[OnsiteVerificationProtocolStatus, { label: string; description: string }]>).map(([key, value]) => ({
      key,
      ...value,
    })),
    operatingPrinciples: ONSITE_VERIFICATION_OPERATING_PRINCIPLES,
    preferredCopy: ONSITE_VERIFICATION_LABEL,
    avoidedTerms: ONSITE_VERIFICATION_AVOIDED_TERMS,
    recommendedValidityMonths: ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS,
    reverificationLabel: ONSITE_VERIFICATION_REVERIFICATION_LABEL,
    status,
    statusLabel: statusCopy?.label ?? null,
    statusDescription: statusCopy?.description ?? null,
    verifiedAt: verifiedAt?.toISOString() ?? null,
    expiresAt: expiresAt?.toISOString() ?? null,
    maintenanceStatus: maintenanceState.currentStatus,
    maintenanceLabel: maintenanceState.label,
    maintenanceDescription: maintenanceState.description,
    maintenanceTriggerReason: maintenanceState.triggerReason,
    maintenanceHistory: maintenanceState.history,
    freshnessStatus,
    freshnessLabel: freshnessStatus === 'requires_reverification'
      ? ONSITE_VERIFICATION_REVERIFICATION_LABEL
      : freshnessStatus === 'current'
        ? 'Vigente'
        : null,
    freshnessDescription: freshnessStatus === 'requires_reverification'
      ? `Pasaron ${ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS} meses desde la última aprobación. Corresponde marcar requiere reverificación.`
      : freshnessStatus === 'current'
        ? `La aprobación sigue dentro de la ventana recomendada de ${ONSITE_VERIFICATION_RECOMMENDED_VALIDITY_MONTHS} meses.`
        : null,
  };
};