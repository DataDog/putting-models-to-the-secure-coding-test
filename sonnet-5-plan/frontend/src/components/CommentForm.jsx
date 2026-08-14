import { useState } from 'react';

export function CommentForm({ onSubmit }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(body);
      setBody('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment..."
        rows={3}
        maxLength={2000}
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Posting...' : 'Post comment'}
      </button>
    </form>
  );
}
