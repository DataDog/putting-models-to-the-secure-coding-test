// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

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
