import { Router } from 'express';
import { prisma } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const comments = await prisma.comment.findMany({
      where: { documentId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ comments });
  } catch (err) {
    next(err);
  }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { body } = req.body;

    if (!body?.trim()) {
      return res.status(400).json({ error: 'Comment body is required' });
    }

    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        body: body.trim(),
        documentId: req.params.id,
        userId: req.user.id,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

export default router;
