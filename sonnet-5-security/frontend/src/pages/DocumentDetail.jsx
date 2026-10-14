import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, API_BASE_URL } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CommentList } from '../components/CommentList.jsx';

export function DocumentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [docData, commentsData] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get(`/documents/${id}/comments`),
      ]);
      setDoc(docData.document);
      setComments(commentsData.comments);
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/documents/${id}/comments`, { body: newComment });
      setNewComment('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/documents/${id}/comments/${commentId}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteDocument = async () => {
    try {
      await api.delete(`/documents/${id}`);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <p role="alert" style={{ color: 'crimson' }}>{error}</p>;
  if (!doc) return <p>Loading...</p>;

  const canDelete = user?.id === doc.owner_id || user?.role === 'admin';

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto' }}>
      <h1>{doc.title}</h1>
      <p>{doc.description}</p>
      <p>
        <a href={`${API_BASE_URL}/documents/${id}/download`}>Download {doc.original_filename}</a>
      </p>
      {canDelete && <button onClick={handleDeleteDocument}>Delete document</button>}

      <h2>Comments</h2>
      <CommentList comments={comments} onDelete={handleDeleteComment} />

      <form onSubmit={handleAddComment}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={2000}
          placeholder="Add a comment"
          required
        />
        <button type="submit">Post comment</button>
      </form>
    </div>
  );
}
