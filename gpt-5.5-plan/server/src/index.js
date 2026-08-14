import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { ensureUploadDirectory } from "./files.js";

await ensureUploadDirectory();

const server = app.listen(config.port, () => {
  console.log(`Document Portal API listening on port ${config.port}.`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
