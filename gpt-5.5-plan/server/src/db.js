import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl
});

export function query(text, params = []) {
  return pool.query(text, params);
}

export async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function initDatabase() {
  const migrationPath = path.join(config.serverRoot, "migrations", "001_init.sql");
  const sql = await fs.readFile(migrationPath, "utf8");
  await pool.query(sql);
}
