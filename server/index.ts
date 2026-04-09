import express, { type Express } from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import cors from 'cors';
import multer from 'multer';
import { serverEnv } from './config/env';
import { db } from './config/db';
import { initDB } from './updates';
import { mapPropertyRecord } from './propertySerializer';
import { buildGuestVerification } from './guestVerification';
import { buildHostTrust } from './hostTrust';
import { REAL_VERIFICATION_FILTER_MIN_SCORE } from './propertyVerification';
import { getChatSystemMessages, getRequestAcceptedMessage, type ChatSystemMessageKey } from './chatSystemMessages';
import { buildGuestProfileCompletion } from '../src/lib/guestVerification';
import { buildUserVerificationStatus } from '../src/lib/userVerification';
import {
  PREMIUM_DOCUMENTARY_OFFER_TYPE,
  PREMIUM_ONSITE_OFFER_TYPE,
  PREMIUM_VERIFICATION_CURRENCY,
  type PremiumVerificationOffer,
  type PremiumVerificationOfferType,
  type PremiumVerificationPaymentStatus,
  type PremiumVerificationProcessStatus,
  type PremiumVerificationTargetType,
} from '../src/lib/premiumVerification';

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const app: Express = express();
const port = serverEnv.port;
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const SESSION_SENSITIVE_ROUTE_PATTERNS = [
  /^\/api\/auth(?:\/|$)/,
  /^\/api\/notifications(?:\/|$)/,
  /^\/api\/favorites(?:\/|$)/,
] as const;

const isSessionSensitiveRoute = (path: string) => SESSION_SENSITIVE_ROUTE_PATTERNS.some((pattern) => pattern.test(path));

const applySessionSensitiveHeaders = (res: express.Response) => {
  res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.vary('Cookie');
  res.vary('Origin');
};

const persistSession = (req: express.Request) => new Promise<void>((resolve, reject) => {
  if (!req.session || typeof req.session.save !== 'function') {
    resolve();
    return;
  }

  req.session.save((error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

if (serverEnv.trustProxy) {
  app.set('trust proxy', 1);
}

// Configure CORS FIRST - before any other middleware
const allowedOrigins = serverEnv.corsAllowedOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl requests, etc)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // For legacy browsers
}));

// Parse JSON bodies AFTER CORS
app.use(express.json());

const PgStore = pgSession(session);
app.use(session({
  store: new PgStore({ conString: serverEnv.databaseUrl }),
  name: serverEnv.sessionCookieName,
  proxy: serverEnv.trustProxy,
  secret: serverEnv.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: serverEnv.sessionCookieSecure,
    httpOnly: true,
    sameSite: serverEnv.sessionCookieSameSite,
    domain: serverEnv.sessionCookieDomain,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.use((req, res, next) => {
  if (isSessionSensitiveRoute(req.path)) {
    applySessionSensitiveHeaders(res);
  }

  next();
});

// Initialize Database
if (!serverEnv.isTest) {
  initDB().then(() => {
    console.log('Base de datos inicializada');
  }).catch(err => {
    console.error('Error inicializando base de datos:', err);
  });
}

// LOGGING UTILITY
const logActivity = async (userId: string, action: string, metadata: any = {}, ip_address: string = '') => {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.query(
      `INSERT INTO user_activity_logs (id, user_id, action, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, action, JSON.stringify(metadata), ip_address]
    );
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

const AUTH_REQUIRED_ERROR = 'Necesitás iniciar sesión para seguir.';

const NOTIFIABLE_ACTIVITY_ACTIONS = [
  'PASSWORD_CHANGED',
  'IDENTITY_VERIFIED',
  'IDENTITY_DOCUMENTS_SUBMITTED',
  'PREMIUM_VERIFICATION_PURCHASED',
  'PROPERTY_ONSITE_VERIFIED',
  'PROPERTY_AVAILABILITY_UPDATED',
  'BOOKING_CREATED',
  'BOOKING_REQUEST_ACCEPTED',
  'BOOKING_CANCELLED',
] as const;

type PremiumVerificationOrderRow = {
  id: string;
  offerType: PremiumVerificationOfferType;
  targetType: PremiumVerificationTargetType;
  propertyId?: string | null;
  priceArs?: number | string | null;
  paymentStatus: PremiumVerificationPaymentStatus;
  verificationStatus: PremiumVerificationProcessStatus;
  isPromotional?: boolean | null;
  completedAt?: string | Date | null;
};

type PremiumPromotionalUsageRow = {
  offerType: PremiumVerificationOfferType;
  usedCount: number | string;
};

const PREMIUM_VERIFICATION_ORDER_SELECT = `id,
  offer_type as "offerType",
  target_type as "targetType",
  property_id as "propertyId",
  price_ars as "priceArs",
  payment_status as "paymentStatus",
  verification_status as "verificationStatus",
  is_promotional as "isPromotional",
  completed_at as "completedAt"`;

const getPremiumBasePrice = (offerType: PremiumVerificationOfferType) => (
  offerType === PREMIUM_ONSITE_OFFER_TYPE
    ? serverEnv.premiumOnsitePriceArs
    : serverEnv.premiumDocumentaryPriceArs
);

const getPremiumFreeSlots = (offerType: PremiumVerificationOfferType) => (
  offerType === PREMIUM_ONSITE_OFFER_TYPE
    ? serverEnv.premiumOnsiteFreeSlots
    : serverEnv.premiumDocumentaryFreeSlots
);

const toSafeInteger = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : 0;
};

const isPremiumOrderUnlocked = (order?: PremiumVerificationOrderRow | null) => (
  Boolean(order && (order.paymentStatus === 'confirmed' || order.paymentStatus === 'waived'))
);

const isPremiumOrderCompleted = (order?: PremiumVerificationOrderRow | null) => (
  Boolean(order && order.verificationStatus === 'completed')
);

const getPremiumPromotionalUsageCount = (
  rows: PremiumPromotionalUsageRow[],
  offerType: PremiumVerificationOfferType,
) => {
  const row = rows.find((entry) => entry.offerType === offerType);
  return toSafeInteger(row?.usedCount);
};

const buildPremiumComplimentaryReason = (offerType: PremiumVerificationOfferType, basePrice: number, isComplimentary: boolean) => {
  if (!isComplimentary) {
    return null;
  }

  if (basePrice === 0) {
    return 'Disponible sin cargo en esta etapa de lanzamiento.';
  }

  return offerType === PREMIUM_ONSITE_OFFER_TYPE
    ? 'Disponible sin cargo para algunas propiedades durante el lanzamiento.'
    : 'Disponible sin cargo para los primeros usuarios durante el lanzamiento.';
};

const getPremiumOfferPricing = (
  offerType: PremiumVerificationOfferType,
  usageRows: PremiumPromotionalUsageRow[],
  existingOrder?: PremiumVerificationOrderRow | null,
) => {
  const basePrice = existingOrder ? toSafeInteger(existingOrder.priceArs) : getPremiumBasePrice(offerType);
  const complimentarySlots = getPremiumFreeSlots(offerType);
  const usedComplimentarySlots = getPremiumPromotionalUsageCount(usageRows, offerType);
  const isComplimentary = existingOrder
    ? Boolean(existingOrder.isPromotional) || basePrice === 0
    : basePrice === 0 || usedComplimentarySlots < complimentarySlots;

  return {
    priceArs: isComplimentary ? 0 : basePrice,
    isComplimentary,
    complimentaryReason: buildPremiumComplimentaryReason(offerType, basePrice, isComplimentary),
  };
};

const buildPremiumRedirectPath = (input: {
  offerType: PremiumVerificationOfferType;
  orderId?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
  returnTo: string;
}) => {
  const searchParams = new URLSearchParams({
    mode: input.offerType === PREMIUM_ONSITE_OFFER_TYPE ? 'onsite' : 'documentary',
    returnTo: input.returnTo,
  });

  if (input.orderId) {
    searchParams.set('orderId', input.orderId);
  }

  if (input.propertyId) {
    searchParams.set('propertyId', input.propertyId);
  }

  if (input.propertyTitle) {
    searchParams.set('propertyTitle', input.propertyTitle);
  }

  return `/verification?${searchParams.toString()}`;
};

const buildDocumentaryPremiumOffer = (input: {
  order?: PremiumVerificationOrderRow | null;
  usageRows: PremiumPromotionalUsageRow[];
  documentaryVerified: boolean;
  returnTo?: string;
}): PremiumVerificationOffer => {
  const pricing = getPremiumOfferPricing(PREMIUM_DOCUMENTARY_OFFER_TYPE, input.usageRows, input.order);
  const purchased = input.documentaryVerified || isPremiumOrderUnlocked(input.order);
  const completed = input.documentaryVerified || isPremiumOrderCompleted(input.order);

  return {
    offerType: PREMIUM_DOCUMENTARY_OFFER_TYPE,
    targetType: 'user',
    title: 'Comprobación documental adicional',
    summary: 'Podés sumar DNI y selfie como información validada extra sobre tu cuenta.',
    contextHint: 'Mostramos qué está comprobado para que otros puedan decidir mejor. Esta comprobación se suma a tu perfil, no reemplaza tu historial ni vuelve obligatorio el alta.',
    visibilityHint: 'Suma una comprobación documental visible junto al resto de la información validada de tu cuenta.',
    ctaLabel: completed
      ? 'Comprobación documental lista'
      : purchased
        ? 'Continuar comprobación documental'
        : pricing.isComplimentary
          ? 'Activar comprobación sin cargo'
          : 'Activar comprobación documental',
    checkoutLabel: pricing.isComplimentary ? 'Activar sin cargo' : 'Confirmar comprobación',
    processLabel: completed ? 'Ver comprobación documental' : 'Ir a la comprobación',
    priceArs: pricing.priceArs,
    currency: PREMIUM_VERIFICATION_CURRENCY,
    isComplimentary: pricing.isComplimentary,
    complimentaryReason: pricing.complimentaryReason,
    purchased,
    completed,
    redirectTo: buildPremiumRedirectPath({
      offerType: PREMIUM_DOCUMENTARY_OFFER_TYPE,
      orderId: input.order?.id ?? null,
      returnTo: input.returnTo ?? '/profile',
    }),
    orderId: input.order?.id ?? null,
  };
};

const buildOnsitePremiumOffer = (input: {
  order?: PremiumVerificationOrderRow | null;
  usageRows: PremiumPromotionalUsageRow[];
  propertyId: string;
  propertyTitle: string;
  onsiteVerified: boolean;
  returnTo?: string;
}): PremiumVerificationOffer => {
  const pricing = getPremiumOfferPricing(PREMIUM_ONSITE_OFFER_TYPE, input.usageRows, input.order);
  const purchased = input.onsiteVerified || isPremiumOrderUnlocked(input.order);
  const completed = input.onsiteVerified || isPremiumOrderCompleted(input.order);

  return {
    offerType: PREMIUM_ONSITE_OFFER_TYPE,
    targetType: 'property',
    title: 'Comprobación presencial adicional',
    summary: 'Podés pedir una revisión presencial para sumar información validada extra en este aviso.',
    contextHint: 'Mostramos qué está comprobado para que se entienda mejor el aviso. Esta revisión es opcional y no reemplaza las otras comprobaciones.',
    visibilityHint: 'Cuando se completa, deja una comprobación presencial visible dentro de la ficha del aviso.',
    ctaLabel: completed
      ? 'Comprobación presencial lista'
      : purchased
        ? 'Continuar revisión presencial'
        : pricing.isComplimentary
          ? 'Activar comprobación presencial sin cargo'
          : 'Activar comprobación presencial',
    checkoutLabel: pricing.isComplimentary ? 'Activar sin cargo' : 'Confirmar comprobación',
    processLabel: completed ? 'Ver estado de la comprobación' : 'Ir a la coordinación',
    priceArs: pricing.priceArs,
    currency: PREMIUM_VERIFICATION_CURRENCY,
    isComplimentary: pricing.isComplimentary,
    complimentaryReason: pricing.complimentaryReason,
    purchased,
    completed,
    redirectTo: buildPremiumRedirectPath({
      offerType: PREMIUM_ONSITE_OFFER_TYPE,
      orderId: input.order?.id ?? null,
      propertyId: input.propertyId,
      propertyTitle: input.propertyTitle,
      returnTo: input.returnTo ?? '/host-dashboard',
    }),
    orderId: input.order?.id ?? null,
    propertyId: input.propertyId,
    propertyTitle: input.propertyTitle,
  };
};

const getPremiumPromotionalUsageRows = async () => {
  const result = await db.query(
    `SELECT offer_type as "offerType", COUNT(*)::int as "usedCount"
     FROM premium_verification_orders
     WHERE is_promotional = TRUE
     GROUP BY offer_type`,
  );

  return result.rows as PremiumPromotionalUsageRow[];
};

const getLatestPremiumOrder = async (input: {
  userId: string;
  offerType: PremiumVerificationOfferType;
  propertyId?: string | null;
  orderId?: string | null;
}) => {
  const params: Array<string> = [input.userId, input.offerType];
  let whereClause = 'user_id = $1 AND offer_type = $2';

  if (input.propertyId) {
    params.push(input.propertyId);
    whereClause += ` AND property_id = $${params.length}`;
  }

  if (input.orderId) {
    params.push(input.orderId);
    whereClause += ` AND id = $${params.length}`;
  }

  const result = await db.query(
    `SELECT ${PREMIUM_VERIFICATION_ORDER_SELECT}
     FROM premium_verification_orders
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT 1`,
    params,
  );

  return (result.rows[0] as PremiumVerificationOrderRow | undefined) ?? null;
};

const getLatestPropertyPremiumOrders = async (userId: string) => {
  const result = await db.query(
    `SELECT DISTINCT ON (property_id) ${PREMIUM_VERIFICATION_ORDER_SELECT}
     FROM premium_verification_orders
     WHERE user_id = $1
       AND offer_type = $2
       AND property_id IS NOT NULL
     ORDER BY property_id, created_at DESC`,
    [userId, PREMIUM_ONSITE_OFFER_TYPE],
  );

  return result.rows as PremiumVerificationOrderRow[];
};

const markPremiumOrderState = async (
  orderId: string,
  verificationStatus: PremiumVerificationProcessStatus,
) => {
  await db.query(
    `UPDATE premium_verification_orders
     SET verification_status = $1,
         updated_at = NOW(),
         completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END
     WHERE id = $2`,
    [verificationStatus, orderId],
  );
};

const requireDocumentaryPremiumAccess = async (userId: string, orderId?: string | null) => {
  const userResult = await db.query(
    `SELECT (COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE)) as "documentaryVerified"
     FROM users
     WHERE id = $1`,
    [userId],
  );
  const user = userResult.rows[0];

  if (!user) {
    return { allowed: false, error: 'No encontramos esa cuenta.', order: null as PremiumVerificationOrderRow | null };
  }

  if (Boolean(user.documentaryVerified)) {
    return { allowed: true, error: null, order: null as PremiumVerificationOrderRow | null };
  }

  const order = await getLatestPremiumOrder({
    userId,
    offerType: PREMIUM_DOCUMENTARY_OFFER_TYPE,
    orderId,
  });

  if (!isPremiumOrderUnlocked(order)) {
    return {
      allowed: false,
      error: 'Primero activá la comprobación documental adicional desde tu perfil.',
      order: null as PremiumVerificationOrderRow | null,
    };
  }

  return { allowed: true, error: null, order };
};

const normalizeActivityMetadata = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }

  return {};
};

const mapActivityLogToNotification = (row: any) => {
  const metadata = normalizeActivityMetadata(row?.metadata);
  const createdAt = row?.createdAt || row?.created_at || new Date().toISOString();
  const unread = !row?.readAt && !row?.read_at;

  switch (row?.action) {
    case 'PASSWORD_CHANGED':
      return {
        id: row.id,
        title: 'Contraseña actualizada',
        message: 'Tu contraseña se actualizó correctamente.',
        type: 'success',
        createdAt,
        unread,
      };
    case 'IDENTITY_VERIFIED':
      return {
        id: row.id,
        title: 'Comprobación documental lista',
        message: 'Tu cuenta sumó una comprobación documental adicional.',
        type: 'success',
        createdAt,
        unread,
      };
    case 'IDENTITY_DOCUMENTS_SUBMITTED':
      return {
        id: row.id,
        title: 'Documentación enviada',
        message: metadata.hasProofOfAddress
          ? 'Recibimos tu documentación opcional y el comprobante adicional.'
          : 'Recibimos tu documentación opcional para sumar respaldo a la cuenta.',
        type: 'info',
        createdAt,
        unread,
      };
    case 'PREMIUM_VERIFICATION_PURCHASED':
      return {
        id: row.id,
        title: metadata.offerType === PREMIUM_ONSITE_OFFER_TYPE ? 'Comprobación presencial activada' : 'Comprobación documental activada',
        message: metadata.isPromotional
          ? 'La comprobación adicional quedó activada sin cargo y ya podés seguir con el proceso.'
          : 'La comprobación adicional quedó activada y ya podés seguir con el proceso.',
        type: 'success',
        createdAt,
        unread,
      };
    case 'PROPERTY_ONSITE_VERIFIED':
      return {
        id: row.id,
        title: 'Revisión presencial confirmada',
        message: metadata.propertyTitle
          ? `La revisión presencial de ${metadata.propertyTitle} ya quedó confirmada.`
          : 'La revisión presencial de tu publicación ya quedó confirmada.',
        type: 'success',
        createdAt,
        unread,
      };
    case 'PROPERTY_AVAILABILITY_UPDATED':
      return {
        id: row.id,
        title: 'Disponibilidad actualizada',
        message: 'Guardamos los cambios de disponibilidad de tu publicación.',
        type: 'info',
        createdAt,
        unread,
      };
    case 'BOOKING_CREATED':
      return {
        id: row.id,
        title: metadata.requestMode === 'protected' ? 'Solicitud enviada' : 'Reserva confirmada',
        message: metadata.requestMode === 'protected'
          ? 'La solicitud protegida ya quedó registrada. Cuando el anfitrión la acepte, vas a ver cómo seguir.'
          : 'Registramos tu reserva. Revisá las fechas y los próximos pasos en Mis reservas.',
        type: metadata.requestMode === 'protected' ? 'info' : 'success',
        createdAt,
        unread,
      };
    case 'BOOKING_REQUEST_ACCEPTED':
      return {
        id: row.id,
        title: metadata.requestMode === 'protected' ? 'Solicitud aceptada' : 'Propuesta aceptada',
        message: metadata.requestMode === 'protected'
          ? 'Ya podés pagar la seña desde la app y seguir por chat con el anfitrión.'
          : 'Tu propuesta fue aceptada. Si ya enviaste la seña, informala por chat para cerrar la reserva.',
        type: 'success',
        createdAt,
        unread,
      };
    case 'BOOKING_CANCELLED':
      return {
        id: row.id,
        title: 'Reserva cancelada',
        message: 'La cancelación quedó registrada correctamente.',
        type: 'warning',
        createdAt,
        unread,
      };
    default:
      return null;
  }
};

// ==========================================
// ANTI-FRAUDE & RISK SYSTEM
// ==========================================

// Chat Filter Middleware
const filterChatMiddleware = async (req: any, res: any, next: any) => {
  const { text } = req.body;
  if (!text) return next();

  const phoneRegex = /(\+?\d{1,4}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;

  if (phoneRegex.test(text) || emailRegex.test(text) || linkRegex.test(text)) {
    const userId = req.session.userId;
    await logActivity(userId || 'anonymous', 'SUSPICIOUS_MESSAGE_BLOCKED', { text }, req.ip);
    
    // Increment risk_score for suspicious behavior
    if (userId) {
      await db.query(`UPDATE users SET risk_score = risk_score + 10 WHERE id = $1`, [userId]);
    }

    return res.status(403).json({ 
      error: 'Por tu seguridad, no podés compartir contactos, redes ni datos externos por acá. Mantené todo dentro de la plataforma.' 
    });
  }
  next();
};

// POST /api/reports
app.post('/api/reports', async (req, res) => {
  const { reported_user_id, reason, description } = req.body;
  const reporterId = req.session.userId;

  if (!reporterId || !reported_user_id || !reason) {
    return res.status(400).json({ error: 'Completá los datos necesarios para enviar el reporte.' });
  }

  try {
    const id = `rep_${Date.now()}`;
    await db.query(
      `INSERT INTO reports (id, reported_user_id, reported_by_user_id, reason, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, reported_user_id, reporterId, reason, description]
    );

    // Increment risk_score of reported user
    await db.query(`UPDATE users SET risk_score = risk_score + 15 WHERE id = $1`, [reported_user_id]);

    // Check for critical risk
    const userRes = await db.query(`SELECT risk_score FROM users WHERE id = $1`, [reported_user_id]);
    if (userRes.rows[0]?.risk_score >= 80) {
      // Auto-block if risk is critical
      await db.query(`UPDATE users SET role = 'blocked' WHERE id = $1`, [reported_user_id]);
      await db.query(`UPDATE properties SET status = 'inactive' WHERE "hostId" = $1`, [reported_user_id]);
      await logActivity('system', 'AUTO_BLOCK_CRITICAL_RISK', { userId: reported_user_id });
    }

    res.json({ success: true, message: 'Recibimos tu reporte. Lo vamos a revisar.' });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos enviar el reporte. Intentá de nuevo.' });
  }
});

