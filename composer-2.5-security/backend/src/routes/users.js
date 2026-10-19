import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, role, bio, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, name } = req.body;

    if (role && !['admin', 'user', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await query(
      `UPDATE users SET
         role = COALESCE($1, role),
         name = COALESCE($2, name),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, name, role, bio, created_at`,
      [role || null, name?.trim() || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.patch('/profile/me', authenticate, async (req, res) => {
  try {
    const { name, bio, currentPassword, newPassword } = req.body;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }

      const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
    }

    const result = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         bio = COALESCE($2, bio),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, name, role, bio, created_at`,
      [name?.trim() || null, bio ?? null, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
