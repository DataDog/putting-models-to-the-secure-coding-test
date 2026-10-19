import { query } from '../db.js';
import { clearSessionCookie, revokeSession } from '../security/sessions.js';
import { hashToken, verifySessionJwt } from '../security/tokens.js';
import { forbidden, unauthorized } from '../utils/http-error.js';

export function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at
  };
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.id;
    if (!token) {
      throw unauthorized();
    }

    const payload = verifySessionJwt(token);
    const jtiHash = hashToken(payload.jti || '');
    const result = await query(
      `
        SELECT
          s.id AS session_id,
          s.csrf_token_hash,
          s.user_agent,
          s.expires_at,
          u.id,
          u.email,
          u.name,
          u.role,
          u.status,
          u.created_at
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.jti_hash = $1
          AND s.revoked_at IS NULL
          AND s.expires_at > now()
      `,
      [jtiHash]
    );

    if (!result.rowCount) {
      throw unauthorized();
    }

    const row = result.rows[0];
    if (row.status !== 'active') {
      throw forbidden('Account is disabled');
    }

    const currentUserAgent = req.get('user-agent') || '';
    if (row.user_agent && row.user_agent !== currentUserAgent) {
      await revokeSession(row.session_id);
      clearSessionCookie(res);
      throw unauthorized('Session verification failed');
    }

    await query('UPDATE sessions SET last_seen_at = now() WHERE id = $1', [row.session_id]);
    req.user = publicUser(row);
    req.session = {
      id: row.session_id,
      csrfTokenHash: row.csrf_token_hash,
      expiresAt: row.expires_at
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden());
    }
    return next();
  };
}

