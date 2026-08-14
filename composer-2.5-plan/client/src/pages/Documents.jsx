import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import SearchBar from '../components/SearchBar.jsx';
import FileUpload from '../components/FileUpload.jsx';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const loadDocuments = useCallback(async (q = query) => {
    setLoading(true);
    setError('');
    try {
      const { documents: docs } = await api.getDocuments(q);
      setDocuments(docs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSearch = (q) => {
    setQuery(q);
    loadDocuments(q);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.deleteDocument(id);
      loadDocuments();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <h1>Documents</h1>
        <SearchBar onSearch={handleSearch} initialQuery={query} />
        <FileUpload onUploaded={() => loadDocuments()} />

        {loading && <p className="loading">Loading documents...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="card">
            {documents.length === 0 ? (
              <p className="meta">No documents found.</p>
            ) : (
              <ul className="doc-list">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <Link to={`/documents/${doc.id}`}>
                      <strong>{doc.title}</strong>
                    </Link>
                    {doc.description && <p>{doc.description}</p>}
                    <p className="meta">
                      {doc.filename} &middot; {formatSize(doc.size)} &middot;{' '}
                      {doc.uploadedBy?.name || doc.uploadedBy?.email} &middot;{' '}
                      {doc._count?.comments ?? 0} comments &middot;{' '}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                    {(doc.userId === user?.id || user?.role === 'ADMIN') && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ marginTop: '0.5rem' }}
                        onClick={() => handleDelete(doc.id)}
                      >
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
