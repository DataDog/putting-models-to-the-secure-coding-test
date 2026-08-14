import { initDatabase, pool } from "./db.js";

try {
  await initDatabase();
  console.log("Database initialized.");
} finally {
  await pool.end();
}