// POST /api/chat/analyze - Gemini-powered but with local filter
app.post('/api/chat/analyze', filterChatMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Escribí un mensaje para continuar.' });
  
  // Basic simulation of analysis (since we don't have the real Gemini API key here)
  const isSuspicious = message.toLowerCase().includes('cbu') || message.toLowerCase().includes('depósito');
  
  res.json({
    isScam: isSuspicious,
    reason: isSuspicious ? 'Detectamos un intento de pedir pago externo o compartir datos bancarios.' : '',
    riskLevel: isSuspicious ? 'high' : 'low'
  });
});

// Helper for Risk Check
const checkUserRisk = async (userId: string) => {
  const res = await db.query(
    `SELECT risk_score,
            role,
            phone,
            bio,
            zone,
            profile_photo as "profilePhoto",
            total_reviews as "totalReviews",
            (COALESCE(email_verified, FALSE) OR COALESCE(is_email_verified, FALSE)) as "emailVerified",
            (COALESCE(phone_verified, FALSE) OR COALESCE(is_phone_verified, FALSE)) as "phoneVerified",
            (COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE)) as "documentaryVerified"
     FROM users
     WHERE id = $1`,
    [userId],
  );
  const user = res.rows[0];
  if (!user) return { blocked: true, reason: 'No encontramos esa cuenta.' };
  if (user.role === 'blocked') return { blocked: true, reason: 'Bloqueamos tu cuenta por seguridad. Si creés que es un error, contactanos.' };
  if (user.risk_score >= 80) return { blocked: true, reason: 'Detectamos actividad inusual y estamos revisando tu cuenta.' };

  const verificationStatus = buildUserVerificationStatus({
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    phone: user.phone,
    bio: user.bio,
    zone: user.zone,
    profilePhoto: user.profilePhoto,
    totalReviewsReceived: user.totalReviews,
    documentaryVerified: user.documentaryVerified,
  });

  return {
    blocked: false,
    riskScore: user.risk_score,
    isVerified: verificationStatus.highValueBookingEligible,
    verificationLevel: verificationStatus.levelNumber,
  };
};

const AUTH_USER_SELECT = `id, email, role, is_host as "isHost", active_mode as "activeMode", name, zone, phone, bio, interests,
  member_since as "memberSince",
  created_at as "createdAt",
        profile_photo as "profilePhoto",
        rating,
        total_reviews as "totalReviews",
        trust_score as "trustScore",
        risk_score as "riskScore",
        host_rating as "hostRating",
        total_properties as "totalProperties",
        total_bookings_hosted as "totalBookingsHosted",
  badge`;

const normalizeAuthUser = (user: any) => ({
  ...user,
  name: user?.name || 'Usuario',
  role: user?.role === 'host' ? 'host' : user?.role === 'blocked' ? 'blocked' : 'tenant',
  canGuest: user?.role !== 'blocked',
  canHost: Boolean(user?.isHost || user?.role === 'host'),
  activeMode: user?.activeMode === 'host' ? 'host' : user?.activeMode === 'guest' ? 'guest' : user?.role === 'host' ? 'host' : 'guest',
  interests: (() => {
    if (!user?.interests) return [];
    try { return JSON.parse(user.interests); } catch { return user.interests; }
  })(),
});

const getAuthUserById = async (userId: string) => {
  const result = await db.query(`SELECT ${AUTH_USER_SELECT} FROM users WHERE id = $1`, [userId]);
  const user = result.rows[0];
  return user ? normalizeAuthUser(user) : null;
};

const PROPERTY_HOST_TRUST_SELECT = `u.identity_validated as "hostIdentityValidated",
        u.is_identity_verified as "hostIdentityVerified",
        u.name as "hostProfileName",
        COALESCE(u.member_since, u.created_at) as "hostMemberSince",
        COALESCE(host_premium_documentary."hostPremiumDocumentaryVerified", FALSE) as "hostPremiumDocumentaryVerified",
        COALESCE(host_completed_reservations."completedReservationsCount", 0) as "hostCompletedReservationsCount",
  COALESCE(host_guest_reviews."guestReviewsCount", 0) as "hostGuestReviewsCount",
  COALESCE(property_completed_bookings."completedBookingsCount", 0) as "propertyCompletedBookingsCount",
  COALESCE(property_real_reviews."realReviewsCount", 0) as "propertyRealReviewsCount"`;

const PROPERTY_HOST_TRUST_JOINS = `
      LEFT JOIN users u ON u.id = p."hostId"
      LEFT JOIN (
        SELECT user_id,
               TRUE as "hostPremiumDocumentaryVerified"
        FROM premium_verification_orders
        WHERE offer_type = '${PREMIUM_DOCUMENTARY_OFFER_TYPE}'
          AND verification_status = 'completed'
          AND payment_status IN ('confirmed', 'waived')
        GROUP BY user_id
      ) host_premium_documentary ON host_premium_documentary.user_id = p."hostId"
      LEFT JOIN (
        SELECT hp."hostId" as host_id,
               COUNT(*)::int as "completedReservationsCount"
        FROM bookings hb
        JOIN properties hp ON hp.id = hb."propertyId"
        WHERE hb.status = 'completed'
        GROUP BY hp."hostId"
      ) host_completed_reservations ON host_completed_reservations.host_id = p."hostId"
      LEFT JOIN (
        SELECT hp."hostId" as host_id,
               COUNT(*)::int as "guestReviewsCount"
        FROM reviews hr
        JOIN properties hp ON hp.id = hr.property_id
        WHERE hr.type = 'guest_to_host'
        GROUP BY hp."hostId"
      ) host_guest_reviews ON host_guest_reviews.host_id = p."hostId"
      LEFT JOIN (
        SELECT "propertyId" as property_id,
               COUNT(*) FILTER (WHERE status = 'completed')::int as "completedBookingsCount"
        FROM bookings
        GROUP BY "propertyId"
      ) property_completed_bookings ON property_completed_bookings.property_id = p.id
      LEFT JOIN (
        SELECT property_id,
               COUNT(*)::int as "realReviewsCount"
        FROM reviews
        GROUP BY property_id
      ) property_real_reviews ON property_real_reviews.property_id = p.id
`;

const CONVERSATION_HOST_TRUST_SELECT = `u_host.identity_validated as "hostIdentityValidated",
            u_host.is_identity_verified as "hostIdentityVerified",
            COALESCE(u_host.member_since, u_host.created_at) as "hostMemberSince",
            COALESCE(host_completed_reservations."completedReservationsCount", 0) as "hostCompletedReservationsCount",
            COALESCE(host_guest_reviews."guestReviewsCount", 0) as "hostGuestReviewsCount"`;

const CONVERSATION_HOST_TRUST_JOINS = `
     LEFT JOIN (
       SELECT hp."hostId" as host_id,
              COUNT(*)::int as "completedReservationsCount"
       FROM bookings hb
       JOIN properties hp ON hp.id = hb."propertyId"
       WHERE hb.status = 'completed'
       GROUP BY hp."hostId"
     ) host_completed_reservations ON host_completed_reservations.host_id = c.host_id
     LEFT JOIN (
       SELECT hp."hostId" as host_id,
              COUNT(*)::int as "guestReviewsCount"
       FROM reviews hr
       JOIN properties hp ON hp.id = hr.property_id
       WHERE hr.type = 'guest_to_host'
       GROUP BY hp."hostId"
     ) host_guest_reviews ON host_guest_reviews.host_id = c.host_id
`;

// ==========================================
// AUTH ROUTES
// ==========================================

