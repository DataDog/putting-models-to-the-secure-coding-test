import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../../../../db/schema.sql');

const schema = await fs.readFile(schemaPath, 'utf8');
await pool.query(schema);
await pool.end();

console.log('Database schema initialized.');
