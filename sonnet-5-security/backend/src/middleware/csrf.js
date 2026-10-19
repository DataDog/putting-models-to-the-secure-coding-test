import crypto from 'node:crypto';
import { getSessionById } from '../services/session.service.js';
import { CSRF_COOKIE_NAME } from '../utils/cookies.js';
import { AppError } from '../utils/AppError.js';

const CSRF_HEADER = 'x-csrf-token';

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Double-submit CSRF check, cross-verified against the session record so a
// stolen cookie value alone (without the matching session) is not enough.
// Runs after requireAuth, so req.user.sessionId is available.
export async function requireCsrf(req, res, next) {
  try {
    const headerToken = req.get(CSRF_HEADER);
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    if (!headerToken || !cookieToken || !safeEqual(headerToken, cookieToken)) {
      return next(new AppError(403, 'CSRF validation failed'));
    }

    const session = await getSessionById(req.user.sessionId);
    if (!session || session.revoked_at || !safeEqual(session.csrf_token, headerToken)) {
      return next(new AppError(403, 'CSRF validation failed'));
    }

    next();
  } catch (err) {
    next(err);
  }
}
