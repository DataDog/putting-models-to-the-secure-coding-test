import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { searchDocuments } from '../services/search.js';
import { deleteFile, ensureUploadDir, getStoragePath } from '../services/storage.js';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  sanitizeFilename,
} from '../utils/validation.js';

const router = Router();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = sanitizeFilename(path.basename(file.originalname, ext));
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  },
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const documents = await searchDocuments(req.query.q);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

router.post('/', authMiddleware, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const { title, description } = req.body;
    if (!title?.trim()) {
      await deleteFile(req.file.path);
      return res.status(400).json({ error: 'Title is required' });
    }

    const document = await prisma.document.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: req.file.path,
        userId: req.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ document });
  } catch (err) {
    if (req.file) await deleteFile(req.file.path);
    next(err);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/download', authMiddleware, async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.download(document.storagePath, document.filename);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await deleteFile(document.storagePath);
    await prisma.document.delete({ where: { id: document.id } });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
