// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at, c.updated_at,
              u.id AS user_id, u.name AS user_name
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.document_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.documentId]
    );
    res.json({ comments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  try {
    const doc = await pool.query('SELECT id FROM documents WHERE id = $1', [
      req.params.documentId,
    ]);
    if (!doc.rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const result = await pool.query(
      `INSERT INTO comments (document_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [req.params.documentId, req.user.id, content.trim()]
    );

    const comment = {
      ...result.rows[0],
      user_id: req.user.id,
      user_name: req.user.name || 'You',
    };

    res.status(201).json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.put('/:commentId', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  try {
    const existing = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1 AND document_id = $2',
      [req.params.commentId, req.params.documentId]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot edit this comment' });
    }

    const result = await pool.query(
      `UPDATE comments SET content = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, content, created_at, updated_at`,
      [content.trim(), req.params.commentId]
    );
    res.json({ comment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

router.delete('/:commentId', requireAuth, async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1 AND document_id = $2',
      [req.params.commentId, req.params.documentId]
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot delete this comment' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [req.params.commentId]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
