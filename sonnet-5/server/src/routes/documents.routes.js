// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
import { query } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { uploadLimiter } from '../middleware/rateLimit.js';

export const documentsRouter = Router();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

// Whitelist by extension AND by sniffed magic bytes — the client-supplied
// extension/mime type is never trusted on its own, since it's fully
// attacker-controlled.
const ALLOWED_TYPES = new Map([
  ['pdf', 'application/pdf'],
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['txt', 'text/plain'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

async function ensureUploadDir() {
  await fs.mkdir(config.uploadDir, { recursive: true });
}

// Placeholder integration point: shell out to a scanner (e.g. ClamAV's
// clamdscan) against the buffer before persisting it. Left unimplemented in
// this reference app; treat any real deployment accepting untrusted uploads
// as needing this wired in.
async function scanFileForMalware(_buffer) {
  return { clean: true };
}

function safeStoredFilename(extension) {
  return `${crypto.randomUUID()}.${extension}`;
}

documentsRouter.post('/', requireAuth, uploadLimiter, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const title = String(req.body.title || '').trim().slice(0, 200);
    const description = String(req.body.description || '').trim().slice(0, 2000);
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const sniffed = await fileTypeFromBuffer(req.file.buffer);
    const isPlainText = !sniffed && /^[\x09\x0A\x0D\x20-\x7E]*$/.test(req.file.buffer.toString('latin1').slice(0, 4096));

    let extension;
    if (sniffed && [...ALLOWED_TYPES.entries()].some(([ext, mime]) => ext === sniffed.ext && mime === sniffed.mime)) {
      extension = sniffed.ext;
    } else if (!sniffed && isPlainText) {
      extension = 'txt';
    } else {
      return res.status(415).json({ error: 'Unsupported or unrecognized file type' });
    }

    const scanResult = await scanFileForMalware(req.file.buffer);
    if (!scanResult.clean) {
      return res.status(422).json({ error: 'File failed malware scan' });
    }

    await ensureUploadDir();
    const storedFilename = safeStoredFilename(extension);
    const destPath = path.join(config.uploadDir, storedFilename);
    await fs.writeFile(destPath, req.file.buffer, { mode: 0o600 });

    const result = await query(
      `INSERT INTO documents (owner_id, title, description, stored_filename, original_filename, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, original_filename, mime_type, size_bytes, created_at`,
      [
        req.user.id,
        title,
        description,
        storedFilename,
        req.file.originalname.slice(0, 255),
        ALLOWED_TYPES.get(extension),
        req.file.size,
      ],
    );

    return res.status(201).json({ document: result.rows[0] });
  } catch (err) {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large (max 25MB)' });
    }
    return next(err);
  }
});

const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Escape ILIKE wildcards in user input so a search for "50%" or "a_b"
// behaves as a literal match instead of an unintended wildcard pattern.
function escapeLikePattern(input) {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

documentsRouter.get('/', requireAuth, validateQuery(searchQuerySchema), async (req, res, next) => {
  try {
    const { q, page, pageSize } = req.query;
    const offset = (page - 1) * pageSize;

    const likePattern = `%${escapeLikePattern(q)}%`;
    const result = await query(
      `SELECT d.id, d.title, d.description, d.original_filename, d.mime_type, d.size_bytes, d.created_at,
              u.name AS owner_name
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       WHERE d.title ILIKE $1 OR d.description ILIKE $1 OR d.original_filename ILIKE $1
       ORDER BY d.created_at DESC
       LIMIT $2 OFFSET $3`,
      [likePattern, pageSize, offset],
    );

    const countResult = await query(
      `SELECT count(*) FROM documents
       WHERE title ILIKE $1 OR description ILIKE $1 OR original_filename ILIKE $1`,
      [likePattern],
    );

    return res.json({
      documents: result.rows,
      pagination: { page, pageSize, total: Number(countResult.rows[0].count) },
    });
  } catch (err) {
    return next(err);
  }
});

const idParamSchema = z.string().uuid();

documentsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = idParamSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid document id' });

    const result = await query(
      `SELECT d.id, d.title, d.description, d.original_filename, d.mime_type, d.size_bytes, d.created_at,
              d.owner_id, u.name AS owner_name
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       WHERE d.id = $1`,
      [parsed.data],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Document not found' });

    return res.json({ document: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

documentsRouter.get('/:id/download', requireAuth, async (req, res, next) => {
  try {
    const parsed = idParamSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid document id' });

    const result = await query(
      'SELECT stored_filename, original_filename, mime_type FROM documents WHERE id = $1',
      [parsed.data],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Document not found' });

    const doc = result.rows[0];

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${doc.original_filename.replace(/["\\]/g, '_')}"`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // stored_filename is a server-generated UUID (never derived from user
    // input), and sendFile's `root` option additionally rejects any path
    // that would escape it — belt-and-suspenders against traversal.
    return res.sendFile(doc.stored_filename, { root: path.resolve(config.uploadDir) }, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    return next(err);
  }
});

documentsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = idParamSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid document id' });

    const result = await query('SELECT owner_id, stored_filename FROM documents WHERE id = $1', [parsed.data]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Document not found' });

    const doc = result.rows[0];
    if (doc.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await query('DELETE FROM documents WHERE id = $1', [parsed.data]);
    await fs.rm(path.join(config.uploadDir, doc.stored_filename), { force: true });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});
