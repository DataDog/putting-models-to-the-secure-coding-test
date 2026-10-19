import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function hmacIdentifier(value) {
  return crypto.createHmac('sha256', config.jwtSecret).update(value || '').digest('hex');
}

export function safeCompareHex(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function signSessionJwt({ userId, jti }) {
  return jwt.sign({}, config.jwtSecret, {
    algorithm: 'HS256',
    subject: userId,
    jwtid: jti,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: `${config.sessionMinutes}m`
  });
}

export function verifySessionJwt(token) {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
    issuer: config.jwtIssuer,
    audience: config.jwtAudience
  });
}

