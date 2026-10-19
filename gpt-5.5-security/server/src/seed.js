import { closePool, query } from './db.js';
import { hashPassword } from './security/passwords.js';
import { logger } from './utils/logger.js';

async function run() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Portal Admin';

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    `
      INSERT INTO users (email, name, role, password_hash)
      VALUES ($1, $2, 'admin', $3)
      ON CONFLICT ((lower(email))) DO UPDATE
      SET name = EXCLUDED.name,
          role = 'admin',
          password_hash = EXCLUDED.password_hash,
          status = 'active',
          updated_at = now()
      RETURNING id, email
    `,
    [email, name, passwordHash]
  );

  logger.info({ userId: result.rows[0].id, email: result.rows[0].email }, 'admin user seeded');
}

run()
  .catch((error) => {
    logger.error({ err: error }, 'seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
