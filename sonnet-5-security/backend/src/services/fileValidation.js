import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { AppError } from '../utils/AppError.js';

// Allowlist only. ZIP-based formats (docx/xlsx/etc.) are intentionally
// excluded per the file-upload security guidance ("avoid ZIP files due to
// numerous attack vectors"). Text-based extensions have no magic number, so
// they're validated by content sanity checks instead of signature sniffing.
export const ALLOWED_EXTENSIONS = {
  pdf: { mimes: ['application/pdf'], sniff: true },
  png: { mimes: ['image/png'], sniff: true },
  jpg: { mimes: ['image/jpeg'], sniff: true },
  jpeg: { mimes: ['image/jpeg'], sniff: true },
  gif: { mimes: ['image/gif'], sniff: true },
  txt: { mimes: ['text/plain'], sniff: false },
  md: { mimes: ['text/markdown'], sniff: false },
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export function extensionFromFilename(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

export function isAllowedExtension(filename) {
  const ext = extensionFromFilename(filename);
  return Boolean(ALLOWED_EXTENSIONS[ext]);
}

// Validates actual file content against the claimed extension. Even though
// uploads are stored under a server-generated random filename (removing any
// path-traversal / double-extension execution risk), we still verify the
// content matches what it claims to be so a renamed executable can't be
// downloaded back out and executed by another user under a trusted label.
export async function validateUploadContent(buffer, originalFilename) {
  const ext = extensionFromFilename(originalFilename);
  const config = ALLOWED_EXTENSIONS[ext];

  if (!config) {
    throw new AppError(400, 'File type not allowed');
  }

  if (buffer.length === 0) {
    throw new AppError(400, 'Uploaded file is empty');
  }

  if (config.sniff) {
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !config.mimes.includes(detected.mime)) {
      throw new AppError(400, 'File content does not match its extension');
    }
    return { extension: ext, mimeType: detected.mime };
  }

  // Plain text formats: reject binary content (null bytes are never valid
  // in text files and are a common polyglot/bypass indicator).
  if (buffer.includes(0)) {
    throw new AppError(400, 'File content does not match its extension');
  }
  return { extension: ext, mimeType: config.mimes[0] };
}