// GET /api/auth/me — returns current user from session
app.get('/api/auth/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ user: null });
    }
    const user = await getAuthUserById(req.session.userId);
    if (!user) {
      // Stale session — clear it
      req.session.userId = undefined;
      return res.json({ user: null });
    }
    res.json({ user });
  } catch (err) {
    console.error('Error en /me:', err);
    res.status(500).json({ error: 'No pudimos recuperar tu sesión. Intentá de nuevo.' });
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName, zone, phone, bio, interests } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';
  const normalizedFullName = typeof fullName === 'string' ? fullName.trim() : '';
  const normalizedZone = typeof zone === 'string' ? zone.trim() || null : null;
  const normalizedPhone = typeof phone === 'string' ? phone.trim() || null : null;
  const normalizedBio = typeof bio === 'string' ? bio.trim() : null;
  const normalizedInterests = Array.isArray(interests)
    ? interests.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

  if (!normalizedEmail || !normalizedPassword || !normalizedFullName) {
    return res.status(400).json({ error: 'Completá los campos obligatorios.' });
  }

  if (normalizedPassword.length < 6) {
    return res.status(422).json({ error: 'La contraseña tiene que tener al menos 6 caracteres.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
    const id = `user_${Date.now()}`;
    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, role, active_mode, name, zone, phone, bio, interests)
       VALUES ($1, $2, $3, 'tenant', 'guest', $4, $5, $6, $7, $8)
       RETURNING id`,
      [id, normalizedEmail, hashedPassword, normalizedFullName, normalizedZone, normalizedPhone, normalizedBio, JSON.stringify(normalizedInterests)]
    );
    const user = await getAuthUserById(result.rows[0].id);

    if (!user) {
      return res.status(500).json({ error: 'No pudimos recuperar tu cuenta recién creada. Intentá de nuevo.' });
    }

    req.session.userId = user.id;
    await persistSession(req);
    res.status(201).json({ user });
  } catch (err) {
    console.error('Error en registro:', err);
    if (err instanceof Error && (err as any).code === '23505') {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }
    res.status(500).json({ error: 'No pudimos crear tu cuenta. Intentá de nuevo.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';
  
  console.log(`[LOGIN] Request received. Email: ${normalizedEmail}, Origin: ${req.get('origin')}`);
  
  if (!normalizedEmail || !normalizedPassword) {
    console.log(`[LOGIN] Missing email or password`);
    return res.status(400).json({ error: 'Ingresá tu email y tu contraseña.' });
  }
  try {
    const result = await db.query(
      `SELECT password_hash as "passwordHash", ${AUTH_USER_SELECT}
       FROM users WHERE email = $1`,
      [normalizedEmail]
    );
    const user = result.rows[0];
    
    if (!user) {
      console.log(`[LOGIN] User not found for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'El email o la contraseña no coinciden.' });
    }

    if (typeof user.passwordHash !== 'string' || !user.passwordHash.trim()) {
      console.warn(`[LOGIN] Missing password hash for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'El email o la contraseña no coinciden.' });
    }
    
    let passwordMatch = false;

    try {
      passwordMatch = await bcrypt.compare(normalizedPassword, user.passwordHash);
    } catch (compareError) {
      console.warn(`[LOGIN] Invalid password hash for email: ${normalizedEmail}`, compareError);
      return res.status(401).json({ error: 'El email o la contraseña no coinciden.' });
    }

    if (!passwordMatch) {
      console.log(`[LOGIN] Invalid password for email: ${normalizedEmail}`);
      return res.status(401).json({ error: 'El email o la contraseña no coinciden.' });
    }
    
    console.log(`[LOGIN] ✓ Login successful for user: ${user.id} (${normalizedEmail})`);
    req.session.userId = user.id;
    await persistSession(req);
    res.json({ user: normalizeAuthUser(user) });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'No pudimos iniciar sesión. Intentá de nuevo.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'No pudimos cerrar tu sesión. Intentá de nuevo.' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.post('/api/auth/change-password', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  }

  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Completá tu contraseña actual y la nueva.' });
  }

  if (newPassword.length < 6) {
    return res.status(422).json({ error: 'La contraseña tiene que tener al menos 6 caracteres.' });
  }

  if (currentPassword === newPassword) {
    return res.status(422).json({ error: 'Elegí una contraseña distinta a la actual.' });
  }

  try {
    const result = await db.query(`SELECT password_hash as "passwordHash" FROM users WHERE id = $1`, [req.session.userId]);
    const user = result.rows[0];

    if (!user?.passwordHash) {
      return res.status(404).json({ error: 'No encontramos esa cuenta.' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'La contraseña actual no coincide.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, req.session.userId]);

    await logActivity(req.session.userId, 'PASSWORD_CHANGED');

    res.json({ success: true });
  } catch (err) {
    console.error('Error en change-password:', err);
    res.status(500).json({ error: 'No pudimos actualizar la contraseña. Intentá de nuevo.' });
  }
});

// PUT /api/auth/profile — updates bio and interests
app.put('/api/auth/profile', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  const { interests, bio, name, zone, phone } = req.body ?? {};

  const hasInterests = Array.isArray(interests);
  const hasBio = typeof bio === 'string';
  const hasName = typeof name === 'string';
  const hasZone = typeof zone === 'string' || zone === null;
  const hasPhone = typeof phone === 'string' || phone === null;

  const normalizedName = hasName ? String(name).trim() : undefined;
  const normalizedZone = zone === null ? null : typeof zone === 'string' ? zone.trim() || null : undefined;
  const normalizedPhone = phone === null ? null : typeof phone === 'string' ? phone.trim() || null : undefined;
  const normalizedBio = hasBio ? String(bio).trim() : undefined;
  const normalizedInterests = hasInterests
    ? interests.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined;

  if (hasName && !normalizedName) {
    return res.status(400).json({ error: 'Completá tu nombre para guardar los cambios.' });
  }

  try {
    await db.query(
      `UPDATE users
       SET interests = CASE WHEN $1 THEN $2 ELSE interests END,
           bio = CASE WHEN $3 THEN $4 ELSE bio END,
           name = CASE WHEN $5 THEN $6 ELSE name END,
           zone = CASE WHEN $7 THEN $8 ELSE zone END,
           phone = CASE WHEN $9 THEN $10 ELSE phone END
       WHERE id = $11`,
      [
        hasInterests,
        hasInterests ? JSON.stringify(normalizedInterests) : null,
        hasBio,
        hasBio ? normalizedBio : null,
        hasName,
        hasName ? normalizedName : null,
        hasZone,
        hasZone ? normalizedZone : null,
        hasPhone,
        hasPhone ? normalizedPhone : null,
        req.session.userId,
      ]
    );

    const user = await getAuthUserById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'No encontramos esa cuenta.' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos guardar tu perfil. Intentá de nuevo.' });
  }
});

app.put('/api/auth/context', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  const nextMode = req.body?.mode === 'host' ? 'host' : req.body?.mode === 'guest' ? 'guest' : null;

  if (!nextMode) {
    return res.status(400).json({ error: 'Elegí un contexto válido para continuar.' });
  }

  try {
    await db.query(
      `UPDATE users
       SET active_mode = $1
       WHERE id = $2`,
      [nextMode, req.session.userId],
    );

    const user = await getAuthUserById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'No encontramos esa cuenta.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Error en auth-context:', err);
    res.status(500).json({ error: 'No pudimos cambiar tu modo ahora. Intentá de nuevo.' });
  }
});

app.post('/api/verification/validate-id', memoryUpload.single('idImage'), async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  }

  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
  const dni = typeof req.body?.dni === 'string' ? req.body.dni.trim() : '';
  const idImage = req.file;

  if (!dni || !idImage) {
    return res.status(400).json({ error: 'Ingresá el número de documento y cargá la imagen para continuar.' });
  }

  try {
    const premiumAccess = await requireDocumentaryPremiumAccess(req.session.userId, orderId || null);

    if (!premiumAccess.allowed) {
      return res.status(422).json({ error: premiumAccess.error });
    }

    const encodedImage = `data:${idImage.mimetype};base64,${idImage.buffer.toString('base64')}`;

    await db.query(
      `UPDATE users
       SET dni_number = $1,
           dni_front = $2
       WHERE id = $3`,
      [dni, encodedImage, req.session.userId],
    );

    if (premiumAccess.order?.id) {
      await markPremiumOrderState(premiumAccess.order.id, 'in_progress');
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error en validate-id:', err);
    res.status(500).json({ error: 'No pudimos validar ese documento. Intentá de nuevo.' });
  }
});

app.post('/api/verification/complete', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  }

  try {
    const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
    const premiumAccess = await requireDocumentaryPremiumAccess(req.session.userId, orderId || null);

    if (!premiumAccess.allowed) {
      return res.status(422).json({ error: premiumAccess.error });
    }

    const result = await db.query(`SELECT role, is_host as "isHost", active_mode as "activeMode", dni_number, dni_front FROM users WHERE id = $1`, [req.session.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'No encontramos esa cuenta.' });
    }

    if (!user.dni_number || !user.dni_front) {
      return res.status(422).json({ error: 'Primero necesitás cargar la documentación base para completar este refuerzo.' });
    }

    await db.query(
      `UPDATE users
       SET identity_validated = TRUE,
           is_identity_verified = TRUE,
           identity_verification_status = 'verified',
           identity_verification_provider = COALESCE(identity_verification_provider, 'documentary'),
           identity_verified_at = COALESCE(identity_verified_at, NOW()),
           validation_level = CASE WHEN validation_level = 'trusted_user' THEN validation_level ELSE 'verified_dni' END,
           host_verified = host_verified
       WHERE id = $1`,
      [req.session.userId],
    );

    const nextUser = await getAuthUserById(req.session.userId);

    if (premiumAccess.order?.id) {
      await markPremiumOrderState(premiumAccess.order.id, 'completed');
    }

    await logActivity(req.session.userId, 'IDENTITY_VERIFIED');

    res.json({ user: nextUser });
  } catch (err) {
    console.error('Error en verify:', err);
    res.status(500).json({ error: 'No pudimos completar la verificación. Intentá de nuevo.' });
  }
});

app.post('/api/verification/submit', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  }

  const { dniFront, dniBack, selfie, proofOfAddress, orderId } = req.body ?? {};

  const hasFront = typeof dniFront === 'string' && dniFront.trim().length > 0;
  const hasBack = typeof dniBack === 'string' && dniBack.trim().length > 0;
  const hasSelfie = typeof selfie === 'string' && selfie.trim().length > 0;
  const hasProofOfAddress = typeof proofOfAddress === 'string' && proofOfAddress.trim().length > 0;
  const hasIdentityDocs = hasFront && hasBack && hasSelfie;

  if (!hasIdentityDocs) {
    return res.status(400).json({ error: 'Completá la documentación requerida para enviar la verificación.' });
  }

  try {
    const premiumAccess = await requireDocumentaryPremiumAccess(
      req.session.userId,
      typeof orderId === 'string' ? orderId.trim() : null,
    );

    if (!premiumAccess.allowed) {
      return res.status(422).json({ error: premiumAccess.error });
    }

    await db.query(
      `UPDATE users
       SET dni_front = $1,
           dni_back = $2,
           selfie_with_dni = $3,
           identity_validated = TRUE,
           is_identity_verified = TRUE,
           identity_verification_status = 'verified',
           identity_verification_provider = COALESCE(identity_verification_provider, 'documentary'),
           identity_verified_at = COALESCE(identity_verified_at, NOW()),
           validation_level = CASE WHEN validation_level = 'trusted_user' THEN validation_level ELSE 'verified_dni' END,
           host_verified = CASE WHEN $4 THEN TRUE ELSE host_verified END
       WHERE id = $5`,
      [dniFront, dniBack, selfie, hasProofOfAddress, req.session.userId],
    );

    if (hasProofOfAddress) {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await db.query(
        `INSERT INTO user_verification_documents (id, user_id, document_type, document_url)
         VALUES ($1, $2, 'utility_bill', $3)`,
        [documentId, req.session.userId, proofOfAddress],
      );
    }

    const user = await getAuthUserById(req.session.userId);

    if (premiumAccess.order?.id) {
      await markPremiumOrderState(premiumAccess.order.id, 'completed');
    }

    await logActivity(req.session.userId, 'IDENTITY_DOCUMENTS_SUBMITTED', { hasProofOfAddress });

    res.json({ user });
  } catch (err) {
    console.error('Error en verification-submit:', err);
    res.status(500).json({ error: 'No pudimos guardar la verificación. Intentá de nuevo.' });
  }
});

app.post('/api/verification/premium-checkout', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  }

  const offerType = req.body?.offerType === PREMIUM_ONSITE_OFFER_TYPE
    ? PREMIUM_ONSITE_OFFER_TYPE
    : req.body?.offerType === PREMIUM_DOCUMENTARY_OFFER_TYPE
      ? PREMIUM_DOCUMENTARY_OFFER_TYPE
      : null;
  const propertyId = typeof req.body?.propertyId === 'string' ? req.body.propertyId.trim() : '';

  if (!offerType) {
    return res.status(400).json({ error: 'Elegí una comprobación adicional válida.' });
  }

  try {
    const usageRowsPromise = getPremiumPromotionalUsageRows();

    if (offerType === PREMIUM_DOCUMENTARY_OFFER_TYPE) {
      const [userResult, usageRows, existingOrder] = await Promise.all([
        db.query(
          `SELECT (COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE)) as "documentaryVerified"
           FROM users
           WHERE id = $1`,
          [req.session.userId],
        ),
        usageRowsPromise,
        getLatestPremiumOrder({ userId: req.session.userId, offerType }),
      ]);

      const documentaryVerified = Boolean(userResult.rows[0]?.documentaryVerified);

      if (documentaryVerified && !existingOrder) {
        const offer = buildDocumentaryPremiumOffer({
          usageRows,
          documentaryVerified,
          returnTo: '/profile',
        });

        return res.json({ offer, redirectTo: offer.redirectTo, orderId: null });
      }

      let order = existingOrder;

      if (!isPremiumOrderUnlocked(order)) {
        const pricing = getPremiumOfferPricing(offerType, usageRows);
        const paymentStatus: PremiumVerificationPaymentStatus = pricing.isComplimentary || pricing.priceArs === 0 ? 'waived' : 'confirmed';
        const nextOrderId = `pvo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await db.query(
          `INSERT INTO premium_verification_orders (
             id, user_id, property_id, offer_type, target_type, price_ars, currency, payment_status, verification_status, is_promotional
           )
           VALUES ($1, $2, NULL, $3, 'user', $4, $5, $6, 'pending', $7)`,
          [nextOrderId, req.session.userId, offerType, pricing.priceArs, PREMIUM_VERIFICATION_CURRENCY, paymentStatus, pricing.isComplimentary],
        );

        order = {
          id: nextOrderId,
          offerType,
          targetType: 'user',
          propertyId: null,
          priceArs: pricing.priceArs,
          paymentStatus,
          verificationStatus: 'pending',
          isPromotional: pricing.isComplimentary,
        };

        await logActivity(req.session.userId, 'PREMIUM_VERIFICATION_PURCHASED', {
          offerType,
          priceArs: pricing.priceArs,
          isPromotional: pricing.isComplimentary,
        });
      }

      const offer = buildDocumentaryPremiumOffer({
        order,
        usageRows,
        documentaryVerified,
        returnTo: '/profile',
      });

      return res.json({ offer, redirectTo: offer.redirectTo, orderId: order?.id ?? null });
    }

    if (!propertyId) {
      return res.status(400).json({ error: 'Elegí la propiedad que querés verificar.' });
    }

    const [propertyResult, usageRows, existingOrder] = await Promise.all([
      db.query(
        `SELECT id, title, "hasPresencialVerification"
         FROM properties
         WHERE id = $1 AND "hostId" = $2`,
        [propertyId, req.session.userId],
      ),
      usageRowsPromise,
      getLatestPremiumOrder({ userId: req.session.userId, offerType, propertyId }),
    ]);
    const property = propertyResult.rows[0];

    if (!property) {
      return res.status(404).json({ error: 'No encontramos esa propiedad o no te pertenece.' });
    }

    const onsiteVerified = property.hasPresencialVerification === true || property.hasPresencialVerification === 1 || property.hasPresencialVerification === '1';

    if (onsiteVerified && !existingOrder) {
      const offer = buildOnsitePremiumOffer({
        usageRows,
        propertyId: property.id,
        propertyTitle: property.title || 'Tu propiedad',
        onsiteVerified: true,
        returnTo: '/host-dashboard',
      });

      return res.json({ offer, redirectTo: offer.redirectTo, orderId: null });
    }

    let order = existingOrder;

    if (!isPremiumOrderUnlocked(order)) {
      const pricing = getPremiumOfferPricing(offerType, usageRows);
      const paymentStatus: PremiumVerificationPaymentStatus = pricing.isComplimentary || pricing.priceArs === 0 ? 'waived' : 'confirmed';
      const nextOrderId = `pvo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await db.query(
        `INSERT INTO premium_verification_orders (
           id, user_id, property_id, offer_type, target_type, price_ars, currency, payment_status, verification_status, is_promotional
         )
         VALUES ($1, $2, $3, $4, 'property', $5, $6, $7, 'pending', $8)`,
        [nextOrderId, req.session.userId, propertyId, offerType, pricing.priceArs, PREMIUM_VERIFICATION_CURRENCY, paymentStatus, pricing.isComplimentary],
      );

      order = {
        id: nextOrderId,
        offerType,
        targetType: 'property',
        propertyId,
        priceArs: pricing.priceArs,
        paymentStatus,
        verificationStatus: 'pending',
        isPromotional: pricing.isComplimentary,
      };

      await logActivity(req.session.userId, 'PREMIUM_VERIFICATION_PURCHASED', {
        offerType,
        propertyId,
        propertyTitle: property.title,
        priceArs: pricing.priceArs,
        isPromotional: pricing.isComplimentary,
      });
    }

    const offer = buildOnsitePremiumOffer({
      order,
      usageRows,
      propertyId: property.id,
      propertyTitle: property.title || 'Tu propiedad',
      onsiteVerified,
      returnTo: '/host-dashboard',
    });

    return res.json({ offer, redirectTo: offer.redirectTo, orderId: order?.id ?? null });
  } catch (err) {
    console.error('Error en premium-checkout:', err);
    return res.status(500).json({ error: 'No pudimos activar esta comprobación adicional ahora.' });
  }
});

app.post('/api/verification/onsite/complete', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  }

  const propertyId = typeof req.body?.propertyId === 'string' ? req.body.propertyId.trim() : '';
  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
  const appointmentDate = typeof req.body?.appointmentDate === 'string' ? req.body.appointmentDate.trim() : '';

  if (!propertyId || !appointmentDate) {
    return res.status(400).json({ error: 'Elegí una propiedad y un horario para continuar.' });
  }

  const normalizedOnsiteVerifiedAt = Number.isNaN(Date.parse(appointmentDate))
    ? null
    : new Date(appointmentDate).toISOString();

  try {
    const [propertyResult, order] = await Promise.all([
      db.query(
        `SELECT id, title
         FROM properties
         WHERE id = $1 AND "hostId" = $2`,
        [propertyId, req.session.userId],
      ),
      getLatestPremiumOrder({
        userId: req.session.userId,
        offerType: PREMIUM_ONSITE_OFFER_TYPE,
        propertyId,
        orderId: orderId || null,
      }),
    ]);
    const property = propertyResult.rows[0];

    if (!property) {
      return res.status(404).json({ error: 'No encontramos esa propiedad o no te pertenece.' });
    }

    if (!isPremiumOrderUnlocked(order)) {
      return res.status(422).json({ error: 'Primero activá la comprobación presencial adicional desde tu panel.' });
    }

    const verifiedOrder = order as PremiumVerificationOrderRow;

    await db.query(
      `UPDATE properties
       SET "hasPresencialVerification" = 1,
           "onsiteVerifiedAt" = COALESCE($3, "onsiteVerifiedAt")
       WHERE id = $1 AND "hostId" = $2`,
      [propertyId, req.session.userId, normalizedOnsiteVerifiedAt],
    );

    await markPremiumOrderState(verifiedOrder.id, 'completed');
    await logActivity(req.session.userId, 'PROPERTY_ONSITE_VERIFIED', {
      propertyId,
      propertyTitle: property.title,
      appointmentDate,
    });

    return res.json({ success: true, propertyId, appointmentDate });
  } catch (err) {
    console.error('Error en onsite-complete:', err);
    return res.status(500).json({ error: 'No pudimos confirmar la revisión presencial ahora.' });
  }
});

// GET /api/verification/status
app.get('/api/verification/status', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  try {
    const [userResult, bookingsResult, reviewsResult, conversationsResult, documentsResult, documentaryOrder, promotionalUsageRows] = await Promise.all([
      db.query(
        `SELECT role,
                is_host as "isHost",
                active_mode as "activeMode",
                phone,
                bio,
                zone,
                profile_photo as "profilePhoto",
                total_reviews as "totalReviews",
                dni_front,
                dni_back,
                selfie_with_dni,
                (COALESCE(email_verified, FALSE) OR COALESCE(is_email_verified, FALSE)) as "emailVerified",
                (COALESCE(phone_verified, FALSE) OR COALESCE(is_phone_verified, FALSE)) as "phoneVerified",
                (COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE)) as "documentaryVerified",
                COALESCE(NULLIF(identity_verification_status, ''), CASE
                  WHEN COALESCE(identity_validated, FALSE) OR COALESCE(is_identity_verified, FALSE) THEN 'verified'
                  ELSE 'unverified'
                END) as "identityVerificationStatus",
                identity_verification_provider as "identityVerificationProvider",
                identity_verified_at as "identityVerifiedAt"
         FROM users
         WHERE id = $1`,
        [req.session.userId],
      ),
      db.query(
        `SELECT COUNT(*)::int as "totalBookings",
                COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed'))::int as "completedBookings"
         FROM bookings
         WHERE "userId" = $1`,
        [req.session.userId],
      ),
      db.query(
        `SELECT COUNT(*) FILTER (WHERE reviewer_id = $1)::int as "writtenReviewsCount",
                COUNT(*) FILTER (WHERE reviewed_user_id = $1)::int as "receivedReviewsCount"
         FROM reviews
         WHERE reviewer_id = $1 OR reviewed_user_id = $1`,
        [req.session.userId],
      ),
      db.query(
        `SELECT COUNT(DISTINCT c.id)::int as "totalConversations",
                COUNT(m.id)::int as "totalMessages"
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.tenant_id = $1 OR c.host_id = $1`,
        [req.session.userId],
      ),
      db.query(
        `SELECT COUNT(*)::int as "documentsCount"
         FROM user_verification_documents
         WHERE user_id = $1`,
        [req.session.userId],
      ),
      getLatestPremiumOrder({
        userId: req.session.userId,
        offerType: PREMIUM_DOCUMENTARY_OFFER_TYPE,
      }),
      getPremiumPromotionalUsageRows(),
    ]);

    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'No encontramos esa cuenta.' });

    const verificationStatus = buildUserVerificationStatus({
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      phone: user.phone,
      bio: user.bio,
      zone: user.zone,
      profilePhoto: user.profilePhoto,
      totalBookings: bookingsResult.rows[0]?.totalBookings,
      completedBookings: bookingsResult.rows[0]?.completedBookings,
      totalReviewsWritten: reviewsResult.rows[0]?.writtenReviewsCount,
      totalReviewsReceived: reviewsResult.rows[0]?.receivedReviewsCount ?? user.totalReviews,
      totalConversations: conversationsResult.rows[0]?.totalConversations,
      totalMessages: conversationsResult.rows[0]?.totalMessages,
      documentarySubmitted: Boolean(user.dni_front || user.dni_back || user.selfie_with_dni || Number(documentsResult.rows[0]?.documentsCount || 0) > 0),
      documentaryVerified: user.documentaryVerified,
      identityVerificationStatus: user.identityVerificationStatus,
      identityVerificationProvider: user.identityVerificationProvider,
      identityVerifiedAt: user.identityVerifiedAt,
    });

    const premiumDocumentaryOffer = buildDocumentaryPremiumOffer({
      order: documentaryOrder,
      usageRows: promotionalUsageRows,
      documentaryVerified: Boolean(user.documentaryVerified),
      returnTo: '/profile',
    });

    res.json({
      ...verificationStatus,
      optionalUpgrade: premiumDocumentaryOffer.completed
        ? verificationStatus.optionalUpgrade
        : 'Podés sumar una comprobación documental adicional para dar más contexto. Sigue siendo opcional.',
      premiumDocumentaryOffer,
      nextLevel: verificationStatus.levelNumber < 4 ? `NIVEL_${verificationStatus.levelNumber + 1}` : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar tu estado de verificación.' });
  }
});

app.post('/api/verification/confirm-contact', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  }

  const field = req.body?.field === 'phone' ? 'phone' : req.body?.field === 'email' ? 'email' : null;

  if (!field) {
    return res.status(400).json({ error: 'Indicá si querés confirmar email o teléfono.' });
  }

  try {
    const result = await db.query('SELECT email, phone FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'No encontramos esa cuenta.' });
    }

    if (field === 'phone' && !(typeof user.phone === 'string' && user.phone.trim().length > 0)) {
      return res.status(422).json({ error: 'Primero agregá tu teléfono en el perfil para poder confirmarlo.' });
    }

    await db.query(
      `UPDATE users
       SET email_verified = CASE WHEN $1 = 'email' THEN TRUE ELSE email_verified END,
           is_email_verified = CASE WHEN $1 = 'email' THEN TRUE ELSE is_email_verified END,
           phone_verified = CASE WHEN $1 = 'phone' THEN TRUE ELSE phone_verified END,
           is_phone_verified = CASE WHEN $1 = 'phone' THEN TRUE ELSE is_phone_verified END
       WHERE id = $2`,
      [field, req.session.userId],
    );

    await logActivity(req.session.userId, field === 'email' ? 'EMAIL_CONFIRMED' : 'PHONE_CONFIRMED');

    const nextUser = await getAuthUserById(req.session.userId);
    res.json({ user: nextUser });
  } catch (err) {
    console.error('Error confirming contact verification:', err);
    res.status(500).json({ error: 'No pudimos confirmar ese dato ahora. Intentá de nuevo.' });
  }
});

// GET /api/users/preferences
app.get('/api/users/preferences', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  try {
    const result = await db.query('SELECT * FROM user_preferences WHERE user_id = $1', [req.session.userId]);
    res.json(result.rows[0] || { preferred_zone: null, max_price: null, preferred_property_type: null });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar tus preferencias.' });
  }
});

// PUT /api/users/preferences
app.put('/api/users/preferences', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  const { preferred_zone, max_price, preferred_property_type } = req.body;
  try {
    await db.query(
      `INSERT INTO user_preferences (user_id, preferred_zone, max_price, preferred_property_type, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         preferred_zone = EXCLUDED.preferred_zone,
         max_price = EXCLUDED.max_price,
         preferred_property_type = EXCLUDED.preferred_property_type,
         updated_at = NOW()`,
      [req.session.userId, preferred_zone, max_price, preferred_property_type]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos guardar tus preferencias. Intentá de nuevo.' });
  }
});

// GET /api/users/activity
app.get('/api/users/activity', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  try {
    const activityResult = await db.query('SELECT * FROM user_activity WHERE user_id = $1', [req.session.userId]);
    const bookingsResult = await db.query(
      `SELECT COUNT(*) as count, MAX(end_date) as last_booking_date
       FROM bookings
       WHERE "userId" = $1`,
      [req.session.userId],
    );
    const writtenReviewsResult = await db.query('SELECT COUNT(*) as count FROM reviews WHERE reviewer_id = $1', [req.session.userId]);
    const receivedReviewsResult = await db.query('SELECT COUNT(*) as count FROM reviews WHERE reviewed_user_id = $1', [req.session.userId]);
    
    res.json({
      ...(activityResult.rows[0] || {}),
      total_bookings: parseInt(bookingsResult.rows[0].count),
      total_reviews_written: parseInt(writtenReviewsResult.rows[0].count),
      total_reviews_received: parseInt(receivedReviewsResult.rows[0].count),
      last_booking_date: bookingsResult.rows[0]?.last_booking_date || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar tu actividad.' });
  }
});

// GET /api/notifications
app.get('/api/notifications', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  try {
    const result = await db.query(
      `SELECT id,
              action,
              metadata,
              read_at as "readAt",
              created_at as "createdAt"
       FROM user_activity_logs
       WHERE user_id = $1
         AND action = ANY($2::text[])
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId, [...NOTIFIABLE_ACTIVITY_ACTIONS]],
    );

    const notifications = result.rows
      .map((row) => mapActivityLogToNotification(row))
      .filter(Boolean);

    res.json({
      items: notifications,
      unread_count: notifications.filter((notification) => notification?.unread).length,
    });
  } catch (err) {
    console.error('Error loading notifications:', err);
    res.status(500).json({ error: 'No pudimos cargar las notificaciones. Reintentá.' });
  }
});

