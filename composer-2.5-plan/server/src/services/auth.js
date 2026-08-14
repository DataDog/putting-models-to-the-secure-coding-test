import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { generateToken, hashToken } from '../utils/tokens.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax',
  path: '/',
};

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.accessTokenTtl }
  );
}

export function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('access_token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: config.refreshTokenTtlMs,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', COOKIE_OPTIONS);
}

export async function authenticateUser(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return user;
}

export async function createSession(user) {
  const refreshToken = generateToken();
  const refreshExpires = new Date(Date.now() + config.refreshTokenTtlMs);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken: hashToken(refreshToken),
      refreshExpires,
    },
  });

  const accessToken = signAccessToken(user);
  return { accessToken, refreshToken };
}

export async function refreshSession(refreshToken) {
  const hashed = hashToken(refreshToken);
  const user = await prisma.user.findFirst({
    where: {
      refreshToken: hashed,
      refreshExpires: { gt: new Date() },
      active: true,
    },
  });

  if (!user) return null;

  return createSession(user);
}

export async function invalidateSession(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null, refreshExpires: null },
  });
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export { COOKIE_OPTIONS };
