import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../db.js';
import { config } from '../config.js';
import {
  authenticateUser,
  createSession,
  refreshSession,
  invalidateSession,
  setAuthCookies,
  clearAuthCookies,
  hashPassword,
} from '../services/auth.js';
import { sendPasswordResetEmail } from '../services/mail.js';
import { generateToken, hashToken } from '../utils/tokens.js';
import { isValidEmail, isValidPassword } from '../utils/validation.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, try again later' },
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = await authenticateUser(email.toLowerCase(), password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const session = await createSession(user);
    setAuthCookies(res, session.accessToken, session.refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await invalidateSession(req.user.id);
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const session = await refreshSession(refreshToken);
    if (!session) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (user && user.active) {
      const token = generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashToken(token),
          resetExpires,
        },
      });

      const resetUrl = `${config.clientOrigin}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Invalid token or password (min 8 characters)' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashToken(token),
        resetExpires: { gt: new Date() },
        active: true,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpires: null,
        refreshToken: null,
        refreshExpires: null,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