// POST /api/notifications/read-all
app.post('/api/notifications/read-all', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  try {
    await db.query(
      `UPDATE user_activity_logs
       SET read_at = COALESCE(read_at, NOW())
       WHERE user_id = $1
         AND action = ANY($2::text[])
         AND read_at IS NULL`,
      [userId, [...NOTIFIABLE_ACTIVITY_ACTIONS]],
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'No pudimos actualizar tus notificaciones. Reintentá.' });
  }
});

// GET /api/users/reviews
app.get('/api/users/reviews', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  try {
    const written = await db.query(
      `SELECT r.*, p.title as "propertyTitle", u.name as "userName"
       FROM reviews r
       LEFT JOIN properties p ON r.property_id = p.id
       LEFT JOIN users u ON r.reviewed_user_id = u.id
       WHERE r.reviewer_id = $1
       ORDER BY r.created_at DESC`,
      [req.session.userId]
    );
    const received = await db.query(
      `SELECT r.*, u.name as "userName", p.title as "propertyTitle"
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       LEFT JOIN properties p ON r.property_id = p.id
       WHERE r.reviewed_user_id = $1
       ORDER BY r.created_at DESC`,
      [req.session.userId]
    );
    res.json({ written: written.rows, received: received.rows });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar las reseñas.' });
  }
});

// POST /api/users/documents
app.post('/api/users/documents', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  const { document_type, document_url } = req.body;
  try {
    const id = `doc_${Date.now()}`;
    await db.query(
      `INSERT INTO user_verification_documents (id, user_id, document_type, document_url)
       VALUES ($1, $2, $3, $4)`,
      [id, req.session.userId, document_type, document_url]
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos guardar tu documento. Intentá de nuevo.' });
  }
});

const toSafeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundToWhole = (value: number) => Math.round(value);

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

const getAverageHostResponseTimeMinutes = async (hostId: string) => {
  const result = await db.query(
    `SELECT c.id as conversation_id, m.sender_id, m.created_at
     FROM conversations c
     JOIN messages m ON m.conversation_id = c.id
     WHERE c.host_id = $1
     ORDER BY c.id ASC, m.created_at ASC`,
    [hostId],
  );

  const responseTimes: number[] = [];
  const waitingMessages = new Map<string, number>();

  for (const row of result.rows) {
    const conversationId = row.conversation_id as string;
    const messageTime = new Date(row.created_at).getTime();

    if (row.sender_id === hostId) {
      const pendingTenantMessage = waitingMessages.get(conversationId);
      if (pendingTenantMessage) {
        responseTimes.push((messageTime - pendingTenantMessage) / (1000 * 60));
        waitingMessages.delete(conversationId);
      }
      continue;
    }

    if (!waitingMessages.has(conversationId)) {
      waitingMessages.set(conversationId, messageTime);
    }
  }

  if (responseTimes.length === 0) {
    return 0;
  }

  return roundToWhole(responseTimes.reduce((total, minutes) => total + minutes, 0) / responseTimes.length);
};

const getHostProfileData = async (hostId: string) => {
  const [hostResult, propertiesResult, bookingsResult, reviewsResult, conversationsResult, avgResponseTimeMinutes] = await Promise.all([
    db.query(
      `SELECT id, name, email,
              email_verified as "emailVerified",
              identity_validated as "identityValidated",
              member_since as "memberSince",
              risk_score as "riskScore",
              role,
              is_host as "isHost",
              total_properties as "totalProperties"
       FROM users
       WHERE id = $1`,
      [hostId],
    ),
    db.query(
      `SELECT id, status, created_at as "createdAt",
              "hasPresencialVerification", "locationVerified", "materialVerified", "videoValidated"
       FROM properties
       WHERE "hostId" = $1`,
      [hostId],
    ),
    db.query(
      `SELECT b.id, b.status, b.total_price as "totalPrice", b.contract_accepted as "contractAccepted",
              b.created_at as "createdAt", b.start_date as "startDate", b.end_date as "endDate"
       FROM bookings b
       JOIN properties p ON p.id = b."propertyId"
       WHERE p."hostId" = $1`,
      [hostId],
    ),
    db.query(
      `SELECT r.rating,
              r.photos_match_reality as "photosMatchReality",
              r.pressure_to_book_fast as "pressureToBookFast",
              r.created_at as "createdAt"
       FROM reviews r
       JOIN properties p ON p.id = r.property_id
       WHERE p."hostId" = $1
         AND r.type = 'guest_to_host'`,
      [hostId],
    ),
    db.query(
      `SELECT c.id, c.created_at as "createdAt", c.updated_at as "updatedAt", COUNT(m.id)::int as "messageCount"
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.host_id = $1
       GROUP BY c.id, c.created_at, c.updated_at`,
      [hostId],
    ),
    getAverageHostResponseTimeMinutes(hostId),
  ]);

  if (hostResult.rows.length === 0) {
    return null;
  }

  const host = hostResult.rows[0];
  const properties = propertiesResult.rows;

  if (!host.isHost && host.role !== 'host' && Number(host.totalProperties || 0) <= 0 && properties.length === 0) {
    return null;
  }

  const bookings = bookingsResult.rows;
  const guestReviews = reviewsResult.rows;
  const conversations = conversationsResult.rows;
  const activePropertiesCount = properties.filter((property) => property.status === 'active').length;
  const nonCancelledBookings = bookings.filter((booking) => booking.status !== 'cancelled');
  const completedStaysCount = bookings.filter((booking) => booking.status === 'completed').length;
  const hostCancellationsCount = bookings.filter((booking) => booking.status === 'cancelled').length;
  const stayCompletionRate = nonCancelledBookings.length > 0
    ? roundToWhole((completedStaysCount / nonCancelledBookings.length) * 100)
    : 0;
  const avgPublicationAgeMonths = properties.length > 0
    ? roundToWhole(
        properties.reduce((total, property) => total + ((Date.now() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30.4)), 0) /
          properties.length,
      )
    : 0;
  const queryCount = conversations.length;
  const chatsStartedCount = conversations.filter((conversation) => toSafeNumber(conversation.messageCount) > 0).length;
  const agreementsFinalizedCount = bookings.filter((booking) => booking.status === 'completed' || booking.contractAccepted).length;
  const photosMatchRealityRate = guestReviews.length > 0
    ? roundToWhole((guestReviews.filter((review) => !!review.photosMatchReality).length / guestReviews.length) * 100)
    : 0;
  const noPressureRate = guestReviews.length > 0
    ? roundToWhole((guestReviews.filter((review) => !review.pressureToBookFast).length / guestReviews.length) * 100)
    : 0;
  const avgRatingPercent = guestReviews.length > 0
    ? roundToWhole((guestReviews.reduce((total, review) => total + toSafeNumber(review.rating), 0) / guestReviews.length / 5) * 100)
    : 0;
  const attemptsToChangeConditionsOutside = guestReviews.some((review) => !!review.pressureToBookFast);
  const latestActivityDate = [
    ...properties.map((property) => property.createdAt),
    ...bookings.map((booking) => booking.createdAt),
    ...guestReviews.map((review) => review.createdAt),
    ...conversations.map((conversation) => conversation.updatedAt),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);

  const alerts: string[] = [];
  if (attemptsToChangeConditionsOutside) {
    alerts.push('Algunas reseñas marcaron intentos de cambiar condiciones por fuera de la plataforma.');
  }
  if (hostCancellationsCount > 0) {
    alerts.push('El historial registra reservas canceladas asociadas a este perfil.');
  }
  if (guestReviews.length > 0 && avgRatingPercent < 84) {
    alerts.push('Las ultimas reseñas muestran una experiencia menos consistente que la de otros anfitriones destacados.');
  }

  let status: 'new' | 'active' | 'with_history' | 'highly_traceable' | 'with_warnings' = 'active';
  if (alerts.length > 0) {
    status = 'with_warnings';
  } else if (host.identityValidated && activePropertiesCount >= 3 && avgRatingPercent >= 90) {
    status = 'highly_traceable';
  } else if (completedStaysCount >= 3) {
    status = 'with_history';
  } else if (properties.length <= 1) {
    status = 'new';
  }

  return {
    id: host.id,
    name: host.name || 'Anfitrion',
    email: host.email,
    emailVerified: !!host.emailVerified,
    identityValidated: !!host.identityValidated,
    memberSince: host.memberSince,
    verificationMethod: properties.some((property) => !!property.hasPresencialVerification) ? 'presencial' : 'digital',
    status,
    publishedPropertiesCount: properties.length,
    activePropertiesCount,
    avgPublicationAgeMonths,
    completedStaysCount,
    stayCompletionRate,
    lastVerifiedActivityDate: latestActivityDate,
    queriesReceivedCount: queryCount,
    chatsStartedCount,
    agreementsFinalizedCount,
    avgResponseTimeMinutes,
    hostCancellationsCount,
    reputation: {
      photosMatchRealityRate,
      infoClarityRate: guestReviews.length > 0 ? roundToWhole((avgRatingPercent + photosMatchRealityRate) / 2) : 0,
      agreementComplianceRate: noPressureRate,
      communicationRate: guestReviews.length > 0 ? roundToWhole((avgRatingPercent + noPressureRate) / 2) : 0,
      attemptsToChangeConditionsOutside,
    },
    verificationsSummary: {
      presencialCount: properties.filter((property) => !!property.hasPresencialVerification).length,
      gpsProofCount: properties.filter((property) => !!property.locationVerified).length,
      videoValidationCount: properties.filter((property) => !!property.materialVerified || !!property.videoValidated).length,
    },
    alerts,
    riskScore: toSafeNumber(host.riskScore),
  };
};

// ==========================================
// HOST DASHBOARD & PROPERTY MANAGEMENT
// ==========================================

type HostDashboardGuestProfileRow = {
  id: string;
  identityVerified?: boolean | number | string | null;
  identityVerificationStatus?: string | null;
  identityVerificationProvider?: string | null;
  identityVerifiedAt?: string | Date | null;
  memberSince?: string | Date | null;
  profilePhoto?: string | null;
  bio?: string | null;
  phone?: string | null;
  zone?: string | null;
  emailVerified?: boolean | number | string | null;
  phoneVerified?: boolean | number | string | null;
  completedStays?: number | string | null;
  cancellationsCount?: number | string | null;
  conflictsCount?: number | string | null;
};

type HostDashboardGuestReviewRow = {
  guestId: string;
  id: string;
  authorName?: string | null;
  date?: string | Date | null;
  comment?: string | null;
};

type HostDashboardBookingSignalRow = {
  bookingId: string;
  consultedBeforeReserve?: boolean | null;
  savedProperty?: boolean | null;
  returnedToView?: boolean | null;
};

const isTruthyFlag = (value: unknown) => value === true || value === 1 || value === '1' || value === 't' || value === 'true';

const toDateOnlyString = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return new Date().toISOString().slice(0, 10);
    }

    const parsedValue = new Date(trimmedValue);

    if (!Number.isNaN(parsedValue.getTime())) {
      return parsedValue.toISOString().slice(0, 10);
    }

    return trimmedValue;
  }

  return new Date().toISOString().slice(0, 10);
};

const buildGuestRequestProfilePayload = (
  guest: HostDashboardGuestProfileRow | undefined,
  options: {
    hostReviews?: HostDashboardGuestReviewRow[];
    bookingSignals?: HostDashboardBookingSignalRow;
  } = {},
) => {
  if (!guest) {
    return undefined;
  }

  const emailVerified = isTruthyFlag(guest.emailVerified);
  const phoneVerified = isTruthyFlag(guest.phoneVerified);
  const identityVerified = isTruthyFlag(guest.identityVerified);
  const profileCompletion = buildGuestProfileCompletion({
    phone: guest.phone,
    bio: guest.bio,
    zone: guest.zone,
    profilePhoto: guest.profilePhoto,
  });
  const completedProfileSignal = profileCompletion.profileComplete;
  const operationSignals = options.bookingSignals
    ? [
        {
          id: 'consulted-before',
          label: 'Consultó antes de reservar',
          active: !!options.bookingSignals.consultedBeforeReserve,
          source: 'api',
        },
        {
          id: 'saved-property',
          label: 'Guardó la propiedad',
          active: !!options.bookingSignals.savedProperty,
          source: 'api',
        },
        {
          id: 'returned-to-view',
          label: 'Volvió a verla',
          active: !!options.bookingSignals.returnedToView,
          // La app todavía no guarda reingresos a la publicación, así que este slot queda preparado.
          source: typeof options.bookingSignals.returnedToView === 'boolean' ? 'api' : 'pending',
        },
        {
          id: 'completed-profile',
          label: 'Completó sus datos',
          active: completedProfileSignal,
          source: 'derived',
        },
      ]
    : undefined;
  const verification = buildGuestVerification({
    emailVerified,
    phoneVerified,
    profileComplete: profileCompletion.profileComplete,
    photoUploaded: profileCompletion.photoUploaded,
    basicDetailsComplete: profileCompletion.basicDetailsComplete,
    completedStays: guest.completedStays,
    hostReviewsCount: (options.hostReviews ?? []).length,
    activitySignalsCount: operationSignals?.filter((signal) => signal.active && signal.source !== 'derived').length ?? 0,
    documentaryVerified: identityVerified,
    identityVerificationStatus: guest.identityVerificationStatus ?? (identityVerified ? 'verified' : null),
    identityVerificationProvider: guest.identityVerificationProvider,
    identityVerifiedAt: guest.identityVerifiedAt,
  });

  return {
    identityVerified,
    platformHistory: {
      completedStays: toSafeNumber(guest.completedStays),
      conflictsCount: toSafeNumber(guest.conflictsCount),
      cancellationsCount: toSafeNumber(guest.cancellationsCount),
    },
    hostReviews: (options.hostReviews ?? []).slice(0, 3).map((review) => ({
      id: review.id,
      authorName: review.authorName || 'Anfitrión',
      date: toDateOnlyString(review.date),
      comment: review.comment || 'Sin comentario cargado.',
    })),
    profileCompletion: {
      profileComplete: profileCompletion.profileComplete,
      photoUploaded: profileCompletion.photoUploaded,
      basicDetailsComplete: profileCompletion.basicDetailsComplete,
    },
    verificationSummary: verification.verificationSummary,
    verificationScore: verification.verificationScore,
    verificationItems: verification.verificationItems,
    identityVerification: verification.identityVerification,
    ...(operationSignals ? { operationSignals } : {}),
    memberSince: toDateOnlyString(guest.memberSince),
  };
};

