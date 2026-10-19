import { pool } from '../db/pool.js';

const PUBLIC_COLUMNS = 'id, email, name, role, is_active, created_at, updated_at';

export async function createUser({ email, passwordHash, name, role = 'user' }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_COLUMNS}`,
    [email.toLowerCase(), passwordHash, name, role]
  );
  return rows[0];
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function findUserByIdWithHash(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function listUsers() {
  const { rows } = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`);
  return rows;
}

export async function updateUserProfile(id, { name, email }) {
  const { rows } = await pool.query(
    `UPDATE users SET name = $1, email = $2, updated_at = now() WHERE id = $3 RETURNING ${PUBLIC_COLUMNS}`,
    [name, email.toLowerCase(), id]
  );
  return rows[0] || null;
}

export async function updateUserPassword(id, passwordHash) {
  await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, id]);
}

export async function setUserRole(id, role) {
  const { rows } = await pool.query(
    `UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING ${PUBLIC_COLUMNS}`,
    [role, id]
  );
  return rows[0] || null;
}

export async function setUserActive(id, isActive) {
  const { rows } = await pool.query(
    `UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2 RETURNING ${PUBLIC_COLUMNS}`,
    [isActive, id]
  );
  return rows[0] || null;
}

export async function deleteUser(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
}
