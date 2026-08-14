import { DocumentCard } from './DocumentCard.jsx';

export function DocumentList({ documents }) {
  if (documents.length === 0) {
    return <p>No documents found.</p>;
  }

  return (
    <div className="document-list">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
