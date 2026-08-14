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
