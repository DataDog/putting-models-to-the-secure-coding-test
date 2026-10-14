import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { getDocumentById } from '../services/document.service.js';
import {
  createComment,
  listCommentsForDocument,
  getCommentById,
  deleteCommentRow,
} from '../services/comment.service.js';

export const commentParamsSchema = z.object({
  documentId: z.string().uuid(),
});

export const commentDeleteParamsSchema = z.object({
  documentId: z.string().uuid(),
  commentId: z.string().uuid(),
});

export const createCommentSchema = z.object({
  // Comments are rendered as plain text on the client (never as HTML), so
  // no HTML sanitization is required here beyond a length limit.
  body: z.string().trim().min(1).max(2000),
});

export async function listComments(req, res, next) {
  try {
    const document = await getDocumentById(req.params.documentId);
    if (!document) throw new AppError(404, 'Document not found');

    const comments = await listCommentsForDocument(req.params.documentId);
    res.json({ comments });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req, res, next) {
  try {
    const document = await getDocumentById(req.params.documentId);
    if (!document) throw new AppError(404, 'Document not found');

    const comment = await createComment({
      documentId: req.params.documentId,
      userId: req.user.id,
      body: req.body.body,
    });
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

export async function deleteComment(req, res, next) {
  try {
    const comment = await getCommentById(req.params.commentId);
    if (!comment || comment.document_id !== req.params.documentId) {
      throw new AppError(404, 'Comment not found');
    }

    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError(403, 'Insufficient permissions');
    }

    await deleteCommentRow(comment.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