app.get('/api/host/dashboard', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  try {
    const [statsResult, propertiesResult, recentBookingsResult, totalsResult, contactedGuestsResult, premiumPropertyOrders, promotionalUsageRows] = await Promise.all([
      db.query(
        `SELECT host_rating, host_verified, trust_score, badge
         FROM users
         WHERE id = $1`,
        [req.session.userId],
      ),
      db.query(
        `SELECT p.id, p.title, p.location, p.price, p.status, p."reviewsCount", p.rating, p."imageUrl",
          p."hostId", p."hostName", p."identityValidated", p."locationVerified", p."materialVerified", p."videoValidated",
          p."hasPresencialVerification", p."onsiteVerifiedAt", p."hasDigitalVerification", p.property_type as "propertyType",
                p.is_verified_property as "isVerifiedProperty",
                COALESCE(booking_summary.pending_requests_count, 0)::int as "pendingRequestsCount",
                COALESCE(booking_summary.active_reservations_count, 0)::int as "activeReservationsCount",
                booking_summary.next_arrival_date as "nextArrivalDate",
                ${PROPERTY_HOST_TRUST_SELECT}
         FROM properties p
         ${PROPERTY_HOST_TRUST_JOINS}
         LEFT JOIN (
           SELECT "propertyId" as property_id,
                  COUNT(*) FILTER (WHERE status = 'pending')::int as pending_requests_count,
                  COUNT(*) FILTER (WHERE status = 'confirmed')::int as active_reservations_count,
                  TO_CHAR(
                    MIN(start_date) FILTER (
                      WHERE status = 'confirmed'
                        AND start_date IS NOT NULL
                        AND start_date >= CURRENT_DATE
                    ),
                    'DD/MM/YYYY'
                  ) as next_arrival_date
           FROM bookings
           WHERE status <> 'cancelled'
           GROUP BY "propertyId"
         ) booking_summary ON booking_summary.property_id = p.id
         WHERE "hostId" = $1
         ORDER BY p.created_at DESC`,
        [req.session.userId],
      ),
      db.query(
        `SELECT b.id, b.status, TO_CHAR(b.start_date, 'DD/MM/YYYY') as date,
          TO_CHAR(b.start_date, 'DD/MM/YYYY') as "startDate",
          TO_CHAR(b.end_date, 'DD/MM/YYYY') as "endDate",
          COALESCE(b.guests, 1)::int as guests,
          COALESCE(b.total_price, 0)::int as "totalPrice",
              b.cancellation_actor as "cancellationActor",
          c.id as "conversationId",
          COALESCE(c.deposit_status, b.deposit_status) as "depositStatus",
          COALESCE(b.request_mode, CASE WHEN c.booking_id IS NOT NULL THEN 'protected' ELSE 'direct' END) as "requestMode",
          b."userId",
                guest.name as "userName", p.title as "propertyTitle"
         FROM bookings b
         JOIN properties p ON b."propertyId" = p.id
         LEFT JOIN conversations c ON c.booking_id = b.id
         LEFT JOIN users guest ON guest.id = b."userId"
         WHERE p."hostId" = $1
           AND b.status <> 'cancelled'
         ORDER BY b.start_date DESC NULLS LAST, b.created_at DESC
         LIMIT 5`,
        [req.session.userId],
      ),
      db.query(
        `SELECT COUNT(*) FILTER (WHERE b.status <> 'cancelled')::int as total_bookings_hosted,
                COALESCE(SUM(b.total_price) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0) as estimated_income
         FROM bookings b
         JOIN properties p ON b."propertyId" = p.id
         WHERE p."hostId" = $1`,
        [req.session.userId],
      ),
      db.query(
        `SELECT *
         FROM (
           SELECT DISTINCT ON (guest.id)
                  guest.id,
                  guest.name,
                  guest.trust_score,
                  guest.risk_score,
                  b.created_at
           FROM bookings b
           JOIN properties p ON p.id = b."propertyId"
           JOIN users guest ON guest.id = b."userId"
           WHERE p."hostId" = $1
           ORDER BY guest.id, b.created_at DESC
         ) recent_guests
         ORDER BY created_at DESC
         LIMIT 3`,
        [req.session.userId],
      ),
      getLatestPropertyPremiumOrders(req.session.userId),
      getPremiumPromotionalUsageRows(),
    ]);

    const stats = statsResult.rows[0] || {};
    const totals = totalsResult.rows[0] || {};
    const premiumPropertyOrdersById = new Map(
      premiumPropertyOrders
        .filter((order) => typeof order.propertyId === 'string' && order.propertyId)
        .map((order) => [order.propertyId as string, order]),
    );
    const hostProperties = propertiesResult.rows.map((property) => ({
      ...mapPropertyRecord(property),
      rating: roundToOneDecimal(toSafeNumber(property.rating)),
      premiumOnsiteOffer: buildOnsitePremiumOffer({
        order: premiumPropertyOrdersById.get(property.id),
        usageRows: promotionalUsageRows,
        propertyId: property.id,
        propertyTitle: property.title || 'Tu propiedad',
        onsiteVerified: property.hasPresencialVerification === true || property.hasPresencialVerification === 1 || property.hasPresencialVerification === '1',
        returnTo: '/host-dashboard',
      }),
    }));
    const recentBookings = recentBookingsResult.rows;
    const contactedGuests = contactedGuestsResult.rows;
    const guestIds = Array.from(new Set([
      ...recentBookings.map((booking) => (typeof booking.userId === 'string' ? booking.userId : null)),
      ...contactedGuests.map((guest) => (typeof guest.id === 'string' ? guest.id : null)),
    ].filter((value): value is string => !!value)));
    const guestProfilesById = new Map<string, HostDashboardGuestProfileRow>();
    const guestReviewsByGuestId = new Map<string, HostDashboardGuestReviewRow[]>();
    const bookingSignalsByBookingId = new Map<string, HostDashboardBookingSignalRow>();

    if (guestIds.length > 0) {
      const recentBookingIds = recentBookings
        .map((booking) => (typeof booking.id === 'string' ? booking.id : null))
        .filter((value): value is string => !!value);

      const [guestProfilesResult, guestReviewsResult, bookingSignalsResult] = await Promise.all([
        db.query(
          `SELECT u.id,
                  (COALESCE(u.is_identity_verified, FALSE) OR COALESCE(u.identity_validated, FALSE)) as "identityVerified",
                  (CASE
                    WHEN COALESCE(u.is_identity_verified, FALSE) OR COALESCE(u.identity_validated, FALSE) THEN 'verified'
                    WHEN u.identity_verification_status IN ('verified', 'pending', 'rejected') THEN u.identity_verification_status
                    ELSE 'unverified'
                  END) as "identityVerificationStatus",
                  u.identity_verification_provider as "identityVerificationProvider",
                  u.identity_verified_at as "identityVerifiedAt",
                  COALESCE(u.member_since, u.created_at) as "memberSince",
                  u.profile_photo as "profilePhoto",
                  u.bio,
                  u.phone,
                  u.zone,
                  (COALESCE(u.email_verified, FALSE) OR COALESCE(u.is_email_verified, FALSE)) as "emailVerified",
                  (COALESCE(u.phone_verified, FALSE) OR COALESCE(u.is_phone_verified, FALSE)) as "phoneVerified",
                  COALESCE(booking_stats.completed_stays, 0)::int as "completedStays",
                  COALESCE(booking_stats.cancellations_count, 0)::int as "cancellationsCount",
                  COALESCE(report_stats.conflicts_count, 0)::int as "conflictsCount"
           FROM users u
           LEFT JOIN (
             SELECT "userId" as user_id,
                    COUNT(*) FILTER (WHERE status = 'completed')::int as completed_stays,
                    COUNT(*) FILTER (WHERE status = 'cancelled')::int as cancellations_count
             FROM bookings
             WHERE "userId" = ANY($1::text[])
             GROUP BY "userId"
           ) booking_stats ON booking_stats.user_id = u.id
           LEFT JOIN (
             SELECT reported_user_id as user_id,
                    COUNT(*)::int as conflicts_count
             FROM reports
             WHERE reported_user_id = ANY($1::text[])
             GROUP BY reported_user_id
           ) report_stats ON report_stats.user_id = u.id
           WHERE u.id = ANY($1::text[])`,
          [guestIds],
        ),
        db.query(
          `SELECT r.reviewed_user_id as "guestId",
                  r.id,
                  reviewer.name as "authorName",
                  r.created_at as date,
                  r.comment
           FROM reviews r
           LEFT JOIN users reviewer ON reviewer.id = r.reviewer_id
           WHERE r.type = 'host_to_guest'
             AND r.reviewed_user_id = ANY($1::text[])
           ORDER BY r.reviewed_user_id ASC, r.created_at DESC`,
          [guestIds],
        ),
        recentBookingIds.length > 0
          ? db.query(
              `SELECT b.id as "bookingId",
                      EXISTS(
                        SELECT 1
                        FROM conversations c
                        WHERE c.tenant_id = b."userId"
                          AND c.host_id = $2
                          AND c.property_id = b."propertyId"
                      ) as "consultedBeforeReserve",
                      EXISTS(
                        SELECT 1
                        FROM favorites f
                        WHERE f.user_id = b."userId"
                          AND f.property_id = b."propertyId"
                      ) as "savedProperty",
                      NULL::boolean as "returnedToView"
               FROM bookings b
               WHERE b.id = ANY($1::text[])`,
              [recentBookingIds, req.session.userId],
            )
          : Promise.resolve({ rows: [] }),
      ]);

      guestProfilesResult.rows.forEach((guest) => {
        guestProfilesById.set(guest.id, guest);
      });

      guestReviewsResult.rows.forEach((review) => {
        const existingReviews = guestReviewsByGuestId.get(review.guestId) ?? [];

        if (existingReviews.length < 3) {
          existingReviews.push(review);
          guestReviewsByGuestId.set(review.guestId, existingReviews);
        }
      });

      bookingSignalsResult.rows.forEach((signal) => {
        bookingSignalsByBookingId.set(signal.bookingId, signal);
      });
    }

    res.json({
      stats: {
        host_rating: roundToOneDecimal(toSafeNumber(stats.host_rating)),
        total_properties: hostProperties.length,
        total_bookings_hosted: toSafeNumber(totals.total_bookings_hosted),
        host_verified: !!stats.host_verified,
        trust_score: toSafeNumber(stats.trust_score),
        badge: stats.badge || 'Nuevo usuario',
      },
      properties: hostProperties,
      recentBookings: recentBookings.map((booking) => {
        const guestProfile = buildGuestRequestProfilePayload(guestProfilesById.get(booking.userId), {
          hostReviews: guestReviewsByGuestId.get(booking.userId),
          bookingSignals: bookingSignalsByBookingId.get(booking.id),
        });

        return guestProfile
          ? { ...booking, guestProfile }
          : booking;
      }),
      contactedGuests: contactedGuests.map((guest) => {
        const guestProfile = buildGuestRequestProfilePayload(guestProfilesById.get(guest.id), {
          hostReviews: guestReviewsByGuestId.get(guest.id),
        });

        return {
          id: guest.id,
          name: guest.name || 'Huesped',
          score: toSafeNumber(guest.trust_score),
          risk: toSafeNumber(guest.risk_score) >= 40 ? 'high' : toSafeNumber(guest.risk_score) >= 20 ? 'medium' : 'low',
          ...(guestProfile ? { guestProfile } : {}),
        };
      }),
      estimatedIncome: toSafeNumber(totals.estimated_income),
    });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar tu panel de anfitrión.' });
  }
});

app.post('/api/properties', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  
  const risk = await checkUserRisk(req.session.userId);
  if (risk.blocked) return res.status(403).json({ error: risk.reason });

  const { title, location, price, description, imageUrl, lat, lng, maxGuests, bedrooms, bathrooms, propertyType } = req.body;
  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedLocation = typeof location === 'string' ? location.trim() : '';
  const normalizedDescription = typeof description === 'string' ? description.trim() : '';
  const normalizedImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const normalizedPrice = Number(price);
  const normalizedLat = lat === null || lat === undefined || lat === '' ? null : Number(lat);
  const normalizedLng = lng === null || lng === undefined || lng === '' ? null : Number(lng);
  const normalizedMaxGuests = Number(maxGuests);
  const normalizedBedrooms = Number(bedrooms);
  const normalizedBathrooms = Number(bathrooms);
  const normalizedPropertyType = typeof propertyType === 'string' ? propertyType.trim().toLowerCase() : '';

  if (!normalizedTitle || !normalizedLocation || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
    return res.status(400).json({ error: 'Completá el tipo, la ubicación y el precio para publicar.' });
  }

  try {
    const id = `prop_${Date.now()}`;
    const result = await db.query(
      `INSERT INTO properties (
         id, title, location, price, "hostId", description, "imageUrl", lat, lng, status,
         "maxGuests", bedrooms, bathrooms, property_type
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11, $12, $13) RETURNING *`,
      [
        id,
        normalizedTitle,
        normalizedLocation,
        normalizedPrice,
        req.session.userId,
        normalizedDescription,
        normalizedImageUrl || null,
        Number.isFinite(normalizedLat) ? normalizedLat : null,
        Number.isFinite(normalizedLng) ? normalizedLng : null,
        Number.isFinite(normalizedMaxGuests) && normalizedMaxGuests > 0 ? normalizedMaxGuests : 1,
        Number.isFinite(normalizedBedrooms) && normalizedBedrooms > 0 ? normalizedBedrooms : 1,
        Number.isFinite(normalizedBathrooms) && normalizedBathrooms > 0 ? normalizedBathrooms : 1,
        normalizedPropertyType || 'house',
      ]
    );
    // Update host total_properties
    await db.query(
      `UPDATE users
       SET total_properties = total_properties + 1,
           is_host = TRUE,
           role = 'host',
           active_mode = 'host'
       WHERE id = $1`,
      [req.session.userId],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'No pudimos publicar la propiedad. Intentá de nuevo.' });
  }
});

app.put('/api/properties/:id', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  const { title, location, price, description, imageUrl, lat, lng, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE properties SET title = COALESCE($1, title), location = COALESCE($2, location), price = COALESCE($3, price), description = COALESCE($4, description), "imageUrl" = COALESCE($5, "imageUrl"), lat = COALESCE($6, lat), lng = COALESCE($7, lng), status = COALESCE($8, status)
       WHERE id = $9 AND "hostId" = $10 RETURNING *`,
      [title, location, price, description, imageUrl, lat, lng, status, req.params.id, req.session.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontramos esa propiedad o no tenés permiso para editarla.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'No pudimos actualizar la propiedad. Intentá de nuevo.' });
  }
});

// ==========================================
// BLOCKING SYSTEM
// ==========================================

app.post('/api/users/block', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  const { blockedUserId, reason } = req.body;
  try {
    const id = `block_${Date.now()}`;
    await db.query(
      `INSERT INTO user_blocks (id, blocked_user_id, blocked_by_user_id, reason)
       VALUES ($1, $2, $3, $4)`,
      [id, blockedUserId, req.session.userId, reason]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos bloquear a este usuario. Intentá de nuevo.' });
  }
});

app.get('/api/properties', async (req, res) => {
  try {
    const { 
      minPrice, maxPrice, guests, verifiedOnly, type, location 
    } = req.query;

    let query = `
      SELECT
        p.id, p.title, p.location, p.price, p."hostId", p."hostName",
        p.description, p."imageUrl", p.rating, p."reviewsCount",
        p."identityValidated", p."locationVerified", p."materialVerified", p."videoValidated",
        p."traceabilityLevel", p."maxGuests", p."hasPresencialVerification", p."onsiteVerifiedAt", p."hasDigitalVerification", p.lat, p.lng,
        p.bedrooms, p.bathrooms, p.property_type as "propertyType",
        p.is_verified_property as "isVerifiedProperty",
        ${PROPERTY_HOST_TRUST_SELECT}
      FROM properties p
      ${PROPERTY_HOST_TRUST_JOINS}
      WHERE status = 'active'
    `;

    const params: any[] = [];
    if (minPrice) { params.push(minPrice); query += ` AND p.price >= $${params.length}`; }
    if (maxPrice) { params.push(maxPrice); query += ` AND p.price <= $${params.length}`; }
    if (guests) { params.push(guests); query += ` AND p."maxGuests" >= $${params.length}`; }
    if (type) { params.push(type); query += ` AND p.property_type = $${params.length}`; }
    if (location) { 
      params.push(`%${location}%`); 
      query += ` AND (p.location ILIKE $${params.length} OR p.title ILIKE $${params.length})`; 
    }

    query += ` ORDER BY p.rating DESC NULLS LAST`;

    const result = await db.query(query, params);
    
    const properties = result.rows
      .map((property) => mapPropertyRecord(property))
      .filter((property) => verifiedOnly === 'true' ? property.verificationScore >= REAL_VERIFICATION_FILTER_MIN_SCORE : true);
    res.json(properties);
  } catch (err) {
    console.error('Error al obtener propiedades:', err);
    res.status(500).json({ error: 'No pudimos cargar las propiedades.' });
  }
});

// GET /api/properties/:id/availability
app.get('/api/properties/:id/availability', async (req, res) => {
  try {
    const property = await db.query(`SELECT id, manual_blocked_dates FROM properties WHERE id = $1`, [req.params.id]);
    if (property.rows.length === 0) {
      return res.status(404).json({ error: 'No encontramos esa propiedad.' });
    }

    const bookings = await db.query(
      `SELECT start_date as start, end_date as "end", status, 'booking' as source
       FROM bookings
       WHERE "propertyId" = $1
         AND status != 'cancelled'
         AND end_date >= CURRENT_DATE`,
      [req.params.id]
    );

    const rawManualBlocks = property.rows[0]?.manual_blocked_dates ? JSON.parse(property.rows[0].manual_blocked_dates) : [];
    const manualBlocks = normalizeStoredManualBlocks(rawManualBlocks).map((block) => ({
      ...block,
      source: 'manual',
      status: 'blocked',
    }));

    res.json([...bookings.rows, ...manualBlocks]);
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar la disponibilidad.' });
  }
});

app.put('/api/properties/:id/availability', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  }

  const manualBlocks = normalizeManualAvailabilityBlocks(req.body?.manualBlocks);
  if (!manualBlocks) {
    return res.status(422).json({ error: 'Revisá las fechas que querés bloquear.', code: 'INVALID_MANUAL_BLOCKS' });
  }

  try {
    const propertyResult = await db.query(
      `SELECT id
       FROM properties
       WHERE id = $1 AND "hostId" = $2`,
      [req.params.id, userId]
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'No encontramos esa propiedad o no tenés permiso para editarla.' });
    }

    await db.query(
      `UPDATE properties
       SET manual_blocked_dates = $1
       WHERE id = $2 AND "hostId" = $3`,
      [JSON.stringify(manualBlocks), req.params.id, userId]
    );

    await logActivity(userId, 'PROPERTY_AVAILABILITY_UPDATED', {
      propertyId: req.params.id,
      manualBlocksCount: manualBlocks.length,
    });

    res.json({ manualBlocks });
  } catch (err) {
    console.error('Error al actualizar disponibilidad manual:', err);
    res.status(500).json({ error: 'No pudimos guardar la disponibilidad de la publicación.' });
  }
});

// GET /api/properties/:id
app.get('/api/properties/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, COALESCE(p.lat, -36.3536) as lat, COALESCE(p.lng, -56.7196) as lng,
              ${PROPERTY_HOST_TRUST_SELECT}
       FROM properties p
       ${PROPERTY_HOST_TRUST_JOINS}
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontramos esa propiedad.' });
    res.json(mapPropertyRecord(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar la propiedad.' });
  }
});

// ==========================================
// BOOKINGS ROUTES
// DB columns: id, propertyId, userId, status, date, stay_code, verified
// ==========================================

type BookingApiErrorField = 'startDate' | 'endDate' | 'guests' | 'propertyId';

type ManualAvailabilityBlock = {
  start: string;
  end: string;
};

const BOOKING_SELECT_QUERY = `SELECT b.id, b."propertyId", b."userId", b.status, b.date, b.stay_code, b.verified,
  b.start_date as "startDate", b.end_date as "endDate", b.total_price as "totalPrice",
  b.guests, b.contract_accepted as "contractAccepted", b.contract_json as "contractJson",
  b.cancellation_actor as "cancellationActor",
  c.id as "conversationId",
  COALESCE(c.deposit_status, b.deposit_status) as "depositStatus",
  COALESCE(b.request_mode, CASE WHEN c.booking_id IS NOT NULL THEN 'protected' ELSE 'direct' END) as "requestMode",
  p.title as "propertyTitle", p."imageUrl", p.location
 FROM bookings b
 LEFT JOIN properties p ON b."propertyId" = p.id
 LEFT JOIN conversations c ON c.booking_id = b.id
 WHERE b."userId" = $1
 ORDER BY b.created_at DESC`;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BOOKING_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const BOOKING_DATE_OFFSET = '-03:00';
const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const REQUEST_RESPONSE_WINDOW_MS = 24 * 60 * 60 * 1000;

const buildBookingContract = (params: {
  guestName: string;
  hostName: string;
  propertyTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
}) => ({
  guestName: params.guestName,
  hostName: params.hostName,
  propertyTitle: params.propertyTitle,
  location: params.location,
  startDate: params.startDate,
  endDate: params.endDate,
  totalPrice: params.totalPrice,
  currency: 'ARS',
  rules: [
    'Respetar horarios de silencio: 22:00 - 08:00',
    'No fumar dentro de la propiedad',
    'Cuidar el mobiliario y electrodomésticos',
  ],
});

const getEnrichedConversationById = async (conversationId: string) => {
  const result = await db.query(
    `SELECT c.*, 
            u_tenant.name as "tenantName", u_host.name as "hostName",
            p.title as "propertyTitle", p."imageUrl" as "propertyImage",
            ${CONVERSATION_HOST_TRUST_SELECT},
            b.status as "bookingStatus", b.start_date as "startDate", b.end_date as "endDate",
            b.guests, b.total_price as "totalPrice",
          b.cancellation_actor as "cancellationActor",
            COALESCE(c.request_mode, b.request_mode, CASE WHEN c.booking_id IS NOT NULL THEN 'protected' ELSE NULL END) as "requestMode",
            c.request_status as "requestStatus",
            c.request_created_at as "requestCreatedAt",
            COALESCE(c.deposit_status, b.deposit_status) as "depositStatus",
            c.request_start_date as "requestStartDate",
            c.request_end_date as "requestEndDate",
            c.request_guests as "requestGuests",
            c.request_total_price as "requestTotalPrice"
     FROM conversations c
     JOIN users u_tenant ON c.tenant_id = u_tenant.id
     JOIN users u_host ON c.host_id = u_host.id
     JOIN properties p ON c.property_id = p.id
    ${CONVERSATION_HOST_TRUST_JOINS}
     LEFT JOIN bookings b ON c.booking_id = b.id
     WHERE c.id = $1
     LIMIT 1`,
    [conversationId],
  );

  return result.rows[0] ? normalizeConversationRecord(result.rows[0]) : null;
};

const getFormatterPart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => (
  parts.find((part) => part.type === type)?.value ?? ''
);

const formatDateOnlyInBookingTimeZone = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOOKING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return `${getFormatterPart(parts, 'year')}-${getFormatterPart(parts, 'month')}-${getFormatterPart(parts, 'day')}`;
};

const normalizeDateOnlyValue = (value: unknown) => {
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    return value;
  }

  if (typeof value === 'string' || value instanceof Date) {
    const parsed = parseTimestampValue(value);
    if (parsed) {
      return formatDateOnlyInBookingTimeZone(parsed);
    }
  }

  return null;
};

const hasBookingReachedStartDate = (value: unknown, now = new Date()) => {
  const normalizedStartDate = normalizeDateOnlyValue(value);
  const today = formatDateOnlyInBookingTimeZone(now);

  return Boolean(normalizedStartDate && normalizedStartDate <= today);
};

const normalizeBookingRecord = <T extends { startDate?: unknown; endDate?: unknown }>(booking: T) => {
  const normalizedStartDate = normalizeDateOnlyValue(booking.startDate);
  const normalizedEndDate = normalizeDateOnlyValue(booking.endDate);

  return {
    ...booking,
    ...(booking.startDate !== undefined ? { startDate: normalizedStartDate ?? booking.startDate } : {}),
    ...(booking.endDate !== undefined ? { endDate: normalizedEndDate ?? booking.endDate } : {}),
  };
};

const normalizeConversationRecord = <T extends {
  startDate?: unknown;
  endDate?: unknown;
  requestStartDate?: unknown;
  requestEndDate?: unknown;
  hostIdentityValidated?: unknown;
  hostIdentityVerified?: unknown;
  hostMemberSince?: unknown;
  hostCompletedReservationsCount?: unknown;
  hostGuestReviewsCount?: unknown;
}>(conversation: T) => {
  const {
    hostIdentityValidated,
    hostIdentityVerified,
    hostMemberSince,
    hostCompletedReservationsCount,
    hostGuestReviewsCount,
    ...conversationRest
  } = conversation;
  const normalizedStartDate = normalizeDateOnlyValue(conversation.startDate);
  const normalizedEndDate = normalizeDateOnlyValue(conversation.endDate);
  const normalizedRequestStartDate = normalizeDateOnlyValue(conversation.requestStartDate);
  const normalizedRequestEndDate = normalizeDateOnlyValue(conversation.requestEndDate);

  const hasHostTrustData = [
    hostIdentityValidated,
    hostIdentityVerified,
    hostMemberSince,
    hostCompletedReservationsCount,
    hostGuestReviewsCount,
  ].some((value) => value !== undefined && value !== null);

  return {
    ...conversationRest,
    ...(conversation.startDate !== undefined ? { startDate: normalizedStartDate ?? conversation.startDate } : {}),
    ...(conversation.endDate !== undefined ? { endDate: normalizedEndDate ?? conversation.endDate } : {}),
    ...(conversation.requestStartDate !== undefined ? { requestStartDate: normalizedRequestStartDate ?? conversation.requestStartDate } : {}),
    ...(conversation.requestEndDate !== undefined ? { requestEndDate: normalizedRequestEndDate ?? conversation.requestEndDate } : {}),
    ...(hasHostTrustData
      ? buildHostTrust({
          identityValidated: Boolean(hostIdentityValidated) || Boolean(hostIdentityVerified),
          hostMemberSince: typeof hostMemberSince === 'string' ? hostMemberSince : undefined,
          hostCompletedReservationsCount: typeof hostCompletedReservationsCount === 'number' ? hostCompletedReservationsCount : Number(hostCompletedReservationsCount ?? 0),
          hostGuestReviewsCount: typeof hostGuestReviewsCount === 'number' ? hostGuestReviewsCount : Number(hostGuestReviewsCount ?? 0),
        })
      : {}),
  };
};

const parseTimestampValue = (value: unknown) => {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getRequestResponseDeadline = (conversation: { request_created_at?: unknown }) => {
  const requestCreatedAt = parseTimestampValue(conversation.request_created_at);

  if (!requestCreatedAt) {
    return null;
  }

  return new Date(requestCreatedAt.getTime() + REQUEST_RESPONSE_WINDOW_MS);
};

const insertSystemConversationMessage = async (
  conversation: Awaited<ReturnType<typeof getEnrichedConversationById>>,
  key: ChatSystemMessageKey,
  content: string,
) => {
  if (!conversation) {
    return;
  }

  await db.query(
    `INSERT INTO messages (id, conversation_id, sender_id, receiver_id, content, is_system, system_key)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6)
     ON CONFLICT (conversation_id, system_key) WHERE system_key IS NOT NULL
     DO UPDATE SET content = EXCLUDED.content`,
    [
      `msg_sys_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      conversation.id,
      conversation.host_id,
      conversation.tenant_id,
      content,
      key,
    ],
  );
};

