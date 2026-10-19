import express from 'express';
import { query } from '../db.js';
import { requireAuth, publicUser } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateBody } from '../middleware/validate.js';
import { changePasswordSchema, profileSchema } from '../validation/schemas.js';
import { hashPassword, verifyPassword } from '../security/passwords.js';
import { clearSessionCookie, revokeUserSessions } from '../security/sessions.js';
import { asyncHandler } from '../utils/async-handler.js';

export const profileRouter = express.Router();

profileRouter.use(requireAuth);
profileRouter.use(requireCsrf);

profileRouter.patch('/', validateBody(profileSchema), asyncHandler(async (req, res) => {
  const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const emailChanging = req.body.email && req.body.email !== req.user.email;

  if (emailChanging) {
    if (!req.body.currentPassword) {
      return res.status(400).json({ error: 'Current password is required to change email' });
    }
    const passwordMatches = await verifyPassword(userResult.rows[0].password_hash, req.body.currentPassword);
    if (!passwordMatches) {
      return res.status(403).json({ error: 'Current password is incorrect' });
    }
  }

  const result = await query(
    `
      UPDATE users
      SET name = COALESCE($2, name),
          email = COALESCE($3, email)
      WHERE id = $1
      RETURNING id, email, name, role, status, created_at
    `,
    [req.user.id, req.body.name, req.body.email]
  );

  res.json({ user: publicUser(result.rows[0]) });
}));

profileRouter.post('/password', validateBody(changePasswordSchema), asyncHandler(async (req, res) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const passwordMatches = await verifyPassword(result.rows[0].password_hash, req.body.currentPassword);
  if (!passwordMatches) {
    return res.status(403).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await hashPassword(req.body.newPassword);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
  await revokeUserSessions(req.user.id);
  clearSessionCookie(res);
  res.json({ message: 'Password changed. Please sign in again.' });
}));
