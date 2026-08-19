// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 3000,
  databaseUrl: required('DATABASE_URL'),
  clientOrigin: required('CLIENT_ORIGIN'),
  jwtSecret: required('JWT_SECRET'),
  cookieSecret: required('COOKIE_SECRET'),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Document Portal <no-reply@example.com>',
  },
  accessTokenTtlMinutes: 15,
  refreshTokenTtlDays: 7,
  passwordResetTtlMinutes: 30,
};

if (config.jwtSecret.length < 32 || config.cookieSecret.length < 32) {
  throw new Error('JWT_SECRET and COOKIE_SECRET must each be at least 32 characters long');
}