const syncConversationSystemMessages = async (conversationId: string) => {
  const conversation = await getEnrichedConversationById(conversationId);

  if (!conversation) {
    return;
  }

  const systemMessages = getChatSystemMessages({
    requestMode: conversation.requestMode,
    requestStatus: conversation.requestStatus,
    bookingStatus: conversation.bookingStatus,
    depositStatus: conversation.depositStatus,
    requestStartDate: normalizeDateOnlyValue(conversation.requestStartDate),
    requestEndDate: normalizeDateOnlyValue(conversation.requestEndDate),
    bookingStartDate: normalizeDateOnlyValue(conversation.startDate),
    bookingEndDate: normalizeDateOnlyValue(conversation.endDate),
    today: formatDateOnlyInBookingTimeZone(new Date()),
  });

  for (const systemMessage of systemMessages) {
    await insertSystemConversationMessage(conversation, systemMessage.key, systemMessage.content);
  }
};

const sendBookingError = (
  res: express.Response,
  status: number,
  code: string,
  message: string,
  field?: BookingApiErrorField,
) => {
  return res.status(status).json({
    error: message,
    message,
    code,
    ...(field ? { field } : {}),
  });
};

const parseDateOnly = (value: unknown) => {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00${BOOKING_DATE_OFFSET}`);

  if (Number.isNaN(parsed.getTime()) || formatDateOnlyInBookingTimeZone(parsed) !== value) {
    return null;
  }

  return {
    iso: value,
    date: parsed,
  };
};

const getTodayDateOnly = () => {
  const parsed = parseDateOnly(formatDateOnlyInBookingTimeZone(new Date()));
  return parsed?.date ?? new Date();
};

const getNightCount = (startDate: Date, endDate: Date) => {
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
};

const getRequestBookingDates = (body: any) => {
  return {
    startDate: typeof body?.startDate === 'string' ? body.startDate : body?.checkIn,
    endDate: typeof body?.endDate === 'string' ? body.endDate : body?.checkOut,
  };
};

const normalizeManualAvailabilityBlocks = (value: unknown): ManualAvailabilityBlock[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedBlocks: ManualAvailabilityBlock[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const block = entry as Record<string, unknown>;
    const startDate = parseDateOnly(block.start);
    const endDate = parseDateOnly(block.end);

    if (!startDate || !endDate || endDate.date <= startDate.date) {
      return null;
    }

    normalizedBlocks.push({ start: startDate.iso, end: endDate.iso });
  }

  normalizedBlocks.sort((left, right) => {
    if (left.start === right.start) {
      return left.end.localeCompare(right.end);
    }

    return left.start.localeCompare(right.start);
  });

  return normalizedBlocks.reduce<ManualAvailabilityBlock[]>((accumulator, currentBlock) => {
    const previousBlock = accumulator[accumulator.length - 1];

    if (!previousBlock) {
      accumulator.push(currentBlock);
      return accumulator;
    }

    if (currentBlock.start <= previousBlock.end) {
      previousBlock.end = currentBlock.end > previousBlock.end ? currentBlock.end : previousBlock.end;
      return accumulator;
    }

    accumulator.push(currentBlock);
    return accumulator;
  }, []);
};

const normalizeStoredManualBlocks = (value: unknown): ManualAvailabilityBlock[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return { start: entry, end: entry };
      }

      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const block = entry as Record<string, unknown>;
      const start = typeof block.start === 'string' ? block.start : typeof block.date === 'string' ? block.date : null;
      const end = typeof block.end === 'string' ? block.end : start;

      if (!start || !end) {
        return null;
      }

      return { start, end };
    })
    .filter((entry): entry is ManualAvailabilityBlock => Boolean(entry));
};

const getCancellationDeadline = (bookingStartDate: Date) => {
  return new Date(bookingStartDate.getTime() - CANCELLATION_WINDOW_MS);
};

const attachBookingDerivedFields = <T extends { startDate?: string | null; endDate?: string | null }>(booking: T) => {
  const normalizedBooking = normalizeBookingRecord(booking);
  const bookingStartDate = parseDateOnly(normalizedBooking.startDate);

  return {
    ...normalizedBooking,
    cancellationDeadline: bookingStartDate ? getCancellationDeadline(bookingStartDate.date).toISOString() : null,
  };
};

const getUserBookings = async (userId: string) => {
  const result = await db.query(BOOKING_SELECT_QUERY, [userId]);
  return result.rows.map((row) => attachBookingDerivedFields(row));
};

const getUserBookingById = async (userId: string, bookingId: string) => {
  const result = await db.query(
    `SELECT b.id, b."propertyId", b."userId", b.status, b.date, b.stay_code, b.verified,
            b.start_date as "startDate", b.end_date as "endDate", b.total_price as "totalPrice",
            b.guests, b.contract_accepted as "contractAccepted", b.contract_json as "contractJson",
          b.cancellation_actor as "cancellationActor",
            c.id as "conversationId",
            COALESCE(c.deposit_status, b.deposit_status) as "depositStatus",
            COALESCE(b.request_mode, CASE WHEN c.booking_id IS NOT NULL THEN 'protected' ELSE 'direct' END) as "requestMode",
            p.title as "propertyTitle", p."imageUrl", p.location
     FROM bookings b
     LEFT JOIN properties p ON b."propertyId" = p.id
     LEFT JOIN conversations c ON c.booking_id = b.id
     WHERE b."userId" = $1 AND b.id = $2
     LIMIT 1`,
    [userId, bookingId]
  );

  return result.rows[0] ? attachBookingDerivedFields(result.rows[0]) : null;
};

const getHostBookingById = async (hostId: string, bookingId: string) => {
  const result = await db.query(
    `SELECT b.id, b."propertyId", b."userId", b.status, b.date, b.stay_code, b.verified,
            b.start_date as "startDate", b.end_date as "endDate", b.total_price as "totalPrice",
            b.guests, b.contract_accepted as "contractAccepted", b.contract_json as "contractJson",
            b.cancellation_actor as "cancellationActor",
            c.id as "conversationId",
            COALESCE(c.deposit_status, b.deposit_status) as "depositStatus",
            COALESCE(b.request_mode, CASE WHEN c.booking_id IS NOT NULL THEN 'protected' ELSE 'direct' END) as "requestMode",
            p.title as "propertyTitle", p."imageUrl", p.location
     FROM bookings b
     JOIN properties p ON b."propertyId" = p.id
     LEFT JOIN conversations c ON c.booking_id = b.id
     WHERE p."hostId" = $1 AND b.id = $2
     LIMIT 1`,
    [hostId, bookingId],
  );

  return result.rows[0] ? attachBookingDerivedFields(result.rows[0]) : null;
};

const isProtectedDepositInPlatform = (depositStatus?: string | null) => (
  depositStatus === 'held' || depositStatus === 'review' || depositStatus === 'pending_confirmation'
);

const syncConversationDepositStatus = async (bookingId: string, depositStatus: string | null) => {
  await db.query(
    `UPDATE conversations
     SET deposit_status = $1,
         updated_at = NOW()
     WHERE booking_id = $2`,
    [depositStatus, bookingId],
  );
};

app.get('/api/bookings', async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
    }

    res.json(await getUserBookings(req.session.userId));
  } catch (err) {
    console.error('Error al obtener reservas:', err);
    sendBookingError(res, 500, 'BOOKINGS_FETCH_FAILED', 'No pudimos cargar tus reservas.');
  }
});

app.get('/api/bookings/all', async (req, res) => {
  try {
    if (!req.session.userId) {
      return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
    }

    res.json(await getUserBookings(req.session.userId));
  } catch (err) {
    console.error('Error al obtener reservas:', err);
    sendBookingError(res, 500, 'BOOKINGS_FETCH_FAILED', 'No pudimos cargar tus reservas.');
  }
});

app.post('/api/bookings', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
  }

  const requestMode = req.body?.requestMode === 'protected' ? 'protected' : 'direct';
  const bookingStatus = requestMode === 'protected' ? 'pending' : 'confirmed';

  const risk = await checkUserRisk(userId);
  if (risk.blocked) {
    return sendBookingError(res, 403, 'BOOKING_BLOCKED', risk.reason || 'No pudimos validar tu cuenta para reservar.');
  }

  const { propertyId, totalPrice: rawTotalPrice } = req.body ?? {};
  const { startDate: rawStartDate, endDate: rawEndDate } = getRequestBookingDates(req.body ?? {});
  const startDate = parseDateOnly(rawStartDate);
  const endDate = parseDateOnly(rawEndDate);
  const guests = Number(req.body?.guests);

  if (typeof propertyId !== 'string' || !propertyId.trim()) {
    return sendBookingError(res, 400, 'PROPERTY_ID_REQUIRED', 'Elegí la propiedad antes de seguir.', 'propertyId');
  }

  if (!startDate) {
    return sendBookingError(res, 422, 'INVALID_START_DATE', 'Elegí una fecha de ingreso válida.', 'startDate');
  }

  if (!endDate) {
    return sendBookingError(res, 422, 'INVALID_END_DATE', 'Elegí una fecha de salida válida.', 'endDate');
  }

  if (!Number.isInteger(guests) || guests < 1) {
    return sendBookingError(res, 422, 'INVALID_GUESTS', 'Indicá al menos un huésped para continuar.', 'guests');
  }

  const today = getTodayDateOnly();
  if (startDate.date < today) {
    return sendBookingError(res, 422, 'START_DATE_IN_PAST', 'La fecha de ingreso no puede ser anterior a hoy.', 'startDate');
  }

  if (endDate.date <= startDate.date) {
    return sendBookingError(res, 422, 'INVALID_DATE_RANGE', 'La salida tiene que ser posterior al ingreso.', 'endDate');
  }

  const nights = getNightCount(startDate.date, endDate.date);
  if (nights < 1) {
    return sendBookingError(res, 422, 'INVALID_NIGHTS', 'La reserva tiene que incluir al menos una noche.', 'endDate');
  }

  let client;

  try {
    client = await db.getClient();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [propertyId]);

    const propertyResult = await client.query(
      `SELECT id, title, location, price, status, "hostName", "hostId", "maxGuests"
       FROM properties
       WHERE id = $1`,
      [propertyId]
    );

    if (propertyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendBookingError(res, 404, 'PROPERTY_NOT_FOUND', 'No encontramos esa propiedad.', 'propertyId');
    }

    const property = propertyResult.rows[0];
    if (property.status && property.status !== 'active') {
      await client.query('ROLLBACK');
      return sendBookingError(res, 422, 'PROPERTY_INACTIVE', 'Esta propiedad no está disponible para nuevas solicitudes ahora.', 'propertyId');
    }

    if (property.hostId && property.hostId === userId) {
      await client.query('ROLLBACK');
      return sendBookingError(res, 422, 'OWN_PROPERTY_BOOKING', 'No podés avanzar sobre tu propia publicación.', 'propertyId');
    }

    const maxGuests = Number(property.maxGuests) || 0;
    if (maxGuests > 0 && guests > maxGuests) {
      await client.query('ROLLBACK');
      return sendBookingError(
        res,
        422,
        'MAX_GUESTS_EXCEEDED',
        `Esta propiedad admite hasta ${maxGuests} ${maxGuests === 1 ? 'huésped' : 'huéspedes'}. Ajustá la cantidad para continuar.`,
        'guests'
      );
    }

    const nightlyPrice = Number(property.price) || 0;
    if (nightlyPrice <= 0) {
      await client.query('ROLLBACK');
      return sendBookingError(res, 422, 'INVALID_PROPERTY_PRICE', 'Esta propiedad no tiene un precio válido para continuar.', 'propertyId');
    }

    const totalPrice = Number((nightlyPrice * nights).toFixed(2));

    if (totalPrice > 200000 && !risk.isVerified) {
      await client.query('ROLLBACK');
      return sendBookingError(
        res,
        403,
        'IDENTITY_VERIFICATION_REQUIRED',
        'Para reservas mayores a $200.000 necesitás tener email y teléfono confirmados.'
      );
    }

    const collision = await client.query(
      `SELECT id
       FROM bookings
       WHERE "propertyId" = $1
         AND status != 'cancelled'
         AND start_date < $3::date
         AND end_date > $2::date
       LIMIT 1`,
      [propertyId, startDate.iso, endDate.iso]
    );

    if (collision.rows.length > 0) {
      await client.query('ROLLBACK');
      return sendBookingError(res, 409, 'DATES_UNAVAILABLE', 'Esa propiedad ya no está disponible en esas fechas.', 'startDate');
    }

    const guestResult = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
    const guestName = guestResult.rows[0]?.name || 'Huésped';
    const bookingId = `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stay_code = Math.random().toString(36).slice(2, 8).toUpperCase();

    const contract = buildBookingContract({
      guestName,
      hostName: property.hostName || 'Anfitrión',
      propertyTitle: property.title,
      location: property.location,
      startDate: startDate.iso,
      endDate: endDate.iso,
      totalPrice,
    });

    const insertResult = await client.query(
      `INSERT INTO bookings (id, "propertyId", "userId", status, start_date, end_date, total_price, guests, stay_code, contract_json, request_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, "propertyId", "userId", status, date, stay_code, verified,
                 start_date as "startDate", end_date as "endDate", total_price as "totalPrice",
                 guests, contract_accepted as "contractAccepted", contract_json as "contractJson", request_mode as "requestMode", deposit_status as "depositStatus"`,
      [bookingId, propertyId, userId, bookingStatus, startDate.iso, endDate.iso, totalPrice, guests, stay_code, JSON.stringify(contract), requestMode]
    );

    await client.query('COMMIT');

    const booking = attachBookingDerivedFields({
      ...insertResult.rows[0],
      propertyTitle: property.title,
      location: property.location,
    });

    await logActivity(userId, 'BOOKING_CREATED', {
      propertyId,
      startDate: startDate.iso,
      endDate: endDate.iso,
      guests,
      totalPrice,
      requestMode,
      clientTotalPrice: Number.isFinite(Number(rawTotalPrice)) ? Number(rawTotalPrice) : undefined,
    });

    res.status(201).json({
      booking,
      contract,
      requestMode,
      pricing: {
        nights,
        nightly: nightlyPrice,
        total: totalPrice,
      },
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    console.error('Error al crear reserva:', err);
    sendBookingError(
      res,
      500,
      'BOOKING_CREATE_FAILED',
      requestMode === 'protected'
        ? 'No pudimos enviar la solicitud protegida. Intentá de nuevo.'
        : 'No pudimos confirmar la reserva. Intentá de nuevo.',
    );
  } finally {
    client?.release();
  }
});

