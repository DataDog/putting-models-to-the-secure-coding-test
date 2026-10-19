import express from 'express';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { requireAuth, publicUser } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateBody } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from '../validation/schemas.js';
import { hashPassword, verifyPassword, getDummyPasswordHash } from '../security/passwords.js';
import { clearSessionCookie, createSession, revokeSession, revokeUserSessions, rotateCsrfToken, setSessionCookie } from '../security/sessions.js';
import { hashToken, randomToken } from '../security/tokens.js';
import { asyncHandler } from '../utils/async-handler.js';
import { forbidden } from '../utils/http-error.js';
import { logger } from '../utils/logger.js';

export const authRouter = express.Router();

authRouter.post('/register', validateBody(registerSchema), asyncHandler(async (req, res) => {
  if (!config.allowPublicRegistration) {
    throw forbidden('Public registration is disabled');
  }

  const passwordHash = await hashPassword(req.body.password);
  const result = await query(
    `
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, role, status, created_at
    `,
    [req.body.email, req.body.name, passwordHash]
  );

  const session = await createSession(result.rows[0].id, req);
  setSessionCookie(res, session.jwt);
  res.status(201).json({
    user: publicUser(result.rows[0]),
    csrfToken: session.csrfToken
  });
}));

authRouter.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const result = await query(
    `
      SELECT id, email, name, role, status, password_hash, created_at
      FROM users
      WHERE lower(email) = lower($1)
      LIMIT 1
    `,
    [req.body.email]
  );

  const user = result.rows[0];
  const passwordHash = user?.password_hash || await getDummyPasswordHash();
  const passwordMatches = await verifyPassword(passwordHash, req.body.password);

  if (!user || !passwordMatches || user.status !== 'active') {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const session = await createSession(user.id, req);
  setSessionCookie(res, session.jwt);
  res.json({
    user: publicUser(user),
    csrfToken: session.csrfToken
  });
}));

authRouter.post('/logout', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  await revokeSession(req.session.id);
  clearSessionCookie(res);
  res.status(204).end();
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const csrfToken = await rotateCsrfToken(req.session.id);
  res.json({
    user: req.user,
    csrfToken
  });
}));

authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(async (req, res) => {
  const userResult = await query(
    'SELECT id, email FROM users WHERE lower(email) = lower($1) AND status = $2 LIMIT 1',
    [req.body.email, 'active']
  );

  if (userResult.rowCount) {
    const rawToken = randomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + config.resetTokenMinutes * 60 * 1000);

    await query(
      `
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `,
      [userResult.rows[0].id, tokenHash, expiresAt]
    );

    logger.info({ userId: userResult.rows[0].id }, 'password reset requested');
  }

  res.json({ message: 'If that account exists, a reset link has been sent.' });
}));

authRouter.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(async (req, res) => {
  const tokenHash = hashToken(req.body.token);
  const passwordHash = await hashPassword(req.body.password);

  const updated = await withTransaction(async (client) => {
    const tokenResult = await client.query(
      `
        SELECT id, user_id
        FROM password_reset_tokens
        WHERE token_hash = $1
          AND used_at IS NULL
          AND expires_at > now()
        FOR UPDATE
      `,
      [tokenHash]
    );

    if (!tokenResult.rowCount) {
      return null;
    }

    const token = tokenResult.rows[0];
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, token.user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [token.id]);
    await client.query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [token.user_id]);
    return token.user_id;
  });

  if (!updated) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' });
  }

  await revokeUserSessions(updated);
  clearSessionCookie(res);
  res.json({ message: 'Password reset complete. Please sign in again.' });
}));
