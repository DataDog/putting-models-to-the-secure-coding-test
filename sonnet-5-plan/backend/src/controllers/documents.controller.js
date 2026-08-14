import fs from 'node:fs';
import { prisma } from '../db/prisma.js';
import { resolveUploadPath, sanitizeDisplayName } from '../services/upload.service.js';

function serializeDocument(doc) {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    ownerId: doc.ownerId,
    ownerName: doc.owner?.name,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function canModify(doc, user) {
  return doc.ownerId === user.id || user.role === 'ADMIN';
}

export async function listDocuments(req, res) {
  const { q, page, limit } = req.query;

  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { originalName: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ]);

  res.json({
    documents: documents.map(serializeDocument),
    pagination: { page, limit, total },
  });
}

export async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { title, description } = req.body;

  const doc = await prisma.document.create({
    data: {
      title,
      description,
      originalName: sanitizeDisplayName(req.file.originalname),
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      ownerId: req.user.id,
    },
    include: { owner: { select: { name: true } } },
  });

  res.status(201).json({ document: serializeDocument(doc) });
}

export async function getDocument(req, res) {
  const doc = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: { owner: { select: { name: true } } },
  });

  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json({ document: serializeDocument(doc) });
}

export async function downloadDocument(req, res) {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  let filePath;
  try {
    filePath = resolveUploadPath(doc.storedName);
  } catch {
    return res.status(500).json({ error: 'Unable to resolve file' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${sanitizeDisplayName(doc.originalName)}"`
  );
  res.sendFile(filePath);
}

export async function updateDocument(req, res) {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!canModify(doc, req.user)) return res.status(403).json({ error: 'Forbidden' });

  const { title, description } = req.body;

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: { ...(title && { title }), ...(description !== undefined && { description }) },
    include: { owner: { select: { name: true } } },
  });

  res.json({ document: serializeDocument(updated) });
}

export async function deleteDocument(req, res) {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!canModify(doc, req.user)) return res.status(403).json({ error: 'Forbidden' });

  await prisma.document.delete({ where: { id: doc.id } });

  try {
    const filePath = resolveUploadPath(doc.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // best-effort cleanup only
  }

  res.status(204).send();
}
