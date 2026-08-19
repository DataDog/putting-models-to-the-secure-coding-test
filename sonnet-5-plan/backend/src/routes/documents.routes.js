// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { Router } from 'express';
import * as documentsController from '../controllers/documents.controller.js';
import * as commentsController from '../controllers/comments.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../services/upload.service.js';
import {
  listDocumentsSchema,
  uploadDocumentSchema,
  documentIdParamSchema,
  updateDocumentSchema,
  documentIdInParamsSchema,
  commentBodySchema,
  commentIdParamSchema,
} from '../validators/documents.schemas.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listDocumentsSchema), documentsController.listDocuments);
router.post('/', upload.single('file'), validate(uploadDocumentSchema), documentsController.uploadDocument);
router.get('/:id', validate(documentIdParamSchema), documentsController.getDocument);
router.get('/:id/download', validate(documentIdParamSchema), documentsController.downloadDocument);
router.patch('/:id', validate(updateDocumentSchema), documentsController.updateDocument);
router.delete('/:id', validate(documentIdParamSchema), documentsController.deleteDocument);

router.get(
  '/:documentId/comments',
  validate(documentIdInParamsSchema),
  commentsController.listComments
);
router.post('/:documentId/comments', validate(commentBodySchema), commentsController.createComment);
router.delete(
  '/:documentId/comments/:commentId',
  validate(commentIdParamSchema),
  commentsController.deleteComment
);

export default router;
