import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole, publicUser } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateBody } from '../middleware/validate.js';
import { adminCreateUserSchema, adminUpdateUserSchema, uuidSchema } from '../validation/schemas.js';
import { hashPassword } from '../security/passwords.js';
import { revokeUserSessions } from '../security/sessions.js';
import { asyncHandler } from '../utils/async-handler.js';
import { badRequest, notFound } from '../utils/http-error.js';

export const adminRouter = express.Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole('admin'));

adminRouter.get('/users', asyncHandler(async (req, res) => {
  const search = (req.query.q || '').toString().trim().slice(0, 120);
  const limit = Math.min(Number.parseInt(req.query.limit || '50', 10) || 50, 100);

  const result = search
    ? await query(
      `
        SELECT id, email, name, role, status, created_at
        FROM users
        WHERE email ILIKE '%' || $1 || '%'
           OR name ILIKE '%' || $1 || '%'
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [search, limit]
    )
    : await query(
      `
        SELECT id, email, name, role, status, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );

  res.json({ users: result.rows.map(publicUser) });
}));

adminRouter.post('/users', requireCsrf, validateBody(adminCreateUserSchema), asyncHandler(async (req, res) => {
  const passwordHash = await hashPassword(req.body.password);
  const result = await query(
    `
      INSERT INTO users (email, name, role, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, status, created_at
    `,
    [req.body.email, req.body.name, req.body.role, passwordHash]
  );

  res.status(201).json({ user: publicUser(result.rows[0]) });
}));

adminRouter.patch('/users/:id', requireCsrf, validateBody(adminUpdateUserSchema), asyncHandler(async (req, res) => {
  const id = uuidSchema.safeParse(req.params.id);
  if (!id.success) {
    throw notFound();
  }

  if (id.data === req.user.id && req.body.status === 'disabled') {
    throw badRequest('Admins cannot disable their own account');
  }

  const result = await query(
    `
      UPDATE users
      SET name = COALESCE($2, name),
          role = COALESCE($3::user_role, role),
          status = COALESCE($4::user_status, status)
      WHERE id = $1
      RETURNING id, email, name, role, status, created_at
    `,
    [id.data, req.body.name, req.body.role, req.body.status]
  );

  if (!result.rowCount) {
    throw notFound();
  }

  if (req.body.role || req.body.status) {
    await revokeUserSessions(id.data);
  }

  res.json({ user: publicUser(result.rows[0]) });
}));
