import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireCsrf } from '../middleware/csrf.js';
import { documentUpload } from '../middleware/upload.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import * as documentController from '../controllers/document.controller.js';

export const documentsRouter = Router();

documentsRouter.use(requireAuth);

documentsRouter.get('/', validateQuery(documentController.searchQuerySchema), documentController.listDocuments);

documentsRouter.post(
  '/',
  requireCsrf,
  documentUpload,
  validateBody(documentController.uploadMetadataSchema),
  documentController.uploadDocument
);

documentsRouter.get(
  '/:id',
  validateParams(documentController.documentIdParamSchema),
  documentController.getDocument
);

documentsRouter.get(
  '/:id/download',
  validateParams(documentController.documentIdParamSchema),
  documentController.downloadDocument
);

documentsRouter.delete(
  '/:id',
  requireCsrf,
  validateParams(documentController.documentIdParamSchema),
  documentController.deleteDocument
);
