import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { CommentList } from '../components/CommentList.jsx';
import { CommentForm } from '../components/CommentForm.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function DocumentDetailPage() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [docData, commentsData] = await Promise.all([
        apiRequest(`/api/documents/${id}`),
        apiRequest(`/api/documents/${id}/comments`),
      ]);
      setDocument(docData.document);
      setComments(commentsData.comments);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddComment(body) {
    await apiRequest(`/api/documents/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    await load();
  }

  async function handleDeleteComment(commentId) {
    await apiRequest(`/api/documents/${id}/comments/${commentId}`, { method: 'DELETE' });
    await load();
  }

  if (error) return <p className="error">{error}</p>;
  if (!document) return <p>Loading...</p>;

  return (
    <div className="page">
      <p>
        <Link to="/">&larr; Back to documents</Link>
      </p>
      <h1>{document.title}</h1>
      {document.description && <p>{document.description}</p>}
      <p className="document-meta">
        Uploaded by {document.ownerName} &middot; {new Date(document.createdAt).toLocaleString()}
      </p>
      <p>
        <a href={`${API_URL}/api/documents/${id}/download`}>Download original file</a>
      </p>

      <h2>Comments</h2>
      <CommentList comments={comments} onDelete={handleDeleteComment} />
      <CommentForm onSubmit={handleAddComment} />
    </div>
  );
}
