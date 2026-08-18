// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

export const usersRouter = Router();

// Every route below is admin-only: user management is not exposed to
// regular users beyond their own profile (see profile.routes.js).
usersRouter.use(requireAuth, requireRole('admin'));

const listQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

function escapeLikePattern(input) {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

usersRouter.get('/', validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const { q, page, pageSize } = req.query;
    const offset = (page - 1) * pageSize;
    const likePattern = `%${escapeLikePattern(q)}%`;

    const result = await query(
      `SELECT id, email, name, role, is_active, created_at
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [likePattern, pageSize, offset],
    );

    return res.json({ users: result.rows, pagination: { page, pageSize } });
  } catch (err) {
    return next(err);
  }
});

const idSchema = z.string().uuid();

const updateUserSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

usersRouter.patch('/:id', validateBody(updateUserSchema), async (req, res, next) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid user id' });

    if (parsed.data === req.user.id && (req.body.role === 'user' || req.body.isActive === false)) {
      return res.status(400).json({ error: 'Admins cannot demote or deactivate their own account' });
    }

    const { role, isActive } = req.body;
    const result = await query(
      `UPDATE users SET
         role = COALESCE($1, role),
         is_active = COALESCE($2, is_active),
         updated_at = now()
       WHERE id = $3
       RETURNING id, email, name, role, is_active`,
      [role ?? null, isActive ?? null, parsed.data],
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    if (isActive === false) {
      // Deactivating a user should kick them out immediately, not just
      // block future logins.
      await query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [
        parsed.data,
      ]);
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

usersRouter.delete('/:id', async (req, res, next) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid user id' });

    if (parsed.data === req.user.id) {
      return res.status(400).json({ error: 'Admins cannot delete their own account' });
    }

    const result = await query('DELETE FROM users WHERE id = $1', [parsed.data]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});
