// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { hashPassword, verifyPassword, isPasswordStrongEnough } from '../utils/password.js';

export const profileRouter = Router();

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(255).optional(),
  currentPassword: z.string().min(1).max(256).optional(),
  newPassword: z.string().min(12).max(256).optional(),
});

profileRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

profileRouter.patch('/', requireAuth, validateBody(updateProfileSchema), async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const wantsSensitiveChange = email !== undefined || newPassword !== undefined;

    if (wantsSensitiveChange) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change email or password' });
      }
      const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const ok = await verifyPassword(currentPassword, result.rows[0].password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    if (newPassword && !isPasswordStrongEnough(newPassword)) {
      return res.status(400).json({ error: 'New password must be between 12 and 256 characters' });
    }

    if (email !== undefined) {
      const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'That email is already in use' });
      }
    }

    const newPasswordHash = newPassword ? await hashPassword(newPassword) : null;

    const result = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         password_hash = COALESCE($3, password_hash),
         updated_at = now()
       WHERE id = $4
       RETURNING id, email, name, role`,
      [name ?? null, email ?? null, newPasswordHash, req.user.id],
    );

    if (newPassword) {
      // Changing the password should not silently leave other devices'
      // sessions valid.
      await query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [
        req.user.id,
      ]);
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});
