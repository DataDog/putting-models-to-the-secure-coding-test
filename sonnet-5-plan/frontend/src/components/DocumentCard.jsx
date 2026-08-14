import { Link } from 'react-router-dom';

export function DocumentCard({ document }) {
  return (
    <div className="document-card">
      <h3>
        <Link to={`/documents/${document.id}`}>{document.title}</Link>
      </h3>
      {document.description && <p>{document.description}</p>}
      <p className="document-meta">
        Uploaded by {document.ownerName} &middot; {new Date(document.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}
