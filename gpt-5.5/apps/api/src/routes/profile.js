// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import { query } from '../db.js';
import { hashPassword, verifyPassword } from '../lib/auth.js';
import { badRequest } from '../lib/http.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileSchema } from '../validators.js';

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

profileRouter.put(
  '/',
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const { name, bio, currentPassword, newPassword } = req.body;

    if (newPassword) {
      const result = await query('SELECT password_hash FROM users WHERE id = $1', [
        req.user.id
      ]);
      const passwordMatches = await verifyPassword(
        currentPassword ?? '',
        result.rows[0].password_hash
      );

      if (!passwordMatches) {
        throw badRequest('Current password is required to set a new password.');
      }

      const passwordHash = await hashPassword(newPassword);

      await query(
        `UPDATE users
         SET name = $1, bio = $2, password_hash = $3
         WHERE id = $4`,
        [name, bio, passwordHash, req.user.id]
      );
    } else {
      await query(
        `UPDATE users
         SET name = $1, bio = $2
         WHERE id = $3`,
        [name, bio, req.user.id]
      );
    }

    const updated = await query(
      `SELECT id, email, name, bio, role, is_active, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    res.json({ user: updated.rows[0] });
  })
);
