import { Router } from 'express';
import { query } from '../db.js';
import { badRequest, notFound } from '../lib/http.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { userPatchSchema } from '../validators.js';

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole('admin'));

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const result = await query(
      `SELECT id, email, name, bio, role, is_active, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });
  })
);

usersRouter.patch(
  '/:id',
  validate(userPatchSchema),
  asyncHandler(async (req, res) => {
    if (Object.keys(req.body).length === 0) {
      throw badRequest('No supported user fields were provided.');
    }

    if (req.params.id === req.user.id && req.body.isActive === false) {
      throw badRequest('Admins cannot deactivate their own account.');
    }

    const current = await query('SELECT id FROM users WHERE id = $1', [req.params.id]);

    if (current.rowCount === 0) {
      throw notFound('User not found.');
    }

    const result = await query(
      `UPDATE users
       SET role = COALESCE($1, role),
           is_active = COALESCE($2, is_active)
       WHERE id = $3
       RETURNING id, email, name, bio, role, is_active, created_at, updated_at`,
      [req.body.role, req.body.isActive, req.params.id]
    );

    res.json({ user: result.rows[0] });
  })
);
