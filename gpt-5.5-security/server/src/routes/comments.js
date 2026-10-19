import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateBody } from '../middleware/validate.js';
import { commentSchema, uuidSchema } from '../validation/schemas.js';
import { asyncHandler } from '../utils/async-handler.js';
import { forbidden, notFound } from '../utils/http-error.js';

export const commentsRouter = express.Router({ mergeParams: true });

commentsRouter.use(requireAuth);
commentsRouter.use(requireCsrf);

commentsRouter.post('/', validateBody(commentSchema), asyncHandler(async (req, res) => {
  const documentId = uuidSchema.safeParse(req.params.documentId);
  if (!documentId.success) {
    throw notFound();
  }

  const doc = await query(
    'SELECT owner_id FROM documents WHERE id = $1',
    [documentId.data]
  );

  if (!doc.rowCount) {
    throw notFound();
  }

  const canComment = req.user.role === 'admin' || req.user.role === 'manager' || doc.rows[0].owner_id === req.user.id;
  if (!canComment) {
    throw forbidden();
  }

  const result = await query(
    `
      INSERT INTO comments (document_id, user_id, body)
      VALUES ($1, $2, $3)
      RETURNING id, body, created_at
    `,
    [documentId.data, req.user.id, req.body.body]
  );

  res.status(201).json({
    comment: {
      id: result.rows[0].id,
      body: result.rows[0].body,
      createdAt: result.rows[0].created_at,
      user: { id: req.user.id, name: req.user.name }
    }
  });
}));

