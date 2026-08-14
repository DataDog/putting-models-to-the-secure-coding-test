import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwtSecret,
    { expiresIn: `${config.accessTokenTtlMinutes}m` },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

// Opaque refresh tokens are random bytes, never JWTs — the DB row is the
// source of truth for validity/revocation. Only the sha256 hash is stored;
// the raw token exists only in the cookie the browser holds.
export function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
