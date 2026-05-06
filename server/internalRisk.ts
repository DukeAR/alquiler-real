import { db } from './config/db';

type InternalRiskSeverity = 'low' | 'medium' | 'high';

export type InternalModerationStatus = 'clear' | 'warned' | 'limited' | 'suspended';

export type InternalRiskLevel = 'none' | 'medium' | 'high' | 'critical';

export type InternalRiskAction = 'publish_property' | 'create_booking' | 'start_conversation' | 'send_message' | 'access_boosts';

export type InternalBehaviorSignal = {
  code: string;
  severity: InternalRiskSeverity;
  source: 'messaging' | 'identity' | 'reports' | 'bookings' | 'responsiveness' | 'operations';
  detail: string;
  count?: number;
  weight: number;
  detectedAt: string;
};

type InternalRiskUserContext = {
  role: string | null;
  phone: string | null;
  bio: string | null;
  zone: string | null;
  profilePhoto: string | null;
  totalReviews: number;
  totalProperties: number;
  totalBookingsHosted: number;
  createdAt: string | null;
  memberSince: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  documentaryVerified: boolean;
  identityVerificationStatus: string | null;
};

export type InternalRiskSnapshot = {
  trustScore: number;
  riskScore: number;
  riskFlags: string[];
  behaviorSignals: InternalBehaviorSignal[];
  level: InternalRiskLevel;
  moderationStatus: InternalModerationStatus;
  strikesCount: number;
  visibilityPenalty: number;
  requiresAdditionalVerification: boolean;
  actionLimited: boolean;
  manualReviewRequired: boolean;
  accountLimitedUntil: string | null;
  accountBlockedUntil: string | null;
  newAccount: boolean;
  stableAccount: boolean;
  boostAccessUnlocked: boolean;
  recentPropertiesCount: number;
  activePropertiesCount: number;
  duplicateListingClusters: number;
  sentMessagesLast24h: number;
  confirmedReportsCount: number;
  confirmedSevereReportsCount: number;
  pendingReportScore: number;
  confirmedReportScore: number;
};

export type InternalRiskEvaluation = {
  userContext: InternalRiskUserContext;
  snapshot: InternalRiskSnapshot;
};

export type InternalRiskDecision = {
  blocked: boolean;
  reason?: string;
  evaluation?: InternalRiskEvaluation;
};

type InternalRiskProfileRow = InternalRiskUserContext & {
  strikesCount?: number | string | null;
  moderationStatus?: string | null;
  accountLimitedUntil?: string | Date | null;
  accountBlockedUntil?: string | Date | null;
  reportsCount?: number | string | null;
  pendingReportsCount?: number | string | null;
  confirmedReportsCount?: number | string | null;
  confirmedSevereReportsCount?: number | string | null;
  pendingReportScore?: number | string | null;
  confirmedReportScore?: number | string | null;
  guestCancellationsCount?: number | string | null;
  hostCancellationsCount?: number | string | null;
  blockedMessagesCount?: number | string | null;
  notAdvancedRequestsCount?: number | string | null;
  phoneMatchesCount?: number | string | null;
  dniMatchesCount?: number | string | null;
  dniNumber?: string | null;
  recentPropertiesCount?: number | string | null;
  activePropertiesCount?: number | string | null;
  duplicateListingClusters?: number | string | null;
  sentMessagesLast24h?: number | string | null;
};

type InternalRiskResponseRow = {
  conversation_id: string;
  sender_id: string;
  created_at: string | Date;
};

const MANUAL_REVIEW_MESSAGE = 'Necesitamos confirmar algunos datos antes de habilitar esta accion.';
const ADDITIONAL_VERIFICATION_MESSAGE = 'Esta accion requiere verificacion adicional.';
const NEW_ACCOUNT_PROPERTY_LIMIT = 2;
const NEW_ACCOUNT_MESSAGE_LIMIT = 25;
const BOOST_UNLOCK_MIN_ACCOUNT_AGE_DAYS = 14;
const NEW_ACCOUNT_WINDOW_DAYS = 30;
const STABLE_ACCOUNT_MIN_AGE_DAYS = 90;
const AUTO_LIMIT_DURATION_HOURS = 48;
const AUTO_BLOCK_DURATION_HOURS = 24 * 7;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTimestamp = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  }

  return null;
};

const toDateString = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return null;
};

