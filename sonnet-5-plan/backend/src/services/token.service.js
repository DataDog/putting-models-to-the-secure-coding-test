import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, jti: crypto.randomUUID() },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function issueRefreshToken(userId, replacesId = null) {
  const raw = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const record = await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(raw),
      userId,
      expiresAt,
    },
  });

  if (replacesId) {
    await prisma.refreshToken.update({
      where: { id: replacesId },
      data: { replacedBy: record.id },
    });
  }

  return { raw, record };
}

export async function findValidRefreshToken(raw) {
  const tokenHash = sha256(raw);
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

export async function revokeRefreshToken(id) {
  await prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokensForUser(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function hashToken(raw) {
  return sha256(raw);
}
