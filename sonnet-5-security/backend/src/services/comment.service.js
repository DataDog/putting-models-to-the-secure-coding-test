import { pool } from '../db/pool.js';

export async function createComment({ documentId, userId, body }) {
  const { rows } = await pool.query(
    `INSERT INTO comments (document_id, user_id, body)
     VALUES ($1, $2, $3)
     RETURNING id, document_id, user_id, body, created_at`,
    [documentId, userId, body]
  );
  return rows[0];
}

export async function listCommentsForDocument(documentId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.document_id, c.user_id, c.body, c.created_at, u.name AS author_name
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.document_id = $1
     ORDER BY c.created_at ASC`,
    [documentId]
  );
  return rows;
}

export async function getCommentById(id) {
  const { rows } = await pool.query('SELECT * FROM comments WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function deleteCommentRow(id) {
  await pool.query('DELETE FROM comments WHERE id = $1', [id]);
}
