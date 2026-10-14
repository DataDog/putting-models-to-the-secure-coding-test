import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { validateUploadContent } from '../services/fileValidation.js';
import { saveUploadedFile, resolveStoredFilePath, deleteStoredFile } from '../services/storage.service.js';
import {
  createDocument,
  searchDocuments,
  getDocumentById,
  deleteDocumentRow,
} from '../services/document.service.js';

export const uploadMetadataSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(''),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid(),
});

function sanitizeOriginalFilename(filename) {
  // Strip control characters and path separators; length-limit. This value
  // is only ever used for display/Content-Disposition, never to locate the
  // file on disk (that uses the server-generated stored_filename).
  const cleaned = (filename || 'file')
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 0x1f && code !== 0x7f && ch !== '/' && ch !== '\\';
    })
    .join('')
    .trim();
  return cleaned.slice(0, 255) || 'file';
}

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError(400, 'A file is required');
    }

    const originalFilename = sanitizeOriginalFilename(req.file.originalname);
    const { extension, mimeType } = await validateUploadContent(req.file.buffer, originalFilename);
    const storedFilename = saveUploadedFile(req.file.buffer, extension);

    const document = await createDocument({
      ownerId: req.user.id,
      originalFilename,
      storedFilename,
      mimeType,
      sizeBytes: req.file.buffer.length,
      title: req.body.title,
      description: req.body.description,
    });

    res.status(201).json({ document });
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req, res, next) {
  try {
    const documents = await searchDocuments(req.query.q);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
}

export async function getDocument(req, res, next) {
  try {
    const document = await getDocumentById(req.params.id);
    if (!document) throw new AppError(404, 'Document not found');
    const { stored_filename, ...publicDocument } = document;
    res.json({ document: publicDocument });
  } catch (err) {
    next(err);
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const document = await getDocumentById(req.params.id);
    if (!document) throw new AppError(404, 'Document not found');

    const filePath = resolveStoredFilePath(document.stored_filename);
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.original_filename.replace(/"/g, '')}"`
    );
    res.download(filePath, document.original_filename);
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const document = await getDocumentById(req.params.id);
    if (!document) throw new AppError(404, 'Document not found');

    if (document.owner_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError(403, 'Insufficient permissions');
    }

    await deleteDocumentRow(document.id);
    deleteStoredFile(document.stored_filename);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