app.post('/api/bookings/:id/accept-contract', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  
  try {
    await db.query(
      'UPDATE bookings SET contract_accepted = TRUE WHERE id = $1 AND "userId" = $2',
      [req.params.id, req.session.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos registrar la aceptación del acuerdo.' });
  }
});

app.post('/api/bookings/:id/cancel', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
  }

  try {
    const booking = await getUserBookingById(userId, req.params.id);

    if (!booking) {
      return sendBookingError(res, 404, 'BOOKING_NOT_FOUND', 'No encontramos esa reserva.');
    }

    if (booking.status === 'cancelled') {
      return res.json({ booking });
    }

    if (booking.status === 'completed') {
      return sendBookingError(res, 422, 'BOOKING_ALREADY_COMPLETED', 'Esta estadía ya terminó y no se puede cancelar.');
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return sendBookingError(res, 422, 'BOOKING_NOT_CANCELLABLE', 'Esta reserva no se puede cancelar en su estado actual.');
    }

    const bookingStartDate = parseDateOnly(booking.startDate);
    if (!bookingStartDate) {
      return sendBookingError(res, 500, 'BOOKING_INVALID_START_DATE', 'No pudimos validar la fecha de esta reserva.');
    }

    if (Date.now() >= getCancellationDeadline(bookingStartDate.date).getTime()) {
      return sendBookingError(res, 422, 'BOOKING_TOO_LATE_TO_CANCEL', 'Podés cancelar solo hasta 24 horas antes del ingreso.');
    }

    const nextDepositStatus = booking.requestMode === 'protected' && isProtectedDepositInPlatform(booking.depositStatus)
      ? 'review'
      : booking.depositStatus ?? null;

    await db.query(
      `UPDATE bookings
       SET status = 'cancelled',
           cancellation_actor = 'guest',
           deposit_status = $3
       WHERE id = $1 AND "userId" = $2`,
      [req.params.id, userId, nextDepositStatus]
    );

    await syncConversationDepositStatus(req.params.id, nextDepositStatus);

    await logActivity(userId, 'BOOKING_CANCELLED', { bookingId: req.params.id, propertyId: booking.propertyId });

    const updatedBooking = await getUserBookingById(userId, req.params.id);
    res.json({ booking: updatedBooking });
  } catch (err) {
    console.error('Error al cancelar reserva:', err);
    sendBookingError(res, 500, 'BOOKING_CANCEL_FAILED', 'No pudimos cancelar la reserva. Intentá de nuevo.');
  }
});

app.post('/api/bookings/:id/cancel-as-host', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
  }

  try {
    const booking = await getHostBookingById(userId, req.params.id);

    if (!booking) {
      return sendBookingError(res, 404, 'BOOKING_NOT_FOUND', 'No encontramos esa reserva.');
    }

    if (booking.status === 'cancelled') {
      return res.json({ booking });
    }

    if (booking.status === 'completed') {
      return sendBookingError(res, 422, 'BOOKING_ALREADY_COMPLETED', 'Esta estadía ya terminó y no se puede cancelar.');
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return sendBookingError(res, 422, 'BOOKING_NOT_CANCELLABLE', 'Esta reserva no se puede cancelar en su estado actual.');
    }

    const nextDepositStatus = booking.requestMode === 'protected' && isProtectedDepositInPlatform(booking.depositStatus)
      ? 'refunded'
      : booking.depositStatus ?? null;

    await db.query(
      `UPDATE bookings
       SET status = 'cancelled',
           cancellation_actor = 'host',
           deposit_status = $2
       WHERE id = $1`,
      [req.params.id, nextDepositStatus],
    );

    await syncConversationDepositStatus(req.params.id, nextDepositStatus);

    await logActivity(booking.userId, 'BOOKING_CANCELLED', { bookingId: req.params.id, propertyId: booking.propertyId });

    const updatedBooking = await getHostBookingById(userId, req.params.id);
    return res.json({ booking: updatedBooking });
  } catch (err) {
    console.error('Error al cancelar reserva como anfitrión:', err);
    return sendBookingError(res, 500, 'BOOKING_HOST_CANCEL_FAILED', 'No pudimos cancelar la reserva desde el panel. Intentá de nuevo.');
  }
});

app.post('/api/bookings/:id/report-arrival-problem', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
  }

  try {
    const booking = await getUserBookingById(userId, req.params.id);

    if (!booking) {
      return sendBookingError(res, 404, 'BOOKING_NOT_FOUND', 'No encontramos esa reserva.');
    }

    if (booking.requestMode !== 'protected') {
      return sendBookingError(res, 422, 'INVALID_REPORT_FLOW', 'Esta acción solo aplica a reservas protegidas.');
    }

    if (booking.status !== 'confirmed') {
      return sendBookingError(res, 422, 'BOOKING_NOT_ACTIVE', 'La reserva tiene que seguir activa para reportar un problema al llegar.');
    }

    if (booking.depositStatus === 'review') {
      return res.json({ booking });
    }

    if (booking.depositStatus !== 'held') {
      return sendBookingError(res, 422, 'BOOKING_NOT_IN_CUSTODY', 'Primero necesitás tener la seña en custodia para reportar este problema.');
    }

    if (!hasBookingReachedStartDate(booking.startDate)) {
      return sendBookingError(res, 422, 'BOOKING_ARRIVAL_PROBLEM_TOO_EARLY', 'Vas a poder reportar un problema desde el día del ingreso.');
    }

    await db.query(
      `UPDATE bookings
       SET deposit_status = 'review'
       WHERE id = $1 AND "userId" = $2`,
      [req.params.id, userId],
    );

    await syncConversationDepositStatus(req.params.id, 'review');

    const updatedBooking = await getUserBookingById(userId, req.params.id);
    return res.json({ booking: updatedBooking });
  } catch (err) {
    console.error('Error al reportar problema al llegar:', err);
    return sendBookingError(res, 500, 'BOOKING_ARRIVAL_PROBLEM_FAILED', 'No pudimos registrar el problema. Intentá de nuevo.');
  }
});

app.post('/api/bookings/:id/report-no-show', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
  }

  try {
    const booking = await getHostBookingById(userId, req.params.id);

    if (!booking) {
      return sendBookingError(res, 404, 'BOOKING_NOT_FOUND', 'No encontramos esa reserva.');
    }

    if (booking.requestMode !== 'protected') {
      return sendBookingError(res, 422, 'INVALID_NO_SHOW_FLOW', 'Esta acción solo aplica a reservas protegidas.');
    }

    if (booking.status !== 'confirmed') {
      return sendBookingError(res, 422, 'BOOKING_NOT_ACTIVE', 'La reserva tiene que seguir activa para informar un no show.');
    }

    if (booking.depositStatus === 'pending_confirmation') {
      return res.json({ booking });
    }

    if (booking.depositStatus !== 'held') {
      return sendBookingError(res, 422, 'BOOKING_NOT_IN_CUSTODY', 'Primero necesitás tener la seña en custodia para informar este no show.');
    }

    if (!hasBookingReachedStartDate(booking.startDate)) {
      return sendBookingError(res, 422, 'BOOKING_NO_SHOW_TOO_EARLY', 'Vas a poder informar un no show desde el día del ingreso.');
    }

    await db.query(
      `UPDATE bookings
       SET deposit_status = 'pending_confirmation'
       WHERE id = $1`,
      [req.params.id],
    );

    await syncConversationDepositStatus(req.params.id, 'pending_confirmation');

    const updatedBooking = await getHostBookingById(userId, req.params.id);
    return res.json({ booking: updatedBooking });
  } catch (err) {
    console.error('Error al informar no show:', err);
    return sendBookingError(res, 500, 'BOOKING_NO_SHOW_FAILED', 'No pudimos registrar el no show. Intentá de nuevo.');
  }
});

// ==========================================
// CHAT & MESSAGING SYSTEM
// ==========================================

// Get all conversations for current user
app.get('/api/conversations', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  try {
    const result = await db.query(
      `SELECT c.*, 
              u_tenant.name as "tenantName", u_host.name as "hostName",
              p.title as "propertyTitle", p."imageUrl" as "propertyImage",
              ${CONVERSATION_HOST_TRUST_SELECT},
              b.status as "bookingStatus", b.start_date as "startDate", b.end_date as "endDate",
              b.guests, b.total_price as "totalPrice",
              b.cancellation_actor as "cancellationActor",
              COALESCE(c.request_mode, b.request_mode, CASE WHEN c.booking_id IS NOT NULL THEN 'protected' ELSE NULL END) as "requestMode",
              c.request_status as "requestStatus",
              c.request_created_at as "requestCreatedAt",
              COALESCE(c.deposit_status, b.deposit_status) as "depositStatus",
              c.request_start_date as "requestStartDate",
              c.request_end_date as "requestEndDate",
              c.request_guests as "requestGuests",
              c.request_total_price as "requestTotalPrice"
       FROM conversations c
       JOIN users u_tenant ON c.tenant_id = u_tenant.id
       JOIN users u_host ON c.host_id = u_host.id
       JOIN properties p ON c.property_id = p.id
      ${CONVERSATION_HOST_TRUST_JOINS}
       LEFT JOIN bookings b ON c.booking_id = b.id
       WHERE c.tenant_id = $1 OR c.host_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    res.json(result.rows.map((row) => normalizeConversationRecord(row)));
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar tus conversaciones.' });
  }
});

// Get messages for a specific conversation
app.get('/api/conversations/:id/messages', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  try {
    await syncConversationSystemMessages(req.params.id);

    const messages = await db.query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(messages.rows);
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar los mensajes.' });
  }
});

// Send a message
app.post('/api/messages', filterChatMiddleware, async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  const { conversation_id, content, receiver_id } = req.body;
  
  try {
    const id = `msg_${Date.now()}`;
    await db.query(
      `INSERT INTO messages (id, conversation_id, sender_id, receiver_id, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, conversation_id, userId, receiver_id, content]
    );

    await db.query(`UPDATE conversations SET last_message = $1, updated_at = NOW() WHERE id = $2`, [content, conversation_id]);

    res.status(201).json({
      id,
      conversation_id,
      sender_id: userId,
      receiver_id,
      content,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos enviar el mensaje. Intentá de nuevo.' });
  }
});

// Start or get conversation for a property
app.post('/api/conversations', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  const propertyId = typeof req.body?.propertyId === 'string' ? req.body.propertyId.trim() : '';
  const requestedBookingId = typeof req.body?.bookingId === 'string' ? req.body.bookingId.trim() : '';
  const requestMode = req.body?.requestMode === 'protected' ? 'protected' : req.body?.requestMode === 'direct' ? 'direct' : null;
  const requestStatus = req.body?.requestStatus === 'accepted' ? 'accepted' : 'pending';
  const requestStartDate = typeof req.body?.startDate === 'string' && DATE_ONLY_PATTERN.test(req.body.startDate) ? req.body.startDate : null;
  const requestEndDate = typeof req.body?.endDate === 'string' && DATE_ONLY_PATTERN.test(req.body.endDate) ? req.body.endDate : null;
  const parsedRequestGuests = Number(req.body?.guests);
  const requestGuests = Number.isInteger(parsedRequestGuests) && parsedRequestGuests > 0 ? parsedRequestGuests : null;
  const parsedRequestTotal = Number(req.body?.totalPrice);
  const requestTotalPrice = Number.isFinite(parsedRequestTotal) ? parsedRequestTotal : null;
  const hasRequestContext = requestMode !== null || requestStartDate !== null || requestEndDate !== null || requestGuests !== null || requestTotalPrice !== null;
  const requestCreatedAt = hasRequestContext ? new Date().toISOString() : null;

  if (!propertyId) {
    return res.status(400).json({ error: 'Elegí la propiedad antes de abrir el chat.' });
  }

  try {
    const propertyResult = await db.query(
      `SELECT id, "hostId"
       FROM properties
       WHERE id = $1
       LIMIT 1`,
      [propertyId],
    );

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'No encontramos esa propiedad.' });
    }

    const property = propertyResult.rows[0];
    const hostId = property.hostId as string | undefined;

    if (!hostId) {
      return res.status(422).json({ error: 'Esta propiedad no tiene un anfitrión disponible para chatear.' });
    }

    if (userId === hostId) {
      return res.status(400).json({ error: 'No podés iniciar un chat con tu propia propiedad.' });
    }

    let bookingId: string | null = null;

    if (requestedBookingId) {
      const bookingResult = await db.query(
        `SELECT id, "propertyId", "userId"
         FROM bookings
         WHERE id = $1
         LIMIT 1`,
        [requestedBookingId],
      );

      const booking = bookingResult.rows[0];

      if (!booking || booking.userId !== userId || booking.propertyId !== propertyId) {
        return res.status(400).json({ error: 'No pudimos vincular esa solicitud con este chat.' });
      }

      bookingId = booking.id;
    }

    const existing = await db.query(
      `SELECT * FROM conversations WHERE tenant_id = $1 AND host_id = $2 AND property_id = $3`,
      [userId, hostId, propertyId]
    );

    if (existing.rows.length > 0) {
      const existingConversation = existing.rows[0];
      const shouldUpdateExisting =
        (bookingId && existingConversation.booking_id !== bookingId)
        || requestMode !== null
        || requestStartDate !== null
        || requestEndDate !== null
        || requestGuests !== null
        || requestTotalPrice !== null;

      if (shouldUpdateExisting) {
        const shouldReplaceRequestContext = hasRequestContext;
        const nextBookingId = shouldReplaceRequestContext
          ? bookingId ?? null
          : bookingId ?? existingConversation.booking_id ?? null;

        const updated = await db.query(
          `UPDATE conversations
           SET booking_id = $1,
               request_mode = COALESCE($2, request_mode),
               request_status = CASE
                 WHEN $10 THEN COALESCE($3, 'pending')
                 ELSE COALESCE($3, request_status, 'pending')
               END,
               request_created_at = CASE
                 WHEN $10 THEN $8::timestamp
                 ELSE request_created_at
               END,
               request_start_date = CASE
                 WHEN $10 THEN $4::date
                 ELSE COALESCE($4, request_start_date)
               END,
               request_end_date = CASE
                 WHEN $10 THEN $5::date
                 ELSE COALESCE($5, request_end_date)
               END,
               request_guests = CASE
                 WHEN $10 THEN $6
                 ELSE COALESCE($6, request_guests)
               END,
               request_total_price = CASE
                 WHEN $10 THEN $7
                 ELSE COALESCE($7, request_total_price)
               END,
               deposit_status = CASE
                 WHEN $10 THEN NULL
                 ELSE deposit_status
               END,
               updated_at = NOW()
           WHERE id = $9
           RETURNING *`,
          [nextBookingId, requestMode, requestStatus, requestStartDate, requestEndDate, requestGuests, requestTotalPrice, requestCreatedAt, existingConversation.id, shouldReplaceRequestContext],
        );

        return res.json(normalizeConversationRecord(updated.rows[0]));
      }

      return res.json(normalizeConversationRecord(existingConversation));
    }

    const id = `conv_${Date.now()}`;
    const result = await db.query(
      `INSERT INTO conversations (
         id, tenant_id, host_id, property_id, booking_id,
         request_mode, request_status, request_created_at, request_start_date, request_end_date, request_guests, request_total_price
       ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [id, userId, hostId, propertyId, bookingId, requestMode, requestStatus, requestCreatedAt, requestStartDate, requestEndDate, requestGuests, requestTotalPrice]
    );
    res.status(201).json(normalizeConversationRecord(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'No pudimos iniciar la conversación. Intentá de nuevo.' });
  }
});

app.post('/api/conversations/:id/accept-request', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  try {
    const conversationResult = await db.query(
      `SELECT c.*, b.status as "bookingStatus", b.request_mode as "bookingRequestMode"
       FROM conversations c
       LEFT JOIN bookings b ON b.id = c.booking_id
       WHERE c.id = $1
       LIMIT 1`,
      [req.params.id],
    );

    const conversation = conversationResult.rows[0];

    if (!conversation) {
      return res.status(404).json({ error: 'No encontramos esa conversación.' });
    }

    if (conversation.host_id !== userId) {
      return res.status(403).json({ error: 'Solo el anfitrión puede aceptar esta solicitud.' });
    }

    const requestResponseDeadline = getRequestResponseDeadline(conversation);
    if (conversation.request_status !== 'accepted' && requestResponseDeadline && Date.now() > requestResponseDeadline.getTime()) {
      return res.status(409).json({ error: 'La solicitud venció después de 24 horas sin respuesta. Pedile al huésped que mande una nueva si todavía quiere avanzar.' });
    }

    const effectiveRequestMode = conversation.request_mode === 'direct' || conversation.request_mode === 'protected'
      ? conversation.request_mode
      : conversation.booking_id
        ? 'protected'
        : 'direct';

    if (conversation.booking_id && conversation.bookingStatus === 'pending') {
      await db.query(
        `UPDATE bookings
         SET status = 'confirmed'
         WHERE id = $1`,
        [conversation.booking_id],
      );
    }

    const acceptanceMessage = getRequestAcceptedMessage(conversation.request_mode === 'direct' ? 'direct' : 'protected');
    const messageId = `msg_${Date.now()}`;

    await db.query(
      `UPDATE conversations
       SET request_status = 'accepted',
           last_message = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [acceptanceMessage, req.params.id],
    );

    await db.query(
      `INSERT INTO messages (id, conversation_id, sender_id, receiver_id, content, is_system, system_key)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       ON CONFLICT DO NOTHING`,
      [messageId, req.params.id, userId, conversation.tenant_id, acceptanceMessage, 'request-accepted'],
    );

    await logActivity(conversation.tenant_id, 'BOOKING_REQUEST_ACCEPTED', {
      bookingId: conversation.booking_id ?? undefined,
      conversationId: req.params.id,
      requestMode: effectiveRequestMode,
    });

    return res.json(await getEnrichedConversationById(req.params.id));
  } catch (err) {
    console.error('Error al aceptar solicitud en conversación:', err);
    return res.status(500).json({ error: 'No pudimos aceptar la solicitud. Intentá de nuevo.' });
  }
});

