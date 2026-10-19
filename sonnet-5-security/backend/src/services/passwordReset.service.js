import { pool } from '../db/pool.js';
import { generateOpaqueToken, hashToken } from './token.service.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour, single-use

export async function createPasswordResetToken(userId) {
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return token;
}

export async function findValidResetToken(token) {
  const tokenHash = hashToken(token);
  const { rows } = await pool.query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function markResetTokenUsed(id) {
  await pool.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [id]);
}
