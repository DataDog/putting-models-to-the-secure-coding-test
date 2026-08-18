// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { query } from '../db.js';
import { verifySession } from '../lib/auth.js';
import { forbidden, unauthorized } from '../lib/http.js';
import { config } from '../config.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[config.cookieName];

    if (!token) {
      throw unauthorized();
    }

    const payload = verifySession(token);
    const result = await query(
      `SELECT id, email, name, bio, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [payload.sub]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      throw unauthorized('Session is no longer valid.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.status ? error : unauthorized('Session is invalid or expired.'));
  }
}

export function requireRole(role) {
  return function roleMiddleware(req, _res, next) {
    if (req.user?.role !== role) {
      next(forbidden());
      return;
    }

    next();
  };
}
