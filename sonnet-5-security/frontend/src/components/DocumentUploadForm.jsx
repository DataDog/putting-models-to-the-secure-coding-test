import { useState } from 'react';
import { API_BASE_URL } from '../api/client.js';

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function DocumentUploadForm({ onUploaded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Please choose a file');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);

      const csrfToken = readCookie('csrf') || readCookie('__Host-csrf');
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setTitle('');
      setDescription('');
      setFile(null);
      e.target.reset();
      onUploaded?.(data.document);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
      <h2>Upload a document</h2>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
      </label>
      <label>
        File (pdf, png, jpg, gif, txt, md — 10MB max)
        <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
      </label>
      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
}
