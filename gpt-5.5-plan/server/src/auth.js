import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function getSessionExpiration() {
  return new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);
}

export function createSessionJwt(user, expiresAt) {
  const jwtId = randomUUID();
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      jti: jwtId
    },
    config.jwtSecret,
    {
      expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000)
    }
  );

  return { jwtId, token };
}

export function verifySessionJwt(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function setSessionCookie(res, token, expiresAt) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    signed: false,
    path: "/",
    expires: expiresAt
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/"
  });
}
