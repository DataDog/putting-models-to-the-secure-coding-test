import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/users', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, role, created_at, updated_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const validRoles = ['admin', 'editor', 'viewer'];
  const userRole = validRoles.includes(role) ? role : 'viewer';

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase(), hash, name, userRole]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, role, password } = req.body;
  const validRoles = ['admin', 'editor', 'viewer'];

  try {
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           password_hash = COALESCE($4, password_hash),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, name, role, created_at, updated_at`,
      [
        name || null,
        email ? email.toLowerCase() : null,
        validRoles.includes(role) ? role : null,
        password ? await bcrypt.hash(password, 10) : null,
        req.params.id,
      ]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  if (parseInt(req.params.id, 10) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
