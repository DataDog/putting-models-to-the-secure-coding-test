// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import crypto from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  issueRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  hashToken,
} from '../services/token.service.js';
import { sendPasswordResetEmail } from '../services/mail.service.js';
import { env, isProduction } from '../config/env.js';

const REFRESH_COOKIE_NAME = 'rt';
const CSRF_COOKIE_NAME = 'csrfToken';

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN,
  };
}

function setAuthCookies(res, refreshTokenRaw, refreshExpiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, refreshTokenRaw, {
    ...baseCookieOptions(),
    path: '/api/auth',
    expires: refreshExpiresAt,
  });

  const csrfToken = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    domain: env.COOKIE_DOMAIN,
    path: '/',
    expires: refreshExpiresAt,
  });
}

function clearAuthCookies(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...baseCookieOptions(), path: '/api/auth' });
  res.clearCookie(CSRF_COOKIE_NAME, { ...baseCookieOptions(), httpOnly: false, path: '/' });
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const { raw, record } = await issueRefreshToken(user.id);
  setAuthCookies(res, raw, record.expiresAt);
  return accessToken;
}

export async function register(req, res) {
  const { email, name, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  const accessToken = await issueSession(res, user);
  res.status(201).json({ accessToken, user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isDisabled) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const accessToken = await issueSession(res, user);
  res.json({ accessToken, user: publicUser(user) });
}

export async function refresh(req, res) {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!raw) {
    return res.status(401).json({ error: 'Missing refresh token' });
  }

  const record = await findValidRefreshToken(raw);
  if (!record) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  if (record.revokedAt || record.expiresAt < new Date()) {
    if (record.revokedAt) {
      await revokeAllRefreshTokensForUser(record.userId);
    }
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Refresh token expired or revoked' });
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || user.isDisabled) {
    clearAuthCookies(res);
    return res.status(401).json({ error: 'Account unavailable' });
  }

  await revokeRefreshToken(record.id);
  const { raw: newRaw, record: newRecord } = await issueRefreshToken(user.id, record.id);
  setAuthCookies(res, newRaw, newRecord.expiresAt);

  const accessToken = signAccessToken(user);
  res.json({ accessToken, user: publicUser(user) });
}

export async function logout(req, res) {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME];
  if (raw) {
    const record = await findValidRefreshToken(raw);
    if (record && !record.revokedAt) {
      await revokeRefreshToken(record.id);
    }
  }
  clearAuthCookies(res);
  res.status(204).send();
}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && !user.isDisabled) {
    const raw = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + env.RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { tokenHash: hashToken(raw), userId: user.id, expiresAt },
    });

    const resetUrl = `${env.FRONTEND_ORIGIN}/reset-password?token=${raw}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await revokeAllRefreshTokensForUser(record.userId);

  res.json({ message: 'Password has been reset successfully. Please log in again.' });
}
