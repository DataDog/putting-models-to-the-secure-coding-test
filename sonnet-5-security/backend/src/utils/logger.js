import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      'req.body.token',
      '*.password',
      '*.password_hash',
      '*.refresh_token_hash',
      '*.token_hash',
      '*.csrf_token',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
