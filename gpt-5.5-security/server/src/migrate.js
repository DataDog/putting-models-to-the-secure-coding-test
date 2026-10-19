import fs from 'node:fs/promises';
import path from 'node:path';
import { closePool, pool, withTransaction } from './db.js';
import { logger } from './utils/logger.js';

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function run() {
  await ensureMigrationTable();
  const migrationDir = path.join(process.cwd(), 'server/migrations');
  const files = (await fs.readdir(migrationDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
    if (applied.rowCount) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    });
    logger.info({ migration: file }, 'migration applied');
  }
}

run()
  .catch((error) => {
    logger.error({ err: error }, 'migration failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });

