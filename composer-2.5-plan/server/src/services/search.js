import { prisma } from '../db.js';

export async function searchDocuments(query) {
  if (!query || !query.trim()) {
    return prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  const rows = await prisma.$queryRaw`
    SELECT d.id, d.title, d.description, d.filename, d."mimeType", d.size,
           d."storagePath", d."userId", d."createdAt",
           ts_rank(d.search_vector, plainto_tsquery('english', ${query})) AS rank
    FROM "Document" d
    WHERE d.search_vector @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC, d."createdAt" DESC
  `;

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const docIds = rows.map((r) => r.id);
  const commentCounts = await prisma.comment.groupBy({
    by: ['documentId'],
    where: { documentId: { in: docIds } },
    _count: { documentId: true },
  });
  const countMap = Object.fromEntries(
    commentCounts.map((c) => [c.documentId, c._count.documentId])
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    storagePath: row.storagePath,
    userId: row.userId,
    createdAt: row.createdAt,
    uploadedBy: userMap[row.userId],
    _count: { comments: countMap[row.id] || 0 },
    rank: Number(row.rank),
  }));
}
