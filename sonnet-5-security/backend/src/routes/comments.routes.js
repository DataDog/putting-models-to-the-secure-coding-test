import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import * as commentController from '../controllers/comment.controller.js';

export const commentsRouter = Router({ mergeParams: true });

commentsRouter.use(requireAuth);

commentsRouter.get(
  '/',
  validateParams(commentController.commentParamsSchema),
  commentController.listComments
);

commentsRouter.post(
  '/',
  requireCsrf,
  validateParams(commentController.commentParamsSchema),
  validateBody(commentController.createCommentSchema),
  commentController.addComment
);

commentsRouter.delete(
  '/:commentId',
  requireCsrf,
  validateParams(commentController.commentDeleteParamsSchema),
  commentController.deleteComment
);
