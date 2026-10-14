import { verifyAccessToken } from '../services/token.service.js';
import { ACCESS_COOKIE_NAME } from '../utils/cookies.js';
import { AppError } from '../utils/AppError.js';

export function requireAuth(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  if (!token) {
    return next(new AppError(401, 'Authentication required'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, sessionId: payload.sid };
    next();
  } catch {
    next(new AppError(401, 'Authentication required'));
  }
}
