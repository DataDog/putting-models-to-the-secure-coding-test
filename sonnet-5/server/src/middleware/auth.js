// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { verifyAccessToken } from '../utils/tokens.js';

// Verifies the JWT access token cookie. Does NOT touch the DB — that's the
// point of using a JWT for this hot path. If the token is missing/expired,
// callers should hit /api/auth/refresh (which does check the DB-backed
// refresh token) and retry.
export function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }
}

// Best-effort auth: populates req.user if a valid token is present, but
// never rejects the request. Useful for endpoints whose behavior varies for
// logged-in users without requiring login.
export function optionalAuth(req, _res, next) {
  const token = req.cookies?.access_token;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    // ignore invalid/expired token for optional auth
  }
  return next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}
