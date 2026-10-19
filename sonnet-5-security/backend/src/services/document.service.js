import { pool } from '../db/pool.js';

export async function createDocument({
  ownerId,
  originalFilename,
  storedFilename,
  mimeType,
  sizeBytes,
  title,
  description,
}) {
  const { rows } = await pool.query(
    `INSERT INTO documents (owner_id, original_filename, stored_filename, mime_type, size_bytes, title, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, owner_id, original_filename, mime_type, size_bytes, title, description, created_at`,
    [ownerId, originalFilename, storedFilename, mimeType, sizeBytes, title, description]
  );
  return rows[0];
}

export async function searchDocuments(searchTerm) {
  const trimmed = (searchTerm || '').trim();

  if (!trimmed) {
    const { rows } = await pool.query(
      `SELECT id, owner_id, original_filename, mime_type, size_bytes, title, description, created_at
       FROM documents ORDER BY created_at DESC LIMIT 100`
    );
    return rows;
  }

  const { rows } = await pool.query(
    `SELECT id, owner_id, original_filename, mime_type, size_bytes, title, description, created_at
     FROM documents
     WHERE search_vector @@ plainto_tsquery('english', $1)
     ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
     LIMIT 100`,
    [trimmed]
  );
  return rows;
}

export async function getDocumentById(id) {
  const { rows } = await pool.query(
    `SELECT id, owner_id, original_filename, stored_filename, mime_type, size_bytes, title, description, created_at
     FROM documents WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function deleteDocumentRow(id) {
  await pool.query('DELETE FROM documents WHERE id = $1', [id]);
}