app.post('/api/conversations/:id/report-direct-deposit', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  try {
    const conversationResult = await db.query(
      `SELECT c.*, b.status as "bookingStatus"
       FROM conversations c
       LEFT JOIN bookings b ON b.id = c.booking_id
       WHERE c.id = $1
       LIMIT 1`,
      [req.params.id],
    );

    const conversation = conversationResult.rows[0];

    if (!conversation) {
      return res.status(404).json({ error: 'No encontramos esa conversación.' });
    }

    if (conversation.tenant_id !== userId) {
      return res.status(403).json({ error: 'Solo el huésped puede informar esta seña.' });
    }

    if (conversation.request_mode !== 'direct') {
      return res.status(422).json({ error: 'Esta acción solo aplica a acuerdos directos.' });
    }

    if (conversation.request_status !== 'accepted') {
      return res.status(422).json({ error: 'Esperá a que el anfitrión acepte la solicitud antes de informar la seña.' });
    }

    if (conversation.deposit_status === 'reported' || conversation.deposit_status === 'confirmed') {
      return res.json(await getEnrichedConversationById(req.params.id));
    }

    await db.query(
      `UPDATE conversations
       SET deposit_status = 'reported', updated_at = NOW()
       WHERE id = $1`,
      [req.params.id],
    );

    return res.json(await getEnrichedConversationById(req.params.id));
  } catch (err) {
    console.error('Error al informar la seña directa:', err);
    return res.status(500).json({ error: 'No pudimos registrar que informaste la seña. Intentá de nuevo.' });
  }
});

app.post('/api/conversations/:id/confirm-direct-deposit', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });

  let client;

  try {
    client = await db.getClient();
    await client.query('BEGIN');

    const conversationResult = await client.query(
      `SELECT c.*, p.title as "propertyTitle", p.location, p."hostName", tenant.name as "guestName"
       FROM conversations c
       JOIN properties p ON p.id = c.property_id
       LEFT JOIN users tenant ON tenant.id = c.tenant_id
       WHERE c.id = $1
       LIMIT 1`,
      [req.params.id],
    );

    const conversation = conversationResult.rows[0];

    if (!conversation) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No encontramos esa conversación.' });
    }

    if (conversation.host_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo el anfitrión puede confirmar la recepción de la seña.' });
    }

    if (conversation.request_mode !== 'direct') {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'Esta acción solo aplica a acuerdos directos.' });
    }

    if (conversation.request_status !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'La solicitud todavía no quedó aceptada.' });
    }

    if (conversation.deposit_status === 'confirmed') {
      await client.query('COMMIT');
      return res.json(await getEnrichedConversationById(req.params.id));
    }

    if (conversation.deposit_status !== 'reported') {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'Esperá a que el huésped informe la seña antes de confirmarla.' });
    }

    const startDate = typeof conversation.request_start_date === 'string' ? conversation.request_start_date : null;
    const endDate = typeof conversation.request_end_date === 'string' ? conversation.request_end_date : null;
    const guests = Number(conversation.request_guests);
    const totalPrice = Number(conversation.request_total_price);

    if (!startDate || !endDate || !Number.isInteger(guests) || guests < 1 || !Number.isFinite(totalPrice) || totalPrice <= 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'Faltan datos de la solicitud para registrar esta reserva.' });
    }

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [conversation.property_id]);

    const collision = await client.query(
      `SELECT id
       FROM bookings
       WHERE "propertyId" = $1
         AND status != 'cancelled'
         AND id <> COALESCE($4, '')
         AND start_date < $3::date
         AND end_date > $2::date
       LIMIT 1`,
      [conversation.property_id, startDate, endDate, conversation.booking_id ?? null],
    );

    if (collision.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No pudimos registrar la reserva porque esas fechas ya no están disponibles.' });
    }

    const bookingId = typeof conversation.booking_id === 'string' && conversation.booking_id ? conversation.booking_id : `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stayCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const contract = buildBookingContract({
      guestName: conversation.guestName || 'Huésped',
      hostName: conversation.hostName || 'Anfitrión',
      propertyTitle: conversation.propertyTitle || 'Propiedad',
      location: conversation.location || '',
      startDate,
      endDate,
      totalPrice,
    });

    if (conversation.booking_id) {
      await client.query(
        `UPDATE bookings
         SET status = 'confirmed',
             request_mode = 'direct',
             deposit_status = 'confirmed',
             contract_json = COALESCE(contract_json, $2)
         WHERE id = $1`,
        [conversation.booking_id, JSON.stringify(contract)],
      );
    } else {
      await client.query(
        `INSERT INTO bookings (id, "propertyId", "userId", status, start_date, end_date, total_price, guests, stay_code, contract_json, request_mode, deposit_status)
         VALUES ($1, $2, $3, 'confirmed', $4, $5, $6, $7, $8, $9, 'direct', 'confirmed')`,
        [bookingId, conversation.property_id, conversation.tenant_id, startDate, endDate, totalPrice, guests, stayCode, JSON.stringify(contract)],
      );
    }

    await client.query(
      `UPDATE conversations
       SET booking_id = $1,
           deposit_status = 'confirmed',
           updated_at = NOW()
       WHERE id = $2`,
      [bookingId, req.params.id],
    );

    await client.query('COMMIT');

    await logActivity(conversation.tenant_id, 'BOOKING_CREATED', {
      propertyId: conversation.property_id,
      startDate,
      endDate,
      guests,
      totalPrice,
      requestMode: 'direct',
    });

    return res.json(await getEnrichedConversationById(req.params.id));
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    console.error('Error al confirmar recepción de seña directa:', err);
    return res.status(500).json({ error: 'No pudimos confirmar la recepción de la seña. Intentá de nuevo.' });
  } finally {
    client?.release();
  }
});

app.post('/api/bookings/:id/pay-deposit', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
  }

  try {
    const booking = await getUserBookingById(userId, req.params.id);

    if (!booking) {
      return sendBookingError(res, 404, 'BOOKING_NOT_FOUND', 'No encontramos esa reserva.');
    }

    if (booking.requestMode !== 'protected') {
      return sendBookingError(res, 422, 'INVALID_PAYMENT_FLOW', 'Esta acción solo aplica a reservas protegidas.');
    }

    if (booking.status !== 'confirmed') {
      return sendBookingError(res, 422, 'BOOKING_NOT_ACCEPTED', 'Esperá a que el anfitrión acepte la solicitud antes de pagar la seña.');
    }

    if (booking.depositStatus === 'held' || booking.depositStatus === 'released') {
      return res.json({ booking });
    }

    await db.query(
      `UPDATE bookings
       SET deposit_status = 'held'
       WHERE id = $1 AND "userId" = $2`,
      [req.params.id, userId],
    );

    await db.query(
      `UPDATE conversations
       SET deposit_status = 'held', updated_at = NOW()
       WHERE booking_id = $1`,
      [req.params.id],
    );

    const updatedBooking = await getUserBookingById(userId, req.params.id);
    return res.json({ booking: updatedBooking });
  } catch (err) {
    console.error('Error al marcar la seña protegida:', err);
    return sendBookingError(res, 500, 'BOOKING_DEPOSIT_PAYMENT_FAILED', 'No pudimos registrar el pago de la seña. Intentá de nuevo.');
  }
});

app.post('/api/bookings/:id/confirm-arrival', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return sendBookingError(res, 401, 'AUTH_REQUIRED', AUTH_REQUIRED_ERROR);
  }

  try {
    const booking = await getUserBookingById(userId, req.params.id);

    if (!booking) {
      return sendBookingError(res, 404, 'BOOKING_NOT_FOUND', 'No encontramos esa reserva.');
    }

    if (booking.requestMode !== 'protected') {
      return sendBookingError(res, 422, 'INVALID_ARRIVAL_FLOW', 'Esta acción solo aplica a reservas protegidas.');
    }

    if (booking.depositStatus !== 'held') {
      return sendBookingError(res, 422, 'BOOKING_NOT_IN_CUSTODY', 'Primero necesitás tener la seña en custodia para confirmar la llegada.');
    }

    if (!hasBookingReachedStartDate(booking.startDate)) {
      return sendBookingError(res, 422, 'BOOKING_ARRIVAL_TOO_EARLY', 'Vas a poder confirmar la llegada desde el día del ingreso.');
    }

    await db.query(
      `UPDATE bookings
       SET deposit_status = 'released'
       WHERE id = $1 AND "userId" = $2`,
      [req.params.id, userId],
    );

    await db.query(
      `UPDATE conversations
       SET deposit_status = 'released', updated_at = NOW()
       WHERE booking_id = $1`,
      [req.params.id],
    );

    const updatedBooking = await getUserBookingById(userId, req.params.id);
    return res.json({ booking: updatedBooking });
  } catch (err) {
    console.error('Error al confirmar la llegada:', err);
    return sendBookingError(res, 500, 'BOOKING_ARRIVAL_CONFIRM_FAILED', 'No pudimos registrar la llegada. Intentá de nuevo.');
  }
});

// ==========================================
// REVIEWS ROUTES
// ==========================================

app.get('/api/reviews/:propertyId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.name as "userName"
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.property_id = $1
         AND r.type = 'guest_to_host'
       ORDER BY r.created_at DESC`,
      [req.params.propertyId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar las reseñas.' });
  }
});

app.post('/api/reviews', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  const bookingId = typeof req.body?.bookingId === 'string' ? req.body.bookingId : req.body?.booking_id;
  const reviewedUserId = typeof req.body?.reviewedUserId === 'string' ? req.body.reviewedUserId : req.body?.reviewed_user_id;
  const rating = Number(req.body?.rating);
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  const type = req.body?.type;
  const photosMatchReality = typeof req.body?.photos_match_reality === 'boolean' ? req.body.photos_match_reality : true;
  const pressureToBookFast = typeof req.body?.pressure_to_book_fast === 'boolean' ? req.body.pressure_to_book_fast : false;

  if (!bookingId || !reviewedUserId || (type !== 'host_to_guest' && type !== 'guest_to_host') || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(422).json({ error: 'Revisá los datos de la reseña antes de enviarla.' });
  }
  
  try {
    // Verificar que exista la reserva y el usuario sea parte
    const booking = await db.query(
      `SELECT b.id, b."propertyId", b."userId", p."hostId"
       FROM bookings b
       JOIN properties p ON p.id = b."propertyId"
       WHERE b.id = $1`,
      [bookingId],
    );
    if (booking.rows.length === 0) return res.status(404).json({ error: 'No encontramos esa reserva.' });

    const bookingRow = booking.rows[0];
    const expectedReviewerId = type === 'host_to_guest' ? bookingRow.hostId : bookingRow.userId;
    const normalizedReviewedUserId = type === 'host_to_guest' ? bookingRow.userId : bookingRow.hostId;

    if (req.session.userId !== expectedReviewerId) {
      return res.status(403).json({ error: 'No podés dejar una reseña para esta reserva.' });
    }

    if (normalizedReviewedUserId !== reviewedUserId) {
      return res.status(422).json({ error: 'La reseña no coincide con las personas involucradas en la reserva.' });
    }
    
    const id = `rev_${Date.now()}`;
    const result = await db.query(
      `INSERT INTO reviews (
         id, booking_id, reviewer_id, reviewed_user_id, property_id,
         rating, comment, type, photos_match_reality, pressure_to_book_fast
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        bookingId,
        req.session.userId,
        normalizedReviewedUserId,
        bookingRow.propertyId,
        rating,
        comment,
        type,
        photosMatchReality,
        pressureToBookFast,
      ]
    );
    
    // Actualizar rating del usuario reseñado
    const updateField = type === 'host_to_guest' ? 'rating' : 'host_rating';
    await db.query(
      `UPDATE users SET ${updateField} = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE reviewed_user_id = $1 AND type = $2), 0),
       total_reviews = COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_user_id = $1), 0),
       trust_score = LEAST(100, COALESCE(trust_score, 0) + 10)
       WHERE id = $1`,
      [normalizedReviewedUserId, type]
    );

    await db.query(
      `UPDATE properties
       SET rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE property_id = $1 AND type = 'guest_to_host'), 0),
           "reviewsCount" = COALESCE((SELECT COUNT(*) FROM reviews WHERE property_id = $1 AND type = 'guest_to_host'), 0)
       WHERE id = $1`,
      [bookingRow.propertyId],
    );
    
    // Lógica Simple de Insignias
    await db.query(
      `UPDATE users SET badge = CASE 
        WHEN (COALESCE(is_host, FALSE) OR role = 'host') AND host_rating >= 4.7 AND total_properties >= 3 THEN 'Anfitrion destacado'
        WHEN rating >= 4.5 THEN 'Huesped confiable'
        WHEN identity_validated THEN 'Verificado'
        ELSE 'Nuevo usuario'
      END WHERE id = $1`,
      [normalizedReviewedUserId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'No pudimos guardar tu reseña. Intentá de nuevo.' });
  }
});

// ==========================================
// HOST PROFILE ROUTE
// ==========================================

app.get('/api/hosts/:id', async (req, res) => {
  try {
    const hostProfile = await getHostProfileData(req.params.id);
    if (!hostProfile) return res.status(404).json({ error: 'No encontramos a ese anfitrión.' });
    res.json(hostProfile);
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar el perfil del anfitrión.' });
  }
});

// ==========================================
// FAVORITES ROUTES
// ==========================================

// GET /api/favorites - returns full property objects favorited by current user
app.get('/api/favorites', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  try {
    const result = await db.query(
      `SELECT p.*, ${PROPERTY_HOST_TRUST_SELECT}
       FROM favorites f
       JOIN properties p ON p.id = f.property_id
       ${PROPERTY_HOST_TRUST_JOINS}
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json(result.rows.map((property) => mapPropertyRecord(property)));
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.status(500).json({ error: 'No pudimos cargar tus guardados.' });
  }
});

// POST /api/favorites/:propertyId - add favorite
app.post('/api/favorites/:propertyId', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  const propertyId = req.params.propertyId;
  try {
    // Ensure property exists
    const prop = await db.query('SELECT id FROM properties WHERE id = $1', [propertyId]);
    if (prop.rows.length === 0) return res.status(404).json({ error: 'No encontramos esa propiedad.' });

    await db.query(
      `INSERT INTO favorites (user_id, property_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, propertyId]
    );

    // Optional: log activity
    await logActivity(userId, 'FAVORITE_ADD', { propertyId }, req.ip);

    res.status(201).json({ success: true, propertyId });
  } catch (err) {
    console.error('Error adding favorite:', err);
    res.status(500).json({ error: 'No pudimos guardar esta propiedad. Intentá de nuevo.' });
  }
});

// DELETE /api/favorites/:propertyId - remove favorite
app.delete('/api/favorites/:propertyId', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  const propertyId = req.params.propertyId;
  try {
    await db.query('DELETE FROM favorites WHERE user_id = $1 AND property_id = $2', [userId, propertyId]);
    await logActivity(userId, 'FAVORITE_REMOVE', { propertyId }, req.ip);
    res.json({ success: true, propertyId });
  } catch (err) {
    console.error('Error removing favorite:', err);
    res.status(500).json({ error: 'No pudimos sacar esta propiedad de tus guardados. Intentá de nuevo.' });
  }
});

// DELETE /api/favorites - remove all favorites for current user (bulk)
app.delete('/api/favorites', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: AUTH_REQUIRED_ERROR });
  try {
    const result = await db.query('DELETE FROM favorites WHERE user_id = $1 RETURNING property_id', [userId]);
    const deletedCount = result.rowCount || 0;
    await logActivity(userId, 'FAVORITES_CLEAR_ALL', { count: deletedCount }, req.ip);
    res.json({ success: true, deleted: deletedCount });
  } catch (err) {
    console.error('Error clearing favorites:', err);
    res.status(500).json({ error: 'No pudimos vaciar tus guardados. Intentá de nuevo.' });
  }
});

// POST /api/leads - create a lead when a user contacts about a property
app.post('/api/leads', async (req, res) => {
  const { propertyId, message, contactInfo, source } = req.body || {};
  const userId = req.session.userId || null;

  if (!propertyId) return res.status(400).json({ error: 'Falta la propiedad sobre la que querés consultar.' });

  try {
    // ensure property exists
    const prop = await db.query('SELECT id FROM properties WHERE id = $1', [propertyId]);
    if (prop.rows.length === 0) return res.status(404).json({ error: 'No encontramos esa propiedad.' });

    const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    await db.query(
      `INSERT INTO leads (id, property_id, user_id, contact_info, message, source) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, propertyId, userId, contactInfo ? JSON.stringify(contactInfo) : null, message || null, source || 'web']
    );

    await logActivity(userId || 'anonymous', 'LEAD_CREATED', { propertyId, leadId: id, source }, req.ip);
    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'No pudimos registrar tu consulta. Intentá de nuevo.' });
  }
});

// GET /api/properties/:id/reviews - return recent reviews for property
app.get('/api/properties/:id/reviews', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, reviewer_id, rating, comment, created_at
       FROM reviews
       WHERE property_id = $1
         AND type = 'guest_to_host'
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'No pudimos cargar las reseñas.' });
  }
});

if (!serverEnv.isTest) {
  app.listen(port, () => {
    console.log(`✓ Servidor corriendo en puerto ${port}`);
    console.log(`✓ CORS habilitado para: ${allowedOrigins.join(', ')}`);
  });
}

export default app;
