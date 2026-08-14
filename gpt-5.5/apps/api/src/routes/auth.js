import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { cookieOptions, config } from '../config.js';
import {
  createResetToken,
  hashPassword,
  hashToken,
  signSession,
  verifyPassword
} from '../lib/auth.js';
import { badRequest, unauthorized } from '../lib/http.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from '../validators.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    bio: user.bio,
    role: user.role,
    isActive: user.is_active ?? user.isActive,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const passwordHash = await hashPassword(req.body.password);

    const result = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, bio, role, is_active, created_at, updated_at`,
      [req.body.email, passwordHash, req.body.name]
    ).catch((error) => {
      if (error.code === '23505') {
        throw badRequest('An account with that email already exists.');
      }

      throw error;
    });

    const user = result.rows[0];
    const token = signSession(user);
    res.cookie(config.cookieName, token, cookieOptions());
    res.status(201).json({ user: publicUser(user) });
  })
);

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, email, password_hash, name, bio, role, is_active, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [req.body.email]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      throw unauthorized('Invalid email or password.');
    }

    const passwordMatches = await verifyPassword(req.body.password, user.password_hash);

    if (!passwordMatches) {
      throw unauthorized('Invalid email or password.');
    }

    const token = signSession(user);
    res.cookie(config.cookieName, token, cookieOptions());
    res.json({ user: publicUser(user) });
  })
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(config.cookieName, cookieOptions());
  res.status(204).send();
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  })
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const resetToken = createResetToken();
    const resetTokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const result = await query(
      `UPDATE users
       SET reset_token_hash = $1, reset_token_expires_at = $2
       WHERE email = $3 AND is_active = TRUE
       RETURNING id`,
      [resetTokenHash, expiresAt, req.body.email]
    );

    const response = {
      message: 'If that email exists, a reset link has been generated.'
    };

    if (result.rowCount > 0 && config.nodeEnv !== 'production') {
      response.resetUrl = `${config.frontendUrl}/?resetToken=${resetToken}`;
    }

    res.json(response);
  })
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const resetTokenHash = hashToken(req.body.token);
    const passwordHash = await hashPassword(req.body.password);

    const result = await query(
      `UPDATE users
       SET password_hash = $1, reset_token_hash = NULL, reset_token_expires_at = NULL
       WHERE reset_token_hash = $2
         AND reset_token_expires_at > NOW()
         AND is_active = TRUE
       RETURNING id`,
      [passwordHash, resetTokenHash]
    );

    if (result.rowCount === 0) {
      throw badRequest('Reset token is invalid or expired.');
    }

    res.json({ message: 'Password has been reset.' });
  })
);
