// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

export async function ensureUploadDir() {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

export function getStoragePath(filename) {
  return path.join(config.uploadDir, filename);
}

export async function deleteFile(storagePath) {
  try {
    await fs.unlink(storagePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}
