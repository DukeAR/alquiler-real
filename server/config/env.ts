import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';

type SessionSameSite = 'lax' | 'strict' | 'none';

const envFileNames = process.env.NODE_ENV === 'production'
  ? ['.env.production', '.env']
  : process.env.NODE_ENV === 'test'
    ? ['.env']
    : ['.env.local', '.env'];

for (const envFileName of envFileNames) {
  const envFilePath = resolve(process.cwd(), envFileName);

  if (existsSync(envFilePath)) {
    loadEnv({ path: envFilePath, override: false });
  }
}

const LOCAL_DATABASE_URL = 'postgres://user:password@localhost:5432/alquiler_real';

const normalizeUrl = (value?: string) => value?.trim().replace(/\/+$/, '') || '';

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return fallback;
};

const parseSameSite = (value: string | undefined, fallback: SessionSameSite): SessionSameSite => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'lax' || normalized === 'strict' || normalized === 'none') {
    return normalized;
  }

  return fallback;
};

const parsePort = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
};

const parseNonNegativeInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return fallback;
};

const parseOrigins = (value?: string) => value
  ?.split(',')
  .map((origin) => normalizeUrl(origin))
  .filter(Boolean) || [];

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const localFrontendOrigins = isProduction ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const databaseUrl = process.env.DATABASE_URL?.trim() || (isProduction ? '' : LOCAL_DATABASE_URL);
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required in production.');
}

const sessionSecret = process.env.SESSION_SECRET?.trim() || (isProduction ? '' : 'dev-secret-change-in-production');
if (!sessionSecret) {
  throw new Error('SESSION_SECRET is required in production.');
}

const frontendUrl = normalizeUrl(process.env.FRONTEND_URL);
const corsAllowedOrigins = Array.from(new Set([
  ...localFrontendOrigins,
  ...parseOrigins(process.env.CORS_ALLOWED_ORIGINS),
  ...(frontendUrl ? [frontendUrl] : []),
]));

const sessionCookieSecure = parseBoolean(process.env.SESSION_COOKIE_SECURE, isProduction);

export const serverEnv = {
  isProduction,
  isTest,
  port: parsePort(process.env.PORT, 3001),
  databaseUrl,
  databaseSsl: parseBoolean(process.env.DATABASE_SSL, isProduction),
  sessionSecret,
  frontendUrl,
  corsAllowedOrigins,
  trustProxy: parseBoolean(process.env.TRUST_PROXY, isProduction),
  sessionCookieName: process.env.SESSION_COOKIE_NAME?.trim() || 'connect.sid',
  sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN?.trim() || undefined,
  sessionCookieSecure,
  sessionCookieSameSite: parseSameSite(process.env.SESSION_COOKIE_SAME_SITE, sessionCookieSecure ? 'none' : 'lax'),
  premiumDocumentaryPriceArs: parseNonNegativeInt(process.env.PREMIUM_DOCUMENTARY_PRICE_ARS, 18000),
  premiumOnsitePriceArs: parseNonNegativeInt(process.env.PREMIUM_ONSITE_PRICE_ARS, 42000),
  premiumDocumentaryFreeSlots: parseNonNegativeInt(process.env.PREMIUM_DOCUMENTARY_FREE_SLOTS, 20),
  premiumOnsiteFreeSlots: parseNonNegativeInt(process.env.PREMIUM_ONSITE_FREE_SLOTS, 10),
  fileStorageRoot: resolve(process.cwd(), process.env.FILE_STORAGE_ROOT?.trim() || 'temp/storage'),
  fileAccessSecret: process.env.FILE_ACCESS_SECRET?.trim() || sessionSecret,
  internalOpsSecret: process.env.INTERNAL_OPS_SECRET?.trim() || sessionSecret,
};