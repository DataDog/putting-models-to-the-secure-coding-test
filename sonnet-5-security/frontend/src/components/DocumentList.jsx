import { Link } from 'react-router';

export function DocumentList({ documents }) {
  if (documents.length === 0) {
    return <p>No documents found.</p>;
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {documents.map((doc) => (
        <li key={doc.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
          <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
          <p style={{ margin: '0.25rem 0', color: '#555' }}>{doc.description}</p>
          <small>{doc.original_filename}</small>
        </li>
      ))}
    </ul>
  );
}
