import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  try {
    let query;
    let params;

    if (q && q.trim()) {
      query = `
        SELECT d.id, d.title, d.description, d.original_name, d.mime_type,
               d.file_size, d.created_at, u.name AS uploader_name
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE to_tsvector('english', d.title || ' ' || coalesce(d.description, ''))
              @@ plainto_tsquery('english', $1)
        ORDER BY d.created_at DESC
        LIMIT $2 OFFSET $3`;
      params = [q.trim(), parseInt(limit, 10), offset];
    } else {
      query = `
        SELECT d.id, d.title, d.description, d.original_name, d.mime_type,
               d.file_size, d.created_at, u.name AS uploader_name
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        ORDER BY d.created_at DESC
        LIMIT $1 OFFSET $2`;
      params = [parseInt(limit, 10), offset];
    }

    const result = await pool.query(query, params);
    res.json({ documents: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.title, d.description, d.original_name, d.filename,
              d.mime_type, d.file_size, d.created_at, d.uploaded_by,
              u.name AS uploader_name, u.email AS uploader_email
       FROM documents d
       JOIN users u ON d.uploaded_by = u.id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ document: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

router.post(
  '/',
  requireAuth,
  requireRole('admin', 'editor'),
  upload.single('file'),
  async (req, res) => {
    const { title, description } = req.body;
    if (!title || !req.file) {
      return res.status(400).json({ error: 'Title and file are required' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO documents (title, description, filename, original_name, mime_type, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, title, description, original_name, mime_type, file_size, created_at`,
        [
          title,
          description || null,
          req.file.filename,
          req.file.originalname,
          req.file.mimetype,
          req.file.size,
          req.user.id,
        ]
      );
      res.status(201).json({ document: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT filename, original_name, mime_type FROM documents WHERE id = $1',
      [req.params.id]
    );
    const doc = result.rows[0];
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.join(uploadDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin', 'editor'),
  async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT filename, uploaded_by FROM documents WHERE id = $1',
        [req.params.id]
      );
      const doc = result.rows[0];
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      if (req.user.role !== 'admin' && doc.uploaded_by !== req.user.id) {
        return res.status(403).json({ error: 'Cannot delete this document' });
      }

      await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
      const filePath = path.join(uploadDir, doc.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ message: 'Document deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);

export default router;
