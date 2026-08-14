import fs from 'node:fs/promises';
import { app } from './app.js';
import { assertProductionConfig, config } from './config.js';
import { pool } from './db.js';

assertProductionConfig();
await fs.mkdir(config.uploadDir, { recursive: true });
await pool.query('SELECT 1');

app.listen(config.port, () => {
  console.log(`Document portal API listening on port ${config.port}`);
});
