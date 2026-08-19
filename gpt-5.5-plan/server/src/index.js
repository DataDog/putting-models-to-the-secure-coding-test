// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

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
