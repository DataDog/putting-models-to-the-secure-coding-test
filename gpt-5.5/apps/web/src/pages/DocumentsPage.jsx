import { useEffect, useState } from 'react';
import { API_BASE, api } from '../api.js';

export default function DocumentsPage({ user, setError }) {
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [upload, setUpload] = useState({
    title: '',
    description: '',
    file: null
  });

  useEffect(() => {
    loadDocuments('');
  }, []);

  async function loadDocuments(search = query) {
    try {
      const data = await api.documents(search);
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    }
  }

  async function selectDocument(document) {
    setSelected(document);
    setCommentBody('');

    try {
      const data = await api.document(document.id);
      setSelected(data.document);
      setComments(data.comments);
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadDocument(event) {
    event.preventDefault();
    setError('');

    const formData = new FormData();
    formData.set('title', upload.title);
    formData.set('description', upload.description);
    formData.set('file', upload.file);

    try {
      const data = await api.uploadDocument(formData);
      setDocuments((current) => [data.document, ...current]);
      setUpload({ title: '', description: '', file: null });
      event.currentTarget.reset();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addComment(event) {
    event.preventDefault();
    setError('');

    try {
      const data = await api.addComment(selected.id, commentBody);
      setComments((current) => [...current, data.comment]);
      setCommentBody('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteDocument(document) {
    if (!window.confirm(`Delete "${document.title}"?`)) {
      return;
    }

    try {
      await api.deleteDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      if (selected?.id === document.id) {
        setSelected(null);
        setComments([]);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid two-columns">
      <section className="panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">Search</p>
            <h2>Documents</h2>
          </div>
        </div>

        <form
          className="search-row"
          onSubmit={(event) => {
            event.preventDefault();
            loadDocuments();
          }}
        >
          <input
            placeholder="Search title, description, or file name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        <div className="document-list">
          {documents.map((document) => (
            <article
              key={document.id}
              className={selected?.id === document.id ? 'document-card active' : 'document-card'}
              onClick={() => selectDocument(document)}
            >
              <div>
                <h3>{document.title}</h3>
                <p>{document.description || document.originalName}</p>
                <small>
                  {document.owner.name} · {Math.ceil(document.sizeBytes / 1024)} KB
                </small>
              </div>
              {(document.owner.id === user.id || user.role === 'admin') && (
                <button
                  className="danger small"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteDocument(document);
                  }}
                >
                  Delete
                </button>
              )}
            </article>
          ))}
          {documents.length === 0 ? <p className="muted">No documents found.</p> : null}
        </div>
      </section>

      <section className="stack">
        <form className="panel stack" onSubmit={uploadDocument}>
          <div>
            <p className="eyebrow">Upload</p>
            <h2>New document</h2>
          </div>
          <label>
            Title
            <input
              value={upload.title}
              onChange={(event) => setUpload({ ...upload, title: event.target.value })}
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={upload.description}
              onChange={(event) => setUpload({ ...upload, description: event.target.value })}
            />
          </label>
          <label>
            File
            <input
              type="file"
              onChange={(event) => setUpload({ ...upload, file: event.target.files[0] })}
              required
            />
          </label>
          <button type="submit">Upload file</button>
        </form>

        <section className="panel">
          {selected ? (
            <>
              <div className="section-title">
                <div>
                  <p className="eyebrow">Selected document</p>
                  <h2>{selected.title}</h2>
                </div>
                <a
                  className="button secondary"
                  href={`${API_BASE}/documents/${selected.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              </div>
              <p>{selected.description || 'No description provided.'}</p>
              <div className="comments">
                <h3>Comments</h3>
                {comments.map((comment) => (
                  <article key={comment.id} className="comment">
                    <p>{comment.body}</p>
                    <small>
                      {comment.user.name} · {new Date(comment.createdAt).toLocaleString()}
                    </small>
                  </article>
                ))}
                {comments.length === 0 ? <p className="muted">No comments yet.</p> : null}
              </div>
              <form onSubmit={addComment} className="comment-form">
                <textarea
                  placeholder="Add a comment"
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  required
                />
                <button type="submit">Comment</button>
              </form>
            </>
          ) : (
            <p className="muted">Select a document to view comments and download it.</p>
          )}
        </section>
      </section>
    </div>
  );
}
