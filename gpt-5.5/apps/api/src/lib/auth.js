import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const saltRounds = 12;

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function hashPassword(password) {
  return bcrypt.hash(password, saltRounds);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signSession(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: 'document-portal'
    }
  );
}

export function verifySession(token) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: 'document-portal'
  });
}

export function createResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
