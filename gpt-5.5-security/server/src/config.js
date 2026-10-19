import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv();

const rootDir = process.cwd();
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOrigins(...values) {
  const origins = new Set();
  for (const value of values) {
    if (!value) {
      continue;
    }
    for (const origin of value.split(',')) {
      const trimmed = origin.trim();
      if (trimmed) {
        origins.add(trimmed);
      }
    }
  }
  return origins;
}

function workspacePath(value) {
  const resolved = path.resolve(rootDir, value);
  const relative = path.relative(rootDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${value} must resolve inside this project folder`);
  }
  return resolved;
}

const jwtSecret = requiredEnv('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

const cookieSecure = parseBoolean(process.env.COOKIE_SECURE, isProduction);
const cookieSameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!['strict', 'lax', 'none'].includes(cookieSameSite)) {
  throw new Error('COOKIE_SAME_SITE must be strict, lax, or none');
}
if (cookieSameSite === 'none' && !cookieSecure) {
  throw new Error('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true');
}

export const config = Object.freeze({
  rootDir,
  nodeEnv,
  isProduction,
  port: parseInteger(process.env.PORT, 3000),
  databaseUrl: requiredEnv('DATABASE_URL'),
  databaseSsl: parseBoolean(process.env.DATABASE_SSL, isProduction),
  jwtSecret,
  jwtIssuer: process.env.JWT_ISSUER || 'document-portal',
  jwtAudience: process.env.JWT_AUDIENCE || 'document-portal-web',
  cookieName: 'id',
  cookieSecure,
  cookieSameSite,
  allowedOrigins: parseOrigins(process.env.APP_ORIGIN, process.env.FRONTEND_ORIGINS),
  publicAppUrl: process.env.PUBLIC_APP_URL || process.env.APP_ORIGIN || 'http://localhost:5173',
  allowPublicRegistration: parseBoolean(process.env.ALLOW_PUBLIC_REGISTRATION, false),
  sessionMinutes: parseInteger(process.env.SESSION_MINUTES, 30),
  resetTokenMinutes: parseInteger(process.env.RESET_TOKEN_MINUTES, 30),
  maxUploadBytes: parseInteger(process.env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024),
  uploadDir: workspacePath(process.env.UPLOAD_DIR || 'server/uploads'),
  logLevel: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')
});

