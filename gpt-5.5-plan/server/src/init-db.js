// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { initDatabase, pool } from "./db.js";

try {
  await initDatabase();
  console.log("Database initialized.");
} finally {
  await pool.end();
}
