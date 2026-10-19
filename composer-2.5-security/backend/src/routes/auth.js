import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { query } from '../db/pool.js';
import { signToken, authenticate } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { config } from '../config.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
});

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email.toLowerCase(), passwordHash, name.trim(), 'user']
    );

    const user = result.rows[0];
    const token = signToken(user);

    req.session.userId = user.id;

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT id, email, name, role, bio, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    delete user.password_hash;
    const token = signToken(user);

    req.session.userId = user.id;

    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);

    // Always return success to prevent email enumeration
    const successMessage = 'If an account exists, a reset link has been sent.';

    if (result.rows.length === 0) {
      return res.json({ message: successMessage });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await query(
      'UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3',
      [resetTokenHash, expires, result.rows[0].id]
    );

    const resetUrl = `${config.clientUrl}/#/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(email.toLowerCase(), resetUrl);

    res.json({ message: successMessage });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenHash = hashToken(token);
    const result = await query(
      `SELECT id FROM users
       WHERE reset_token_hash = $1 AND reset_token_expires > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE users
       SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    );

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
