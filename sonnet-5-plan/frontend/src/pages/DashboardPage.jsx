import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { SearchBar } from '../components/SearchBar.jsx';
import { DocumentList } from '../components/DocumentList.jsx';

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const data = await apiRequest(`/api/documents?${params.toString()}`);
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(value) {
    setSearchParams(value ? { q: value } : {});
  }

  return (
    <div className="page">
      <h1>Documents</h1>
      <SearchBar initialValue={q} onSearch={handleSearch} />
      {error && <p className="error">{error}</p>}
      {loading ? <p>Loading...</p> : <DocumentList documents={documents} />}
    </div>
  );
}
