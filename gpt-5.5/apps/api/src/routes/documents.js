// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { query } from '../db.js';
import { badRequest, forbidden, notFound } from '../lib/http.js';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { commentSchema, documentBodySchema, searchSchema } from '../validators.js';

export const documentsRouter = Router();

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      await fs.mkdir(config.uploadDir, { recursive: true });
      callback(null, config.uploadDir);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).slice(0, 20);
    const storageKey = `${crypto.randomUUID()}${extension}`;
    callback(null, storageKey);
  }
});

const allowedMimeTypes = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif'
]);

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxUploadBytes,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(badRequest('Unsupported file type.'));
      return;
    }

    callback(null, true);
  }
});

function documentRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    owner: {
      id: row.owner_id,
      name: row.owner_name,
      email: row.owner_email
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getDocument(id) {
  const result = await query(
    `SELECT d.id,
            d.title,
            d.description,
            d.original_name,
            d.storage_key,
            d.mime_type,
            d.size_bytes,
            d.owner_id,
            d.created_at,
            d.updated_at,
            u.name AS owner_name,
            u.email AS owner_email
     FROM documents d
     JOIN users u ON u.id = d.owner_id
     WHERE d.id = $1`,
    [id]
  );

  return result.rows[0];
}

documentsRouter.use(requireAuth);

documentsRouter.get(
  '/',
  validate(searchSchema, 'query'),
  asyncHandler(async (req, res) => {
    const search = req.query.q;
    const params = [];
    let whereClause = '';

    if (search) {
      params.push(search);
      whereClause = `WHERE d.search_vector @@ plainto_tsquery('english', $1)
                     OR d.title ILIKE '%' || $1 || '%'
                     OR d.description ILIKE '%' || $1 || '%'
                     OR d.original_name ILIKE '%' || $1 || '%'`;
    }

    const result = await query(
      `SELECT d.id,
              d.title,
              d.description,
              d.original_name,
              d.mime_type,
              d.size_bytes,
              d.owner_id,
              d.created_at,
              d.updated_at,
              u.name AS owner_name,
              u.email AS owner_email
       FROM documents d
       JOIN users u ON u.id = d.owner_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT 100`,
      params
    );

    res.json({ documents: result.rows.map(documentRow) });
  })
);

documentsRouter.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const body = documentBodySchema.parse(req.body);

    if (!req.file) {
      throw badRequest('A file is required.');
    }

    const result = await query(
      `INSERT INTO documents (
         owner_id,
         title,
         description,
         original_name,
         storage_key,
         mime_type,
         size_bytes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        req.user.id,
        body.title,
        body.description,
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.size
      ]
    );

    const created = await getDocument(result.rows[0].id);
    res.status(201).json({ document: documentRow(created) });
  })
);

documentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const document = await getDocument(req.params.id);

    if (!document) {
      throw notFound('Document not found.');
    }

    const comments = await query(
      `SELECT c.id,
              c.body,
              c.created_at,
              u.id AS user_id,
              u.name AS user_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.document_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    res.json({
      document: documentRow(document),
      comments: comments.rows.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.created_at,
        user: {
          id: comment.user_id,
          name: comment.user_name
        }
      }))
    });
  })
);

documentsRouter.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const document = await getDocument(req.params.id);

    if (!document) {
      throw notFound('Document not found.');
    }

    const filePath = path.join(config.uploadDir, document.storage_key);
    const normalizedUploadDir = path.resolve(config.uploadDir);
    const normalizedFilePath = path.resolve(filePath);

    if (!normalizedFilePath.startsWith(`${normalizedUploadDir}${path.sep}`)) {
      throw forbidden('Invalid document storage path.');
    }

    res.download(normalizedFilePath, document.original_name);
  })
);

documentsRouter.post(
  '/:id/comments',
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    const document = await getDocument(req.params.id);

    if (!document) {
      throw notFound('Document not found.');
    }

    const result = await query(
      `INSERT INTO comments (document_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, body, created_at`,
      [req.params.id, req.user.id, req.body.body]
    );

    res.status(201).json({
      comment: {
        id: result.rows[0].id,
        body: result.rows[0].body,
        createdAt: result.rows[0].created_at,
        user: {
          id: req.user.id,
          name: req.user.name
        }
      }
    });
  })
);

documentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const document = await getDocument(req.params.id);

    if (!document) {
      throw notFound('Document not found.');
    }

    if (document.owner_id !== req.user.id && req.user.role !== 'admin') {
      throw forbidden('Only the owner or an admin can delete this document.');
    }

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);

    const filePath = path.join(config.uploadDir, document.storage_key);
    await fs.unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });

    res.status(204).send();
  })
);
