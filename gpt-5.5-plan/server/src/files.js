import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

export function buildStoredFilename(originalName) {
  const extension = path
    .extname(originalName || "")
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, "");

  return `${randomUUID()}${extension.slice(0, 16)}`;
}

export function resolveUploadPath(storedName) {
  const resolved = path.resolve(config.uploadDir, storedName);
  const insideUploads =
    resolved === config.uploadDir || resolved.startsWith(`${config.uploadDir}${path.sep}`);

  if (!insideUploads) {
    throw new Error("Resolved upload path escaped the upload directory.");
  }

  return resolved;
}

export async function ensureUploadDirectory() {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

export async function removeUploadedFile(storedName) {
  if (!storedName) return;

  try {
    await fs.unlink(resolveUploadPath(storedName));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
