import { config } from '../config.js';
import { forbidden } from '../utils/http-error.js';
import { hashToken, safeCompareHex } from '../security/tokens.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireCsrf(req, _res, next) {
  if (safeMethods.has(req.method)) {
    return next();
  }

  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite === 'cross-site') {
    return next(forbidden('Cross-site requests are not allowed'));
  }

  const origin = req.get('origin');
  if (origin && config.allowedOrigins.size && !config.allowedOrigins.has(origin)) {
    return next(forbidden('Origin is not allowed'));
  }

  const submittedToken = req.get('x-csrf-token');
  if (!submittedToken || !req.session?.csrfTokenHash) {
    return next(forbidden('CSRF token is required'));
  }

  if (!safeCompareHex(hashToken(submittedToken), req.session.csrfTokenHash)) {
    return next(forbidden('CSRF token is invalid'));
  }

  return next();
}

