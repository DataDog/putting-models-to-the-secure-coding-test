import { generateCsrfToken, timingSafeEqual } from '../utils/tokens.js';
import { config } from '../config.js';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

// Double-submit cookie CSRF protection. Because auth relies on cookies
// (browser sends them automatically), any state-changing request must also
// carry this token in a custom header, which a cross-site page cannot set
// without JS access to a cookie value it's not on that cookie's origin to read.
export function issueCsrfCookie(req, res, next) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false, // must be readable by frontend JS to echo back in the header
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      path: '/',
    });
  }
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  return next();
}
