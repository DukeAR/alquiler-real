import { db } from './config/db';

type InternalRiskSeverity = 'low' | 'medium' | 'high';

export type InternalRiskLevel = 'none' | 'medium' | 'high' | 'critical';

export type InternalRiskAction = 'publish_property' | 'create_booking' | 'start_conversation' | 'send_message';

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
  visibilityPenalty: number;
  requiresAdditionalVerification: boolean;
  actionLimited: boolean;
  manualReviewRequired: boolean;
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
  reportsCount?: number | string | null;
  pendingReportsCount?: number | string | null;
  guestCancellationsCount?: number | string | null;
  hostCancellationsCount?: number | string | null;
  blockedMessagesCount?: number | string | null;
  notAdvancedRequestsCount?: number | string | null;
  phoneMatchesCount?: number | string | null;
  dniMatchesCount?: number | string | null;
  dniNumber?: string | null;
};

type InternalRiskResponseRow = {
  conversation_id: string;
  sender_id: string;
  created_at: string | Date;
};

const MANUAL_REVIEW_MESSAGE = 'Necesitamos confirmar algunos datos antes de habilitar esta acción.';
const ADDITIONAL_VERIFICATION_MESSAGE = 'Esta acción requiere verificación adicional.';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

export const evaluateInternalRisk = async (userId: string): Promise<InternalRiskEvaluation | null> => {
  const profileResult = await db.query(
    `SELECT u.role,
            u.phone,
            u.bio,
            u.zone,
            u.profile_photo as "profilePhoto",
            COALESCE(u.total_reviews, 0)::int as "totalReviews",
            u.dni_number as "dniNumber",
            (COALESCE(u.email_verified, FALSE) OR COALESCE(u.is_email_verified, FALSE)) as "emailVerified",
            (COALESCE(u.phone_verified, FALSE) OR COALESCE(u.is_phone_verified, FALSE)) as "phoneVerified",
            (COALESCE(u.identity_validated, FALSE) OR COALESCE(u.is_identity_verified, FALSE)) as "documentaryVerified",
            COALESCE(u.identity_verification_status, CASE WHEN COALESCE(u.identity_validated, FALSE) OR COALESCE(u.is_identity_verified, FALSE) THEN 'verified' ELSE 'unverified' END) as "identityVerificationStatus",
            COALESCE(report_stats.total_reports, 0)::int as "reportsCount",
            COALESCE(report_stats.pending_reports, 0)::int as "pendingReportsCount",
            COALESCE(cancel_stats.guest_cancellations, 0)::int as "guestCancellationsCount",
            COALESCE(cancel_stats.host_cancellations, 0)::int as "hostCancellationsCount",
            COALESCE(activity_stats.blocked_messages, 0)::int as "blockedMessagesCount",
            COALESCE(activity_stats.not_advanced_requests, 0)::int as "notAdvancedRequestsCount",
            COALESCE(phone_dup.matches, 0)::int as "phoneMatchesCount",
            COALESCE(dni_dup.matches, 0)::int as "dniMatchesCount"
     FROM users u
     LEFT JOIN (
       SELECT reported_user_id as user_id,
              COUNT(*)::int as total_reports,
              COUNT(*) FILTER (WHERE status = 'pending')::int as pending_reports
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
  const guestCancellationsCount = toSafeNumber(profile.guestCancellationsCount);
  const hostCancellationsCount = toSafeNumber(profile.hostCancellationsCount);
  const blockedMessagesCount = toSafeNumber(profile.blockedMessagesCount);
  const notAdvancedRequestsCount = toSafeNumber(profile.notAdvancedRequestsCount);
  const phoneMatchesCount = toSafeNumber(profile.phoneMatchesCount);
  const dniMatchesCount = toSafeNumber(profile.dniMatchesCount);
  const totalChangeEvents = guestCancellationsCount + hostCancellationsCount + notAdvancedRequestsCount;
  const duplicateSignals = Number(phoneMatchesCount > 0) + Number(dniMatchesCount > 0);
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
          ? 'Se bloqueó un intento de compartir datos o cobros por fuera de la plataforma.'
          : `Se bloquearon ${blockedMessagesCount} intentos de compartir datos o cobros por fuera de la plataforma.`,
        clamp(35 + ((blockedMessagesCount - 1) * 10), 35, 55),
        blockedMessagesCount,
      ),
    );
  }

  if (phoneMatchesCount > 0 || dniMatchesCount > 0) {
    const duplicateDetails: string[] = [];

    if (phoneMatchesCount > 0) {
      duplicateDetails.push(`${phoneMatchesCount} coincidencia${phoneMatchesCount === 1 ? '' : 's'} de teléfono`);
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
    inconsistentDataDetails.push('el teléfono aparece verificado sin un número cargado');
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

  if (pendingReportsCount >= 2 || reportsCount >= 3) {
    signals.push(
      buildSignal(
        'report_pattern',
        'high',
        'reports',
        `Se acumularon ${reportsCount} reportes recientes y ${pendingReportsCount} siguen pendientes de revisión.`,
        28,
        reportsCount,
      ),
    );
  } else if (reportsCount >= 1) {
    frictionDetails.push(reportsCount === 1 ? 'un reporte reciente pendiente de contexto' : `${reportsCount} reportes recientes aislados`);
  }

  if (totalChangeEvents >= 4) {
    signals.push(
      buildSignal(
        'suspicious_cancellations',
        'high',
        'bookings',
        `Se detectaron ${totalChangeEvents} cancelaciones o cambios repetidos en los últimos meses.`,
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
    frictionDetails.push('una fricción puntual entre cancelaciones o cambios de solicitud');
  }

  if (responseMetrics.sampleCount >= 2 && responseMetrics.averageMinutes >= 360) {
    signals.push(
      buildSignal(
        'low_response',
        'medium',
        'responsiveness',
        `El promedio de respuesta subió a ${responseMetrics.averageMinutes} minutos en ${responseMetrics.sampleCount} intercambios recientes.`,
        18,
        responseMetrics.sampleCount,
      ),
    );
  } else if (responseMetrics.sampleCount >= 2 && responseMetrics.averageMinutes >= 180) {
    frictionDetails.push(`respuestas más lentas de lo habitual (${responseMetrics.averageMinutes} minutos en promedio)`);
  }

  const volatileDimensions = [
    blockedMessagesCount > 0,
    reportsCount > 0,
    totalChangeEvents >= 2,
    responseMetrics.sampleCount >= 2 && responseMetrics.averageMinutes >= 360,
    duplicateSignals > 0,
    inconsistentDataDetails.length > 0,
  ].filter(Boolean).length;

  if (volatileDimensions >= 3) {
    signals.push(
      buildSignal(
        'erratic_behavior',
        'medium',
        'operations',
        'Se combinaron varios eventos de comportamiento inestable en un período corto.',
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
  const visibilityPenalty = level === 'critical' ? 100 : level === 'high' ? 32 : level === 'medium' ? 12 : 0;
  const requiresAdditionalVerification = level === 'high' || level === 'critical';
  const actionLimited = level === 'high' || level === 'critical';
  const manualReviewRequired = level === 'critical';
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
      visibilityPenalty,
      requiresAdditionalVerification,
      actionLimited,
      manualReviewRequired,
    },
  };
};

export const getInternalRiskDecision = async (
  userId: string,
  _action: InternalRiskAction,
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

  if (evaluation.snapshot.manualReviewRequired) {
    return {
      blocked: true,
      reason: MANUAL_REVIEW_MESSAGE,
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