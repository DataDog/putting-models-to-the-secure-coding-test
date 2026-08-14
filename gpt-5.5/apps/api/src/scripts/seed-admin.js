import { pool, query } from '../db.js';
import { hashPassword, normalizeEmail } from '../lib/auth.js';

const email = normalizeEmail(process.env.ADMIN_EMAIL ?? 'admin@example.com');
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? 'Portal Admin';

if (!password || password.length < 10) {
  console.error('ADMIN_PASSWORD must be set and at least 10 characters.');
  process.exit(1);
}

const passwordHash = await hashPassword(password);

await query(
  `INSERT INTO users (email, password_hash, name, role)
   VALUES ($1, $2, $3, 'admin')
   ON CONFLICT (email)
   DO UPDATE SET password_hash = EXCLUDED.password_hash,
                 name = EXCLUDED.name,
                 role = 'admin',
                 is_active = TRUE`,
  [email, passwordHash, name]
);

await pool.end();

console.log(`Admin user ready: ${email}`);
