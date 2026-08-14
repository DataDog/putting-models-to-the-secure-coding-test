import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { hashPassword, verifyPassword, isPasswordStrongEnough } from '../utils/password.js';
import {
  signAccessToken,
  generateOpaqueToken,
  hashToken,
} from '../utils/tokens.js';
import { setAccessTokenCookie, setRefreshTokenCookie, clearAuthCookies } from '../utils/cookies.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter, passwordResetLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { config } from '../config.js';

export const authRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email().max(255);

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(12).max(256),
  name: z.string().trim().min(1).max(100),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(12).max(256),
});

async function issueSession(res, user, req) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateOpaqueToken();
  const refreshExpiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, hashToken(refreshToken), req.get('user-agent') || null, req.ip, refreshExpiresAt],
  );

  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
}

authRouter.post('/register', registerLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!isPasswordStrongEnough(password)) {
      return res.status(400).json({ error: 'Password must be between 12 and 256 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Unable to create account with those details' });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, name, role`,
      [email, passwordHash, name],
    );
    const user = result.rows[0];

    await issueSession(res, user, req);
    return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/login', loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await query(
      'SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];

    // Always run bcrypt.compare against *some* hash, even for unknown
    // emails, so response timing doesn't reveal whether the account exists.
    const dummyHash = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO2/wF0uzHz.5tSGqx8v.6.9k0YQdRHVi';
    const passwordMatches = await verifyPassword(password, user ? user.password_hash : dummyHash);

    if (!user || !user.is_active || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await issueSession(res, user, req);
    return res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refresh_token;
    if (!rawToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tokenHash = hashToken(rawToken);
    const result = await query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.id AS uid, u.email, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0];

    if (!row || row.revoked_at || new Date(row.expires_at) < new Date() || !row.is_active) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Session expired, please log in again' });
    }

    // Rotate: revoke the old refresh token and issue a new one. Limits the
    // damage window if a refresh token is ever exfiltrated.
    await query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);
    await issueSession(res, { id: row.uid, email: row.email, role: row.role }, req);

    return res.json({ user: { id: row.uid, email: row.email, role: row.role } });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refresh_token;
    if (rawToken) {
      await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1', [hashToken(rawToken)]);
    }
    clearAuthCookies(res);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

authRouter.post(
  '/forgot-password',
  passwordResetLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const result = await query('SELECT id FROM users WHERE email = $1 AND is_active = TRUE', [email]);
      const user = result.rows[0];

      // Always respond identically whether or not the account exists, so
      // this endpoint can't be used to enumerate registered emails.
      if (user) {
        const rawToken = generateOpaqueToken();
        const expiresAt = new Date(Date.now() + config.passwordResetTtlMinutes * 60 * 1000);
        await query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
          [user.id, hashToken(rawToken), expiresAt],
        );
        const resetUrl = `${config.clientOrigin}/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail(email, resetUrl);
      }

      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (err) {
      return next(err);
    }
  },
);

authRouter.post(
  '/reset-password',
  passwordResetLimiter,
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, password } = req.body;
      if (!isPasswordStrongEnough(password)) {
        return res.status(400).json({ error: 'Password must be between 12 and 256 characters' });
      }

      const tokenHash = hashToken(token);
      const result = await query(
        `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
        [tokenHash],
      );
      const row = result.rows[0];

      if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
        return res.status(400).json({ error: 'This reset link is invalid or has expired' });
      }

      const passwordHash = await hashPassword(password);
      await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
        passwordHash,
        row.user_id,
      ]);
      await query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [row.id]);
      // Invalidate all existing sessions on password reset — a real
      // security-relevant event should evict anyone holding an old session,
      // including an attacker who set the reset in motion themselves.
      await query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [
        row.user_id,
      ]);

      return res.json({ message: 'Password has been reset. Please log in again.' });
    } catch (err) {
      return next(err);
    }
  },
);
