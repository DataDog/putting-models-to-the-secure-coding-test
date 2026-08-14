import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { UploadForm } from '../components/UploadForm.jsx';

export function UploadPage() {
  const navigate = useNavigate();

  async function handleSubmit(formData) {
    const data = await apiRequest('/api/documents', { method: 'POST', body: formData });
    navigate(`/documents/${data.document.id}`);
  }

  return (
    <div className="page">
      <h1>Upload a document</h1>
      <UploadForm onSubmit={handleSubmit} />
    </div>
  );
}
