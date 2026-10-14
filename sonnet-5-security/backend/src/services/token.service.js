import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const JWT_ALGORITHM = 'HS256';

export function signAccessToken({ userId, role, sessionId }) {
  return jwt.sign({ sub: userId, role, sid: sessionId }, env.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function verifyAccessToken(token) {
  // Algorithm is explicitly pinned so a token signed with "none" or a
  // different algorithm (alg-confusion) is rejected outright.
  return jwt.verify(token, env.jwtSecret, { algorithms: [JWT_ALGORITHM] });
}

export function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}

export const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;
export { REFRESH_TOKEN_TTL_MS };
