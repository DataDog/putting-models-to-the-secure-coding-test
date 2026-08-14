import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle Postgres client', err);
});

// Always parameterize: query(text, params). Never build `text` from
// untrusted input.
export function query(text, params) {
  return pool.query(text, params);
}
