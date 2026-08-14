import { useState } from 'react';
import { api } from '../api/client.js';

export default function FileUpload({ onUploaded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file || !title.trim()) {
      setError('Title and file are required');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());

    setUploading(true);
    try {
      await api.uploadDocument(formData);
      setTitle('');
      setDescription('');
      setFile(null);
      e.target.reset();
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h3>Upload Document</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="file">File (PDF, DOC, DOCX, TXT, PNG, JPG)</label>
          <input
            id="file"
            type="file"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
