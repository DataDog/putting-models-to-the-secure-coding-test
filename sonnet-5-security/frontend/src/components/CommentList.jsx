import { useAuth } from '../context/AuthContext.jsx';

export function CommentList({ comments, onDelete }) {
  const { user } = useAuth();

  if (comments.length === 0) {
    return <p>No comments yet.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {comments.map((comment) => (
        <li key={comment.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
          <strong>{comment.author_name}</strong>{' '}
          <small>{new Date(comment.created_at).toLocaleString()}</small>
          {/* Rendered as plain text (React escapes by default) - comments are
              never interpreted as HTML, so this is not vulnerable to stored XSS. */}
          <p style={{ margin: '0.25rem 0', whiteSpace: 'pre-wrap' }}>{comment.body}</p>
          {(user?.id === comment.user_id || user?.role === 'admin') && (
            <button onClick={() => onDelete(comment.id)}>Delete</button>
          )}
        </li>
      ))}
    </ul>
  );
}
