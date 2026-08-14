import { useAuth } from '../auth/AuthContext.jsx';

export function CommentList({ comments, onDelete }) {
  const { user } = useAuth();

  if (comments.length === 0) {
    return <p>No comments yet.</p>;
  }

  return (
    <ul className="comment-list">
      {comments.map((comment) => {
        const canDelete = user && (user.id === comment.authorId || user.role === 'ADMIN');
        return (
          <li key={comment.id} className="comment">
            <p className="comment-body">{comment.body}</p>
            <p className="comment-meta">
              {comment.authorName} &middot; {new Date(comment.createdAt).toLocaleString()}
              {canDelete && (
                <button className="link-button" onClick={() => onDelete(comment.id)}>
                  Delete
                </button>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
