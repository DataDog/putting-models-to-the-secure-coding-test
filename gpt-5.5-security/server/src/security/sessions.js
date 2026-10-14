import { config } from '../config.js';
import { query } from '../db.js';
import { hashToken, hmacIdentifier, randomToken, signSessionJwt } from './tokens.js';

function requestIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}

export function setSessionCookie(res, token) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
    maxAge: config.sessionMinutes * 60 * 1000
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/'
  });
}

export async function createSession(userId, req) {
  const jti = randomToken(32);
  const csrfToken = randomToken(32);
  const jwt = signSessionJwt({ userId, jti });
  const expiresAt = new Date(Date.now() + config.sessionMinutes * 60 * 1000);

  const result = await query(
    `
      INSERT INTO sessions (user_id, jti_hash, csrf_token_hash, user_agent, ip_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, expires_at
    `,
    [
      userId,
      hashToken(jti),
      hashToken(csrfToken),
      req.get('user-agent') || '',
      hmacIdentifier(requestIp(req)),
      expiresAt
    ]
  );

  return {
    id: result.rows[0].id,
    jwt,
    csrfToken,
    expiresAt: result.rows[0].expires_at
  };
}

export async function rotateCsrfToken(sessionId) {
  const csrfToken = randomToken(32);
  await query('UPDATE sessions SET csrf_token_hash = $1 WHERE id = $2', [hashToken(csrfToken), sessionId]);
  return csrfToken;
}

export async function revokeSession(sessionId) {
  await query('UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL', [sessionId]);
}

export async function revokeUserSessions(userId) {
  await query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

