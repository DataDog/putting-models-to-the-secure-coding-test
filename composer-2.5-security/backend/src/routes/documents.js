import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { query } from '../db/pool.js';
import { authenticate, canWriteDocuments } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { config } from '../config.js';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { q, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let result;
    let countResult;

    if (q && q.trim()) {
      const searchTerm = q.trim();
      result = await query(
        `SELECT d.id, d.original_name, d.mime_type, d.size_bytes, d.description, d.created_at,
                u.name AS uploader_name, u.email AS uploader_email,
                ts_rank(d.search_vector, plainto_tsquery('english', $1)) AS rank
         FROM documents d
         JOIN users u ON u.id = d.user_id
         WHERE d.search_vector @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC, d.created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchTerm, limitNum, offset]
      );
      countResult = await query(
        `SELECT COUNT(*) FROM documents
         WHERE search_vector @@ plainto_tsquery('english', $1)`,
        [searchTerm]
      );
    } else {
      result = await query(
        `SELECT d.id, d.original_name, d.mime_type, d.size_bytes, d.description, d.created_at,
                u.name AS uploader_name, u.email AS uploader_email
         FROM documents d
         JOIN users u ON u.id = d.user_id
         ORDER BY d.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limitNum, offset]
      );
      countResult = await query('SELECT COUNT(*) FROM documents');
    }

    res.json({
      documents: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(countResult.rows[0].count, 10),
      },
    });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT d.id, d.original_name, d.mime_type, d.size_bytes, d.description, d.created_at, d.user_id,
              u.name AS uploader_name, u.email AS uploader_email
       FROM documents d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document: result.rows[0] });
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

router.post('/', authenticate, (req, res, next) => {
  if (!canWriteDocuments(req.user)) {
    return res.status(403).json({ error: 'Viewers cannot upload documents' });
  }
  next();
}, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { description = '' } = req.body;

    const result = await query(
      `INSERT INTO documents (user_id, filename, original_name, mime_type, size_bytes, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, original_name, mime_type, size_bytes, description, created_at`,
      [
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        description.trim(),
      ]
    );

    res.status(201).json({ document: result.rows[0] });
  } catch (err) {
    if (req.file) {
      fs.unlink(path.join(config.uploadDir, req.file.filename), () => {});
    }
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT filename, original_name, mime_type FROM documents WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    const filePath = path.join(config.uploadDir, doc.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT user_id, filename FROM documents WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = result.rows[0];
    if (doc.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);

    const filePath = path.join(config.uploadDir, doc.filename);
    fs.unlink(filePath, () => {});

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
