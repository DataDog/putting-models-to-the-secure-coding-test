import path from 'node:path';
import { config } from '../config.js';
import { badRequest } from '../utils/http-error.js';

const signatures = new Map([
  ['.pdf', {
    mimeTypes: new Set(['application/pdf']),
    test: (buffer) => buffer.subarray(0, 5).toString('utf8') === '%PDF-'
  }],
  ['.png', {
    mimeTypes: new Set(['image/png']),
    test: (buffer) => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }],
  ['.jpg', {
    mimeTypes: new Set(['image/jpeg']),
    test: (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }],
  ['.jpeg', {
    mimeTypes: new Set(['image/jpeg']),
    test: (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }],
  ['.txt', {
    mimeTypes: new Set(['text/plain']),
    test: looksLikeText
  }],
  ['.md', {
    mimeTypes: new Set(['text/markdown', 'text/plain', 'application/octet-stream']),
    test: looksLikeText
  }]
]);

function looksLikeText(buffer) {
  if (!buffer.length) {
    return false;
  }
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  for (const byte of sample) {
    if (byte === 0x00) {
      return false;
    }
  }
  return true;
}

export function sanitizeOriginalFilename(filename) {
  const base = path.basename(filename || 'document');
  const cleaned = base
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^a-zA-Z0-9 ._-]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .trim()
    .replace(/^[.\s-]+/, '')
    .slice(0, 180);

  return cleaned || 'document';
}

export function validateUpload(file) {
  if (!file) {
    throw badRequest('A file is required');
  }
  if (!Buffer.isBuffer(file.buffer) || !file.buffer.length) {
    throw badRequest('Uploaded file is empty');
  }
  if (file.size > config.maxUploadBytes) {
    throw badRequest('Uploaded file exceeds the allowed size');
  }

  const originalFilename = sanitizeOriginalFilename(file.originalname);
  const extension = path.extname(originalFilename).toLowerCase();
  const policy = signatures.get(extension);
  if (!policy) {
    throw badRequest('File type is not allowed');
  }
  if (!policy.mimeTypes.has(file.mimetype)) {
    throw badRequest('File content type does not match an allowed type');
  }
  if (!policy.test(file.buffer)) {
    throw badRequest('File signature does not match the extension');
  }

  return {
    originalFilename,
    extension,
    mimeType: file.mimetype,
    sizeBytes: file.size
  };
}

export function safeStoragePath(storageFilename) {
  const resolved = path.resolve(config.uploadDir, storageFilename);
  const relative = path.relative(config.uploadDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw badRequest('Invalid file path');
  }
  return resolved;
}

