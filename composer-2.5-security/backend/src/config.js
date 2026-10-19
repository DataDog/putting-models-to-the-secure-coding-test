import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://portal:portal_dev_password@localhost:5432/document_portal'),
  jwtSecret: requireEnv('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
  sessionSecret: requireEnv('SESSION_SECRET', 'dev-session-secret-change-in-production'),
  clientUrl: requireEnv('CLIENT_URL', 'http://localhost:5173'),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@document-portal.local',
  },
  uploadDir: path.resolve(__dirname, '../uploads'),
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/gif',
  ],
};
