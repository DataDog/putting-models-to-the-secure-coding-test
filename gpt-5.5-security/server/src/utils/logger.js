import pino from 'pino';
import { config } from '../config.js';

export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-csrf-token"]',
      'res.headers["set-cookie"]',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      '*.token',
      '*.csrfToken',
      '*.resetUrl'
    ],
    censor: '[redacted]'
  }
});

export function logSafe(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/[\r\n\t]/g, ' ').slice(0, 500);
}

