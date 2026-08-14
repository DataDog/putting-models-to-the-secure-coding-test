import { useState } from 'react';
import { api } from '../api/client.js';

export default function CommentList({ documentId, comments: initialComments }) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const { comment } = await api.addComment(documentId, body.trim());
      setComments((prev) => [...prev, comment]);
      setBody('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h3>Comments ({comments.length})</h3>

      {comments.length === 0 && <p className="meta">No comments yet.</p>}

      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <p>{comment.body}</p>
          <p className="meta">
            {comment.author?.name || comment.author?.email} &middot;{' '}
            {new Date(comment.createdAt).toLocaleString()}
          </p>
        </div>
      ))}

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label htmlFor="comment">Add a comment</label>
          <textarea
            id="comment"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  );
}
