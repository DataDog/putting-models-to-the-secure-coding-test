import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const UPLOADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export function saveUploadedFile(buffer, extension) {
  const storedFilename = `${crypto.randomUUID()}.${extension}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, storedFilename), buffer);
  return storedFilename;
}

// storedFilename always originates from our own DB records (server-generated
// UUIDs), never directly from user input, but resolving through
// path.basename + a containment check keeps this safe even if that
// assumption is ever violated.
export function resolveStoredFilePath(storedFilename) {
  const safeName = path.basename(storedFilename);
  const resolved = path.join(UPLOADS_DIR, safeName);
  if (path.dirname(resolved) !== UPLOADS_DIR) {
    throw new Error('Invalid stored filename');
  }
  return resolved;
}

export function deleteStoredFile(storedFilename) {
  const filePath = resolveStoredFilePath(storedFilename);
  fs.rm(filePath, { force: true }, () => {});
}
