import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE_NAME } from '../utils/cookies.js';
import {
  hashPassword,
  verifyPasswordConstantTime,
  isPasswordAcceptable,
} from '../services/auth.service.js';
import { signAccessToken } from '../services/token.service.js';
import {
  createSession,
  findActiveSessionByRefreshToken,
  rotateSession,
  revokeSession,
} from '../services/session.service.js';
import { createUser, findUserByEmail, findUserById, updateUserPassword } from '../services/user.service.js';
import {
  createPasswordResetToken,
  findValidResetToken,
  markResetTokenUsed,
} from '../services/passwordReset.service.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { revokeAllSessionsForUser } from '../services/session.service.js';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(128),
});

const GENERIC_LOGIN_ERROR = 'Invalid email or password';

function clientFingerprint(req) {
  return { userAgent: req.get('user-agent') || null, ipFingerprint: req.ip };
}

async function issueSessionAndRespond(res, user, req) {
  const { userAgent, ipFingerprint } = clientFingerprint(req);
  const { sessionId, refreshToken, csrfToken } = await createSession({
    userId: user.id,
    userAgent,
    ipFingerprint,
  });
  const accessToken = signAccessToken({ userId: user.id, role: user.role, sessionId });
  setAuthCookies(res, { accessToken, refreshToken, csrfToken });
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
}

export async function register(req, res, next) {
  try {
    if (!isPasswordAcceptable(req.body.password)) {
      throw new AppError(400, 'Password must be between 8 and 128 characters');
    }

    const existing = await findUserByEmail(req.body.email);
    if (existing) {
      throw new AppError(409, 'An account with this email already exists');
    }

    const passwordHash = await hashPassword(req.body.password);
    const user = await createUser({ email: req.body.email, passwordHash, name: req.body.name });

    await issueSessionAndRespond(res, user, req);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const user = await findUserByEmail(req.body.email);

    // Always run the password verify (against a dummy hash if the user
    // doesn't exist) so response timing doesn't reveal account existence.
    const passwordMatches = await verifyPasswordConstantTime(user?.password_hash, req.body.password);

    if (!user || !user.is_active || !passwordMatches) {
      throw new AppError(401, GENERIC_LOGIN_ERROR);
    }

    await issueSessionAndRespond(res, user, req);
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    if (req.user?.sessionId) {
      await revokeSession(req.user.sessionId);
    }
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new AppError(401, 'Authentication required');
    }

    const session = await findActiveSessionByRefreshToken(refreshToken);
    if (!session) {
      clearAuthCookies(res);
      throw new AppError(401, 'Authentication required');
    }

    const user = await findUserById(session.user_id);
    if (!user || !user.is_active) {
      clearAuthCookies(res);
      throw new AppError(401, 'Authentication required');
    }

    const { userAgent, ipFingerprint } = clientFingerprint(req);
    const rotated = await rotateSession(session.id, { userAgent, ipFingerprint });
    const accessToken = signAccessToken({ userId: user.id, role: user.role, sessionId: session.id });

    setAuthCookies(res, {
      accessToken,
      refreshToken: rotated.refreshToken,
      csrfToken: rotated.csrfToken,
    });

    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    next(err);
  }
}

const GENERIC_RESET_REQUEST_MESSAGE =
  'If an account with that email exists, a password reset link has been sent';

export async function forgotPassword(req, res, next) {
  try {
    const user = await findUserByEmail(req.body.email);

    if (user && user.is_active) {
      const token = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail(user, token);
    }

    // Identical response whether or not the account exists, to prevent
    // account enumeration via this endpoint.
    res.json({ message: GENERIC_RESET_REQUEST_MESSAGE });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    if (!isPasswordAcceptable(req.body.newPassword)) {
      throw new AppError(400, 'Password must be between 8 and 128 characters');
    }

    const resetRecord = await findValidResetToken(req.body.token);
    if (!resetRecord) {
      throw new AppError(400, 'Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(req.body.newPassword);
    await updateUserPassword(resetRecord.user_id, passwordHash);
    await markResetTokenUsed(resetRecord.id);

    // Rotate/invalidate all existing sessions and require the user to log
    // in again rather than auto-logging them in.
    await revokeAllSessionsForUser(resetRecord.user_id);
    clearAuthCookies(res);

    res.json({ message: 'Password has been reset. Please log in.' });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      throw new AppError(401, 'Authentication required');
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
