import bcrypt from 'bcrypt';
import { pool } from './pool.js';

const DEFAULT_USERS = [
  { email: 'admin@portal.local', password: 'Admin123!@#', name: 'Portal Admin', role: 'admin' },
  { email: 'user@portal.local', password: 'User123!@#', name: 'Demo User', role: 'user' },
  { email: 'viewer@portal.local', password: 'Viewer123!@#', name: 'Demo Viewer', role: 'viewer' },
];

async function seed() {
  const client = await pool.connect();
  try {
    for (const user of DEFAULT_USERS) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (existing.rows.length > 0) {
        console.log(`User ${user.email} already exists, skipping.`);
        continue;
      }
      const hash = await bcrypt.hash(user.password, 12);
      await client.query(
        'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
        [user.email, hash, user.name, user.role]
      );
      console.log(`Created user: ${user.email} (${user.role})`);
    }
    console.log('Seed completed.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
