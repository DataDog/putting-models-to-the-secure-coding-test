// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';

export const commentsRouter = Router();

const idSchema = z.string().uuid();

const createCommentSchema = z.object({
  documentId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

const listQuerySchema = z.object({
  documentId: z.string().uuid(),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

// Comments are stored and returned as plain text. The client must render
// them as text content (never innerHTML) — see client/js/pages/documentDetail.js.
commentsRouter.post('/', requireAuth, validateBody(createCommentSchema), async (req, res, next) => {
  try {
    const { documentId, body } = req.body;
    const docResult = await query('SELECT id FROM documents WHERE id = $1', [documentId]);
    if (docResult.rowCount === 0) return res.status(404).json({ error: 'Document not found' });

    const result = await query(
      `INSERT INTO comments (document_id, user_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, document_id, body, created_at`,
      [documentId, req.user.id, body],
    );

    return res.status(201).json({ comment: { ...result.rows[0], authorId: req.user.id } });
  } catch (err) {
    return next(err);
  }
});

commentsRouter.get('/', requireAuth, validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const { documentId, page, pageSize } = req.query;
    const offset = (page - 1) * pageSize;

    const result = await query(
      `SELECT c.id, c.body, c.created_at, u.id AS author_id, u.name AS author_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.document_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [documentId, pageSize, offset],
    );

    return res.json({ comments: result.rows, pagination: { page, pageSize } });
  } catch (err) {
    return next(err);
  }
});

commentsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid comment id' });

    const result = await query('SELECT user_id FROM comments WHERE id = $1', [parsed.data]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Comment not found' });

    if (result.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await query('DELETE FROM comments WHERE id = $1', [parsed.data]);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});