const getDaysSince = (value: unknown, fallbackDays = 365) => {
  const timestamp = toTimestamp(value);

  if (timestamp === null) {
    return fallbackDays;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
};

const getFutureIso = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

const getFutureIsoOrNull = (value: unknown) => {
  const timestamp = toTimestamp(value);

  if (timestamp === null || timestamp <= Date.now()) {
    return null;
  }

  return new Date(timestamp).toISOString();
};

const getLatestFutureIso = (currentValue: string | null, candidateValue: string | null) => {
  if (!currentValue) {
    return candidateValue;
  }

  if (!candidateValue) {
    return currentValue;
  }

  return Date.parse(currentValue) >= Date.parse(candidateValue) ? currentValue : candidateValue;
};

const buildSignal = (
  code: string,
  severity: InternalRiskSeverity,
  source: InternalBehaviorSignal['source'],
  detail: string,
  weight: number,
  count?: number,
): InternalBehaviorSignal => ({
  code,
  severity,
  source,
  detail,
  weight,
  ...(typeof count === 'number' ? { count } : {}),
  detectedAt: new Date().toISOString(),
});

const getResponseMetrics = (rows: InternalRiskResponseRow[], userId: string) => {
  const responseTimes: number[] = [];
  const waitingMessages = new Map<string, number>();

  for (const row of rows) {
    const conversationId = row.conversation_id;
    const messageTime = new Date(row.created_at).getTime();

    if (!Number.isFinite(messageTime)) {
      continue;
    }

    if (row.sender_id === userId) {
      const pendingReplyAt = waitingMessages.get(conversationId);

      if (typeof pendingReplyAt === 'number') {
        responseTimes.push((messageTime - pendingReplyAt) / (1000 * 60));
        waitingMessages.delete(conversationId);
      }

      continue;
    }

    if (!waitingMessages.has(conversationId)) {
      waitingMessages.set(conversationId, messageTime);
    }
  }

  if (responseTimes.length === 0) {
    return { averageMinutes: 0, sampleCount: 0 };
  }

  const averageMinutes = Math.round(
    responseTimes.reduce((total, minutes) => total + minutes, 0) / responseTimes.length,
  );

  return { averageMinutes, sampleCount: responseTimes.length };
};

const getRiskLevel = (params: {
  riskScore: number;
  highSignalCount: number;
  mediumSignalCount: number;
  blockedMessagesCount: number;
  pendingReportsCount: number;
  duplicateSignals: number;
}) => {
  if (
    params.riskScore >= 75
    || params.highSignalCount >= 3
    || (params.highSignalCount >= 2 && params.pendingReportsCount >= 1)
    || (params.blockedMessagesCount > 0 && params.duplicateSignals > 0)
  ) {
    return 'critical' as const;
  }

  if (params.riskScore >= 45 || params.highSignalCount >= 1) {
    return 'high' as const;
  }

  if (params.riskScore >= 20 || params.mediumSignalCount >= 1) {
    return 'medium' as const;
  }

  return 'none' as const;
};

const resolveModerationStatus = (params: {
  strikesCount: number;
  accountLimitedUntil: string | null;
  accountBlockedUntil: string | null;
}): InternalModerationStatus => {
  if (params.accountBlockedUntil || params.strikesCount >= 3) {
    return 'suspended';
  }

  if (params.accountLimitedUntil || params.strikesCount >= 2) {
    return 'limited';
  }

  if (params.strikesCount >= 1) {
    return 'warned';
  }

  return 'clear';
};

const isStableAccount = (params: {
  accountAgeDays: number;
  strikesCount: number;
  confirmedReportsCount: number;
  pendingReportsCount: number;
  blockedMessagesCount: number;
  duplicateSignals: number;
  totalChangeEvents: number;
}) => (
  params.accountAgeDays >= STABLE_ACCOUNT_MIN_AGE_DAYS
  && params.strikesCount === 0
  && params.confirmedReportsCount === 0
  && params.pendingReportsCount === 0
  && params.blockedMessagesCount === 0
  && params.duplicateSignals === 0
  && params.totalChangeEvents <= 1
);

export const evaluateInternalRisk = async (userId: string): Promise<InternalRiskEvaluation | null> => {
  const profileResult = await db.query(
    `SELECT u.role,
            u.phone,
            u.bio,
            u.zone,
            u.profile_photo as "profilePhoto",
            COALESCE(u.total_reviews, 0)::int as "totalReviews",
            COALESCE(u.total_properties, 0)::int as "totalProperties",
            COALESCE(u.total_bookings_hosted, 0)::int as "totalBookingsHosted",
            u.created_at as "createdAt",
            COALESCE(u.member_since, u.created_at) as "memberSince",
            u.dni_number as "dniNumber",
            (COALESCE(u.email_verified, FALSE) OR COALESCE(u.is_email_verified, FALSE)) as "emailVerified",
            (COALESCE(u.phone_verified, FALSE) OR COALESCE(u.is_phone_verified, FALSE)) as "phoneVerified",
            (COALESCE(u.identity_validated, FALSE) OR COALESCE(u.is_identity_verified, FALSE)) as "documentaryVerified",
            COALESCE(u.identity_verification_status, CASE WHEN COALESCE(u.identity_validated, FALSE) OR COALESCE(u.is_identity_verified, FALSE) THEN 'verified' ELSE 'unverified' END) as "identityVerificationStatus",
            COALESCE(u.internal_strikes_count, 0)::int as "strikesCount",
            COALESCE(NULLIF(u.internal_moderation_status, ''), 'clear') as "moderationStatus",
            u.internal_account_limited_until as "accountLimitedUntil",
            u.internal_account_blocked_until as "accountBlockedUntil",
            COALESCE(report_stats.total_reports, 0)::int as "reportsCount",
            COALESCE(report_stats.pending_reports, 0)::int as "pendingReportsCount",
            COALESCE(report_stats.confirmed_reports, 0)::int as "confirmedReportsCount",
            COALESCE(report_stats.confirmed_severe_reports, 0)::int as "confirmedSevereReportsCount",
            COALESCE(report_stats.pending_report_score, 0)::numeric as "pendingReportScore",
            COALESCE(report_stats.confirmed_report_score, 0)::numeric as "confirmedReportScore",
            COALESCE(cancel_stats.guest_cancellations, 0)::int as "guestCancellationsCount",
            COALESCE(cancel_stats.host_cancellations, 0)::int as "hostCancellationsCount",
            COALESCE(activity_stats.blocked_messages, 0)::int as "blockedMessagesCount",
            COALESCE(activity_stats.not_advanced_requests, 0)::int as "notAdvancedRequestsCount",
            COALESCE(phone_dup.matches, 0)::int as "phoneMatchesCount",
            COALESCE(dni_dup.matches, 0)::int as "dniMatchesCount",
            COALESCE(listing_stats.active_properties, 0)::int as "activePropertiesCount",
            COALESCE(listing_stats.recent_properties, 0)::int as "recentPropertiesCount",
            COALESCE(listing_stats.duplicate_listing_clusters, 0)::int as "duplicateListingClusters",
            COALESCE(message_stats.sent_messages_last_24h, 0)::int as "sentMessagesLast24h"
     FROM users u
     LEFT JOIN (
       SELECT reported_user_id as user_id,
              COUNT(*)::int as total_reports,
              COUNT(*) FILTER (WHERE status = 'pending')::int as pending_reports,
              COUNT(*) FILTER (WHERE status IN ('reviewed', 'action_taken'))::int as confirmed_reports,
              COUNT(*) FILTER (WHERE status IN ('reviewed', 'action_taken') AND COALESCE(severity, 'standard') = 'severe')::int as confirmed_severe_reports,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN COALESCE(reporter_weight, 1) ELSE 0 END), 0)::numeric as pending_report_score,
              COALESCE(SUM(CASE WHEN status IN ('reviewed', 'action_taken') THEN COALESCE(reporter_weight, 1) ELSE 0 END), 0)::numeric as confirmed_report_score
       FROM reports
       WHERE reported_user_id = $1
         AND created_at >= NOW() - INTERVAL '180 days'
       GROUP BY reported_user_id
     ) report_stats ON report_stats.user_id = u.id
     LEFT JOIN (
       SELECT subject_id as user_id,
              COUNT(*) FILTER (WHERE actor = 'guest')::int as guest_cancellations,
              COUNT(*) FILTER (WHERE actor = 'host')::int as host_cancellations
       FROM (
         SELECT b."userId" as subject_id, 'guest'::text as actor
         FROM bookings b
         WHERE b."userId" = $1
           AND b.status = 'cancelled'
           AND b.cancellation_actor = 'guest'
           AND b.created_at >= NOW() - INTERVAL '120 days'
         UNION ALL
         SELECT p."hostId" as subject_id, 'host'::text as actor
         FROM bookings b
         JOIN properties p ON p.id = b."propertyId"
         WHERE p."hostId" = $1
           AND b.status = 'cancelled'
           AND b.cancellation_actor = 'host'
           AND b.created_at >= NOW() - INTERVAL '120 days'
       ) cancellation_events
       GROUP BY subject_id
     ) cancel_stats ON cancel_stats.user_id = u.id
     LEFT JOIN (
       SELECT user_id,
              COUNT(*) FILTER (WHERE action = 'SUSPICIOUS_MESSAGE_BLOCKED' AND created_at >= NOW() - INTERVAL '90 days')::int as blocked_messages,
              COUNT(*) FILTER (WHERE action = 'BOOKING_REQUEST_NOT_ADVANCED' AND created_at >= NOW() - INTERVAL '90 days')::int as not_advanced_requests
       FROM user_activity_logs
       WHERE user_id = $1
       GROUP BY user_id
     ) activity_stats ON activity_stats.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int as matches
       FROM users dupe
       WHERE u.phone IS NOT NULL
         AND dupe.phone = u.phone
         AND dupe.id <> $1
     ) phone_dup ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int as matches
       FROM users dupe
       WHERE u.dni_number IS NOT NULL
         AND dupe.dni_number = u.dni_number
         AND dupe.id <> $1
     ) dni_dup ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*) FILTER (WHERE host_properties.status = 'active')::int as active_properties,
              COUNT(*) FILTER (WHERE host_properties.created_at >= NOW() - INTERVAL '14 days')::int as recent_properties,
              COALESCE((
                SELECT COUNT(*)::int
                FROM (
                  SELECT LOWER(TRIM(COALESCE(duplicate_properties.title, ''))) as title_key,
                         LOWER(TRIM(COALESCE(duplicate_properties.location, ''))) as location_key,
                         COALESCE(duplicate_properties."imageUrl", '') as image_key
                  FROM properties duplicate_properties
                  WHERE duplicate_properties."hostId" = $1
                    AND COALESCE(duplicate_properties.status, 'active') <> 'archived'
                  GROUP BY 1, 2, 3
                  HAVING COUNT(*) > 1
                ) duplicate_groups
              ), 0)::int as duplicate_listing_clusters
       FROM properties host_properties
       WHERE host_properties."hostId" = $1
     ) listing_stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int as sent_messages_last_24h
       FROM messages recent_messages
       WHERE recent_messages.sender_id = $1
         AND recent_messages.created_at >= NOW() - INTERVAL '24 hours'
         AND COALESCE(recent_messages.is_system, FALSE) = FALSE
     ) message_stats ON TRUE
     WHERE u.id = $1`,
    [userId],
  );

  const profile = profileResult.rows[0] as InternalRiskProfileRow | undefined;

  if (!profile) {
    return null;
  }

  const responseResult = await db.query(
    `SELECT c.id as conversation_id, m.sender_id, m.created_at
     FROM conversations c
     JOIN messages m ON m.conversation_id = c.id
     WHERE c.host_id = $1 OR c.tenant_id = $1
     ORDER BY c.id ASC, m.created_at ASC`,
    [userId],
  );

  const reportsCount = toSafeNumber(profile.reportsCount);
  const pendingReportsCount = toSafeNumber(profile.pendingReportsCount);
  const confirmedReportsCount = toSafeNumber(profile.confirmedReportsCount);
  const confirmedSevereReportsCount = toSafeNumber(profile.confirmedSevereReportsCount);
  const pendingReportScore = toSafeNumber(profile.pendingReportScore);
  const confirmedReportScore = toSafeNumber(profile.confirmedReportScore);
  const guestCancellationsCount = toSafeNumber(profile.guestCancellationsCount);
  const hostCancellationsCount = toSafeNumber(profile.hostCancellationsCount);
  const blockedMessagesCount = toSafeNumber(profile.blockedMessagesCount);
  const notAdvancedRequestsCount = toSafeNumber(profile.notAdvancedRequestsCount);
  const phoneMatchesCount = toSafeNumber(profile.phoneMatchesCount);
  const dniMatchesCount = toSafeNumber(profile.dniMatchesCount);
  const totalProperties = toSafeNumber(profile.totalProperties);
  const totalBookingsHosted = toSafeNumber(profile.totalBookingsHosted);
  const strikesCount = toSafeNumber(profile.strikesCount);
  const recentPropertiesCount = toSafeNumber(profile.recentPropertiesCount);
  const activePropertiesCount = toSafeNumber(profile.activePropertiesCount);
  const duplicateListingClusters = toSafeNumber(profile.duplicateListingClusters);
  const sentMessagesLast24h = toSafeNumber(profile.sentMessagesLast24h);
  const totalChangeEvents = guestCancellationsCount + hostCancellationsCount + notAdvancedRequestsCount;
  const duplicateSignals = Number(phoneMatchesCount > 0) + Number(dniMatchesCount > 0);
  const accountAgeDays = getDaysSince(profile.memberSince ?? profile.createdAt);
  const newAccount = accountAgeDays < NEW_ACCOUNT_WINDOW_DAYS && totalProperties < 4 && toSafeNumber(profile.totalReviews) < 4;
  const stableAccount = isStableAccount({
    accountAgeDays,
    strikesCount,
    confirmedReportsCount,
    pendingReportsCount,
    blockedMessagesCount,
    duplicateSignals,
    totalChangeEvents,
  });
  const boostAccessUnlocked = stableAccount
    || accountAgeDays >= BOOST_UNLOCK_MIN_ACCOUNT_AGE_DAYS
    || totalProperties > 0
    || totalBookingsHosted > 0
    || toSafeNumber(profile.totalReviews) > 0
    || Boolean(profile.documentaryVerified);
  const responseMetrics = getResponseMetrics(responseResult.rows as InternalRiskResponseRow[], userId);
  const signals: InternalBehaviorSignal[] = [];
  const frictionDetails: string[] = [];

  if (blockedMessagesCount > 0) {
    signals.push(
      buildSignal(
        'off_platform_payment_attempt',
        'high',
        'messaging',
        blockedMessagesCount === 1
          ? 'Se bloqueo un intento de compartir datos o cobros por fuera de la plataforma.'
          : `Se bloquearon ${blockedMessagesCount} intentos de compartir datos o cobros por fuera de la plataforma.`,
        clamp(35 + ((blockedMessagesCount - 1) * 10), 35, 55),
        blockedMessagesCount,
      ),
    );
  }

  if (phoneMatchesCount > 0 || dniMatchesCount > 0) {
    const duplicateDetails: string[] = [];

    if (phoneMatchesCount > 0) {
      duplicateDetails.push(`${phoneMatchesCount} coincidencia${phoneMatchesCount === 1 ? '' : 's'} de telefono`);
    }

    if (dniMatchesCount > 0) {
      duplicateDetails.push(`${dniMatchesCount} coincidencia${dniMatchesCount === 1 ? '' : 's'} de documento`);
    }

    signals.push(
      buildSignal(
        'duplicate_account_candidate',
        'high',
        'identity',
        `Detectamos ${duplicateDetails.join(' y ')} asociadas a otra cuenta activa.`,
        40,
        phoneMatchesCount + dniMatchesCount,
      ),
    );
  }

  const inconsistentDataDetails: string[] = [];

  if (profile.phoneVerified && !profile.phone) {
    inconsistentDataDetails.push('el telefono aparece verificado sin un numero cargado');
  }

  if (profile.documentaryVerified && !profile.dniNumber) {
    inconsistentDataDetails.push('la identidad figura validada sin documento asociado');
  }

  if (profile.identityVerificationStatus === 'verified' && !profile.documentaryVerified) {
    inconsistentDataDetails.push('hay un estado documental verificado sin respaldo activo');
  }

  if (inconsistentDataDetails.length > 0) {
    signals.push(
      buildSignal(
        'inconsistent_data',
        'high',
        'identity',
        `Encontramos inconsistencias internas: ${inconsistentDataDetails.join(', ')}.`,
        30,
        inconsistentDataDetails.length,
      ),
    );
  }

  if (confirmedReportsCount >= 1) {
    signals.push(
      buildSignal(
        confirmedSevereReportsCount > 0 ? 'confirmed_severe_report' : 'confirmed_report',
        'high',
        'reports',
        confirmedSevereReportsCount > 0
          ? `Hay ${confirmedSevereReportsCount} reporte${confirmedSevereReportsCount === 1 ? '' : 's'} grave${confirmedSevereReportsCount === 1 ? '' : 's'} confirmado${confirmedSevereReportsCount === 1 ? '' : 's'} y ${confirmedReportsCount} revision${confirmedReportsCount === 1 ? '' : 'es'} confirmada${confirmedReportsCount === 1 ? '' : 's'} en total.`
          : `Hay ${confirmedReportsCount} reporte${confirmedReportsCount === 1 ? '' : 's'} confirmado${confirmedReportsCount === 1 ? '' : 's'} con revision interna completada.`,
        confirmedSevereReportsCount > 0 ? 48 : 34,
        confirmedReportsCount,
      ),
    );
  }

  if (pendingReportsCount >= 2 || pendingReportScore >= 2.2 || reportsCount >= 3) {
    signals.push(
      buildSignal(
        'report_pattern',
        pendingReportScore >= 3 || pendingReportsCount >= 3 ? 'high' : 'medium',
        'reports',
        `Se acumularon ${reportsCount} reportes recientes y ${pendingReportsCount} siguen pendientes de revision con un peso agregado de ${pendingReportScore.toFixed(1)}.`,
        pendingReportScore >= 3 || pendingReportsCount >= 3 ? 30 : 18,
        reportsCount,
      ),
    );
  } else if (reportsCount >= 1) {
    frictionDetails.push(reportsCount === 1 ? 'un reporte reciente pendiente de contexto' : `${reportsCount} reportes recientes aislados`);
  }

  if (duplicateListingClusters >= 2) {
    signals.push(
      buildSignal(
        'duplicate_listings',
        'high',
        'operations',
        `Detectamos ${duplicateListingClusters} grupos de publicaciones muy parecidas asociadas a la misma cuenta.`,
        28,
        duplicateListingClusters,
      ),
    );
  } else if (duplicateListingClusters === 1) {
    signals.push(
      buildSignal(
        'duplicate_listing_warning',
        'medium',
        'operations',
        'Encontramos un grupo de publicaciones duplicadas o casi identicas dentro de la misma cuenta.',
        18,
        duplicateListingClusters,
      ),
    );
  }

  if (newAccount && recentPropertiesCount > NEW_ACCOUNT_PROPERTY_LIMIT) {
    signals.push(
      buildSignal(
        'new_account_publication_burst',
        'high',
        'operations',
        `La cuenta es reciente y ya publico ${recentPropertiesCount} avisos en poco tiempo.`,
        26,
        recentPropertiesCount,
      ),
    );
  } else if (newAccount && recentPropertiesCount === NEW_ACCOUNT_PROPERTY_LIMIT) {
    frictionDetails.push('la cuenta nueva ya alcanzo su cupo inicial de publicaciones');
  }

  if (newAccount && sentMessagesLast24h >= NEW_ACCOUNT_MESSAGE_LIMIT + 10) {
    signals.push(
      buildSignal(
        'message_spam_burst',
        'high',
        'messaging',
        `La cuenta reciente intento sostener ${sentMessagesLast24h} mensajes en menos de 24 horas.`,
        28,
        sentMessagesLast24h,
      ),
    );
  } else if (newAccount && sentMessagesLast24h >= NEW_ACCOUNT_MESSAGE_LIMIT) {
    signals.push(
      buildSignal(
        'message_rate_limit',
        'medium',
        'messaging',
        `La cuenta reciente alcanzo ${sentMessagesLast24h} mensajes en menos de 24 horas.`,
        16,
        sentMessagesLast24h,
      ),
    );
  }

  if (totalChangeEvents >= 4) {
    signals.push(
      buildSignal(
        'suspicious_cancellations',
        'high',
        'bookings',
        `Se detectaron ${totalChangeEvents} cancelaciones o cambios repetidos en los ultimos meses.`,
        30,
        totalChangeEvents,
      ),
    );
  } else if (totalChangeEvents >= 2) {
    signals.push(
      buildSignal(
        'constant_changes',
        'medium',
        'operations',
        `Hubo ${totalChangeEvents} cambios de rumbo entre cancelaciones o solicitudes frenadas recientemente.`,
        18,
        totalChangeEvents,
      ),
    );
  } else if (totalChangeEvents === 1) {
    frictionDetails.push('una friccion puntual entre cancelaciones o cambios de solicitud');
  }

  if (responseMetrics.sampleCount >= 2 && responseMetrics.averageMinutes >= 360) {
    signals.push(
      buildSignal(
        'low_response',
        'medium',
        'responsiveness',
        `El promedio de respuesta subio a ${responseMetrics.averageMinutes} minutos en ${responseMetrics.sampleCount} intercambios recientes.`,
        18,
        responseMetrics.sampleCount,
      ),
    );
  } else if (responseMetrics.sampleCount >= 2 && responseMetrics.averageMinutes >= 180) {
    frictionDetails.push(`respuestas mas lentas de lo habitual (${responseMetrics.averageMinutes} minutos en promedio)`);
  }

  const volatileDimensions = [
    blockedMessagesCount > 0,
    confirmedReportsCount > 0,
    pendingReportsCount >= 2,
    totalChangeEvents >= 2,
    responseMetrics.sampleCount >= 2 && responseMetrics.averageMinutes >= 360,
    duplicateSignals > 0,
    duplicateListingClusters > 0,
    inconsistentDataDetails.length > 0,
  ].filter(Boolean).length;

  if (volatileDimensions >= 3) {
    signals.push(
      buildSignal(
        'erratic_behavior',
        'medium',
        'operations',
        'Se combinaron varios eventos de comportamiento inestable en un periodo corto.',
        20,
        volatileDimensions,
      ),
    );
  }

  if (frictionDetails.length > 0) {
    signals.push(
      buildSignal(
        'minor_friction',
        'low',
        'operations',
        `Se observaron fricciones menores: ${frictionDetails.join(', ')}.`,
        8,
        frictionDetails.length,
      ),
    );
  }

  const riskScore = clamp(
    signals.reduce((total, signal) => total + signal.weight, 0),
    0,
    100,
  );
  const trustScore = clamp(100 - riskScore, 0, 100);
  const highSignalCount = signals.filter((signal) => signal.severity === 'high').length;
  const mediumSignalCount = signals.filter((signal) => signal.severity === 'medium').length;
  const level = getRiskLevel({
    riskScore,
    highSignalCount,
    mediumSignalCount,
    blockedMessagesCount,
    pendingReportsCount,
    duplicateSignals,
  });
  const visibilityPenalty = level === 'critical' ? 100 : level === 'high' ? 36 : level === 'medium' ? 18 : 0;
  const currentLimitedUntil = getFutureIsoOrNull(profile.accountLimitedUntil);
  const currentBlockedUntil = getFutureIsoOrNull(profile.accountBlockedUntil);
  const autoLimitedUntil = level === 'high' && !currentLimitedUntil ? getFutureIso(AUTO_LIMIT_DURATION_HOURS) : null;
  const autoBlockedUntil = level === 'critical' && !currentBlockedUntil ? getFutureIso(AUTO_BLOCK_DURATION_HOURS) : null;
  const accountLimitedUntil = getLatestFutureIso(currentLimitedUntil, autoLimitedUntil);
  const accountBlockedUntil = getLatestFutureIso(currentBlockedUntil, autoBlockedUntil);
  const moderationStatus = resolveModerationStatus({
    strikesCount,
    accountLimitedUntil,
    accountBlockedUntil,
  });
  const requiresAdditionalVerification = moderationStatus === 'limited'
    || moderationStatus === 'suspended'
    || level === 'high'
    || level === 'critical';
  const actionLimited = moderationStatus === 'limited'
    || moderationStatus === 'suspended'
    || level === 'high'
    || level === 'critical';
  const manualReviewRequired = moderationStatus === 'suspended' || level === 'critical' || confirmedSevereReportsCount > 0;
  const riskFlags = Array.from(new Set(signals.map((signal) => signal.code)));

  await db.query(
    `UPDATE users
     SET risk_score = $2,
         internal_trust_score = $3,
         internal_risk_flags = $4::jsonb,
         internal_behavior_signals = $5::jsonb,
         internal_risk_level = $6,
         internal_visibility_penalty = $7,
         internal_requires_additional_verification = $8,
         internal_action_limited = $9,
         internal_manual_review_required = $10,
         internal_moderation_status = $11,
         internal_account_limited_until = $12,
         internal_account_blocked_until = $13,
         internal_risk_updated_at = NOW()
     WHERE id = $1`,
    [
      userId,
      riskScore,
      trustScore,
      JSON.stringify(riskFlags),
      JSON.stringify(signals),
      level,
      visibilityPenalty,
      requiresAdditionalVerification,
      actionLimited,
      manualReviewRequired,
      moderationStatus,
      accountLimitedUntil,
      accountBlockedUntil,
    ],
  );

  return {
    userContext: {
      role: profile.role ?? null,
      phone: profile.phone ?? null,
      bio: profile.bio ?? null,
      zone: profile.zone ?? null,
      profilePhoto: profile.profilePhoto ?? null,
      totalReviews: toSafeNumber(profile.totalReviews),
      totalProperties,
      totalBookingsHosted,
      createdAt: toDateString(profile.createdAt),
      memberSince: toDateString(profile.memberSince),
      emailVerified: Boolean(profile.emailVerified),
      phoneVerified: Boolean(profile.phoneVerified),
      documentaryVerified: Boolean(profile.documentaryVerified),
      identityVerificationStatus: profile.identityVerificationStatus ?? null,
    },
    snapshot: {
      trustScore,
      riskScore,
      riskFlags,
      behaviorSignals: signals,
      level,
      moderationStatus,
      strikesCount,
      visibilityPenalty,
      requiresAdditionalVerification,
      actionLimited,
      manualReviewRequired,
      accountLimitedUntil,
      accountBlockedUntil,
      newAccount,
      stableAccount,
      boostAccessUnlocked,
      recentPropertiesCount,
      activePropertiesCount,
      duplicateListingClusters,
      sentMessagesLast24h,
      confirmedReportsCount,
      confirmedSevereReportsCount,
      pendingReportScore,
      confirmedReportScore,
    },
  };
};

export const getInternalRiskDecision = async (
  userId: string,
  action: InternalRiskAction,
): Promise<InternalRiskDecision> => {
  const evaluation = await evaluateInternalRisk(userId);

  if (!evaluation) {
    return { blocked: true, reason: 'No encontramos esa cuenta.' };
  }

  if (evaluation.userContext.role === 'blocked') {
    return {
      blocked: true,
      reason: MANUAL_REVIEW_MESSAGE,
      evaluation,
    };
  }

  if (evaluation.snapshot.moderationStatus === 'suspended') {
    return {
      blocked: true,
      reason: 'La cuenta quedo temporalmente suspendida mientras revisamos la actividad reciente.',
      evaluation,
    };
  }

  if (evaluation.snapshot.manualReviewRequired) {
    return {
      blocked: true,
      reason: MANUAL_REVIEW_MESSAGE,
      evaluation,
    };
  }

  if (action === 'publish_property' && evaluation.snapshot.duplicateListingClusters >= 1) {
    return {
      blocked: true,
      reason: 'Detectamos publicaciones muy parecidas en esta cuenta. Revisalas antes de crear un nuevo aviso.',
      evaluation,
    };
  }

  if (action === 'publish_property' && evaluation.snapshot.newAccount && evaluation.snapshot.recentPropertiesCount >= NEW_ACCOUNT_PROPERTY_LIMIT) {
    return {
      blocked: true,
      reason: `Las cuentas nuevas pueden publicar hasta ${NEW_ACCOUNT_PROPERTY_LIMIT} avisos al inicio. Suma historial real para ampliar ese cupo.`,
      evaluation,
    };
  }

  if (action === 'send_message' && evaluation.snapshot.newAccount && evaluation.snapshot.sentMessagesLast24h >= NEW_ACCOUNT_MESSAGE_LIMIT) {
    return {
      blocked: true,
      reason: 'Esta cuenta nueva ya alcanzo el limite diario de mensajes. Retoma manana o consolida mas historial en la plataforma.',
      evaluation,
    };
  }

  if (action === 'access_boosts' && !evaluation.snapshot.boostAccessUnlocked) {
    return {
      blocked: true,
      reason: 'Los boosts se habilitan de forma gradual cuando la cuenta ya tiene algo de historial estable en la plataforma.',
      evaluation,
    };
  }

  if (evaluation.snapshot.actionLimited) {
    return {
      blocked: true,
      reason: ADDITIONAL_VERIFICATION_MESSAGE,
      evaluation,
    };
  }

  return {
    blocked: false,
    evaluation,
  };
};
