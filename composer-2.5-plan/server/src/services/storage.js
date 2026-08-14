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
