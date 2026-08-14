import { prisma } from '../db/prisma.js';

function serializeComment(comment) {
  return {
    id: comment.id,
    body: comment.body,
    documentId: comment.documentId,
    authorId: comment.authorId,
    authorName: comment.author?.name,
    createdAt: comment.createdAt,
  };
}

export async function listComments(req, res) {
  const { documentId } = req.params;

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const comments = await prisma.comment.findMany({
    where: { documentId },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ comments: comments.map(serializeComment) });
}

export async function createComment(req, res) {
  const { documentId } = req.params;
  const { body } = req.body;

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const comment = await prisma.comment.create({
    data: { body, documentId, authorId: req.user.id },
    include: { author: { select: { name: true } } },
  });

  res.status(201).json({ comment: serializeComment(comment) });
}

export async function deleteComment(req, res) {
  const { documentId, commentId } = req.params;

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.documentId !== documentId) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  if (comment.authorId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  res.status(204).send();
}
