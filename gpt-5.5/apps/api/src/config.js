// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiRoot = path.resolve(__dirname, '..');

function intFromEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function csvFromEnv(name, fallback) {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: intFromEnv('PORT', 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/document_portal',
  jwtSecret:
    process.env.JWT_SECRET ?? 'development-secret-change-before-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  cookieName: process.env.COOKIE_NAME ?? 'portal_session',
  corsOrigins: csvFromEnv('CORS_ORIGINS', 'http://localhost:5173'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  uploadDir: path.join(apiRoot, 'uploads'),
  maxUploadBytes: intFromEnv('MAX_UPLOAD_MB', 10) * 1024 * 1024
};

export function assertProductionConfig() {
  if (config.nodeEnv !== 'production') {
    return;
  }

  if (config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
}

export function cookieOptions() {
  const isProduction = config.nodeEnv === 'production';

  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/'
  };
}
