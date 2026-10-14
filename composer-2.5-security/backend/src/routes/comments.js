import { Router } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.get('/', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;

    const docCheck = await query('SELECT id FROM documents WHERE id = $1', [documentId]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const result = await query(
      `SELECT c.id, c.content, c.created_at, c.updated_at,
              u.name AS author_name, u.email AS author_email, u.id AS author_id
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.document_id = $1
       ORDER BY c.created_at ASC`,
      [documentId]
    );

    res.json({ comments: result.rows });
  } catch (err) {
    console.error('List comments error:', err);
    res.status(500).json({ error: 'Failed to list comments' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const docCheck = await query('SELECT id FROM documents WHERE id = $1', [documentId]);
    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const result = await query(
      `INSERT INTO comments (document_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at, updated_at`,
      [documentId, req.user.id, content.trim()]
    );

    const comment = {
      ...result.rows[0],
      author_name: req.user.name,
      author_email: req.user.email,
      author_id: req.user.id,
    };

    res.status(201).json({ comment });
  } catch (err) {
    console.error('Create comment error:', err);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.delete('/:commentId', authenticate, async (req, res) => {
  try {
    const { documentId, commentId } = req.params;

    const result = await query(
      'SELECT user_id FROM comments WHERE id = $1 AND document_id = $2',
      [commentId, documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (result.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
