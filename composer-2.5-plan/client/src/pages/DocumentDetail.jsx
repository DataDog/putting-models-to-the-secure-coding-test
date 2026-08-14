import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import Navbar from '../components/Navbar.jsx';
import CommentList from '../components/CommentList.jsx';

export default function DocumentDetail() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [docRes, commentsRes] = await Promise.all([
          api.getDocument(id),
          api.getComments(id),
        ]);
        setDocument(docRes.document);
        setComments(commentsRes.comments);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading">Loading...</div>
      </>
    );
  }

  if (error || !document) {
    return (
      <>
        <Navbar />
        <div className="container">
          <p className="error">{error || 'Document not found'}</p>
          <Link to="/documents">Back to documents</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <p><Link to="/documents">&larr; Back to documents</Link></p>

        <div className="card">
          <h1>{document.title}</h1>
          {document.description && <p>{document.description}</p>}
          <p className="meta">
            File: {document.filename} &middot; Uploaded by{' '}
            {document.uploadedBy?.name || document.uploadedBy?.email} &middot;{' '}
            {new Date(document.createdAt).toLocaleString()}
          </p>
          <button
            type="button"
            className="btn"
            style={{ marginTop: '0.5rem' }}
            onClick={() => api.downloadDocument(id, document.filename)}
          >
            Download
          </button>
        </div>

        <CommentList documentId={id} comments={comments} />
      </div>
    </>
  );
}
