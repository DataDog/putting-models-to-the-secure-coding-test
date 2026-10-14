import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { DocumentUploadForm } from '../components/DocumentUploadForm.jsx';
import { DocumentList } from '../components/DocumentList.jsx';

export function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const loadDocuments = useCallback(async (q = '') => {
    try {
      const data = await api.get(`/documents?q=${encodeURIComponent(q)}`);
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadDocuments(query);
  };

  return (
    <div style={{ maxWidth: 720, margin: '2rem auto' }}>
      <h1>Documents</h1>

      <DocumentUploadForm onUploaded={() => loadDocuments(query)} />

      <form onSubmit={handleSearch} style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Search documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '70%' }}
        />
        <button type="submit">Search</button>
      </form>

      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
      <DocumentList documents={documents} />
    </div>
  );
}
