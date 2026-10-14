import { pool } from '../db/pool.js';
import { generateOpaqueToken, hashToken, refreshTokenExpiry } from './token.service.js';

export async function createSession({ userId, userAgent, ipFingerprint }) {
  const refreshToken = generateOpaqueToken();
  const csrfToken = generateOpaqueToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = refreshTokenExpiry();

  const { rows } = await pool.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, csrf_token, user_agent, ip_fingerprint, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, refreshTokenHash, csrfToken, userAgent || null, ipFingerprint || null, expiresAt]
  );

  return { sessionId: rows[0].id, refreshToken, csrfToken, expiresAt };
}

export async function findActiveSessionByRefreshToken(refreshToken) {
  const refreshTokenHash = hashToken(refreshToken);
  const { rows } = await pool.query(
    `SELECT * FROM sessions
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [refreshTokenHash]
  );
  return rows[0] || null;
}

export async function rotateSession(sessionId, { userAgent, ipFingerprint }) {
  const refreshToken = generateOpaqueToken();
  const csrfToken = generateOpaqueToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = refreshTokenExpiry();

  await pool.query(
    `UPDATE sessions
     SET refresh_token_hash = $1, csrf_token = $2, expires_at = $3, user_agent = $4, ip_fingerprint = $5
     WHERE id = $6`,
    [refreshTokenHash, csrfToken, expiresAt, userAgent || null, ipFingerprint || null, sessionId]
  );

  return { refreshToken, csrfToken, expiresAt };
}

export async function revokeSession(sessionId) {
  await pool.query('UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL', [sessionId]);
}

export async function revokeAllSessionsForUser(userId) {
  await pool.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

export async function getSessionById(sessionId) {
  const { rows } = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  return rows[0] || null;
}
