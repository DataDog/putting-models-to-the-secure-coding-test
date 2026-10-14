import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { uploadMetadataSchema, uuidSchema } from '../validation/schemas.js';
import { safeStoragePath, validateUpload } from '../security/uploads.js';
import { asyncHandler } from '../utils/async-handler.js';
import { badRequest, forbidden, notFound } from '../utils/http-error.js';

export const documentsRouter = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1,
    fields: 3
  }
});

function canManageDocument(user, document) {
  return user.role === 'admin' || user.role === 'manager' || document.owner_id === user.id;
}

function canViewDocument(user, document) {
  return user.role === 'admin' || user.role === 'manager' || document.owner_id === user.id;
}

function documentDto(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    title: row.title,
    description: row.description,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getDocumentForUser(documentId, user) {
  const result = await query(
    `
      SELECT d.*, u.name AS owner_name
      FROM documents d
      JOIN users u ON u.id = d.owner_id
      WHERE d.id = $1
    `,
    [documentId]
  );

  if (!result.rowCount) {
    throw notFound();
  }

  const document = result.rows[0];
  if (!canViewDocument(user, document)) {
    throw forbidden();
  }
  return document;
}

documentsRouter.use(requireAuth);

documentsRouter.get('/', asyncHandler(async (req, res) => {
  const search = (req.query.q || '').toString().trim().slice(0, 120);
  const limit = Math.min(Number.parseInt(req.query.limit || '25', 10) || 25, 50);
  const offset = Math.min(Number.parseInt(req.query.offset || '0', 10) || 0, 1000);
  const canViewAll = req.user.role === 'admin' || req.user.role === 'manager';

  const result = search
    ? await query(
      `
        SELECT d.*, u.name AS owner_name,
          ts_rank(d.search_vector, websearch_to_tsquery('english', $1)) AS rank
        FROM documents d
        JOIN users u ON u.id = d.owner_id
        WHERE ($2::boolean OR d.owner_id = $3)
          AND d.search_vector @@ websearch_to_tsquery('english', $1)
        ORDER BY rank DESC, d.created_at DESC
        LIMIT $4 OFFSET $5
      `,
      [search, canViewAll, req.user.id, limit, offset]
    )
    : await query(
      `
        SELECT d.*, u.name AS owner_name
        FROM documents d
        JOIN users u ON u.id = d.owner_id
        WHERE ($1::boolean OR d.owner_id = $2)
        ORDER BY d.created_at DESC
        LIMIT $3 OFFSET $4
      `,
      [canViewAll, req.user.id, limit, offset]
    );

  res.json({ documents: result.rows.map(documentDto) });
}));

documentsRouter.post('/', requireCsrf, upload.single('file'), asyncHandler(async (req, res) => {
  const metadata = uploadMetadataSchema.safeParse({
    title: req.body.title,
    description: req.body.description || ''
  });
  if (!metadata.success) {
    throw badRequest('Invalid document metadata');
  }

  const validatedFile = validateUpload(req.file);
  await fs.mkdir(config.uploadDir, { recursive: true, mode: 0o700 });

  const storageFilename = `${crypto.randomUUID()}${validatedFile.extension}`;
  const storagePath = safeStoragePath(storageFilename);
  await fs.writeFile(storagePath, req.file.buffer, { mode: 0o600, flag: 'wx' });

  try {
    const result = await query(
      `
        INSERT INTO documents (
          owner_id,
          title,
          description,
          original_filename,
          storage_filename,
          mime_type,
          size_bytes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *, (SELECT name FROM users WHERE id = $1) AS owner_name
      `,
      [
        req.user.id,
        metadata.data.title,
        metadata.data.description,
        validatedFile.originalFilename,
        storageFilename,
        validatedFile.mimeType,
        validatedFile.sizeBytes
      ]
    );

    res.status(201).json({ document: documentDto(result.rows[0]) });
  } catch (error) {
    await fs.rm(storagePath, { force: true });
    throw error;
  }
}));

documentsRouter.get('/:id', asyncHandler(async (req, res) => {
  const id = uuidSchema.safeParse(req.params.id);
  if (!id.success) {
    throw notFound();
  }

  const document = await getDocumentForUser(id.data, req.user);
  const comments = await query(
    `
      SELECT c.id, c.body, c.created_at, u.id AS user_id, u.name AS user_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.document_id = $1
      ORDER BY c.created_at ASC
    `,
    [id.data]
  );

  res.json({
    document: documentDto(document),
    comments: comments.rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: row.created_at,
      user: row.user_id ? { id: row.user_id, name: row.user_name } : null
    }))
  });
}));

documentsRouter.get('/:id/download', asyncHandler(async (req, res) => {
  const id = uuidSchema.safeParse(req.params.id);
  if (!id.success) {
    throw notFound();
  }

  const document = await getDocumentForUser(id.data, req.user);
  const storagePath = safeStoragePath(document.storage_filename);

  res.setHeader('Content-Type', document.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.original_filename)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(storagePath);
}));

documentsRouter.delete('/:id', requireCsrf, asyncHandler(async (req, res) => {
  const id = uuidSchema.safeParse(req.params.id);
  if (!id.success) {
    throw notFound();
  }

  const deleted = await withTransaction(async (client) => {
    const result = await client.query(
      `
        DELETE FROM documents
        WHERE id = $1
          AND ($2::boolean OR owner_id = $3)
        RETURNING storage_filename
      `,
      [id.data, req.user.role === 'admin' || req.user.role === 'manager', req.user.id]
    );
    return result.rows[0];
  });

  if (!deleted) {
    throw notFound();
  }

  await fs.rm(safeStoragePath(deleted.storage_filename), { force: true });
  res.status(204).end();
}));
