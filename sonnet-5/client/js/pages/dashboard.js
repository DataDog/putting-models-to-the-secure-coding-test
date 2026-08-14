import { el, showMessage, clear } from '../dom.js';
import { apiRequest, ApiError } from '../api.js';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function loadResults(resultsEl, query, page) {
  clear(resultsEl);
  resultsEl.appendChild(el('p', {}, 'Loading…'));
  try {
    const { documents, pagination } = await apiRequest(
      `/api/documents?q=${encodeURIComponent(query)}&page=${page}&pageSize=20`,
    );
    clear(resultsEl);

    if (documents.length === 0) {
      resultsEl.appendChild(el('p', {}, 'No documents found.'));
      return;
    }

    const list = el(
      'ul',
      { className: 'document-list' },
      documents.map((doc) =>
        el('li', {}, [
          el('a', { href: `#/documents/${doc.id}` }, doc.title),
          el('span', { className: 'meta' }, ` — ${doc.original_filename} (${formatSize(doc.size_bytes)}) — uploaded by ${doc.owner_name}`),
        ]),
      ),
    );
    resultsEl.appendChild(list);

    const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
    if (totalPages > 1) {
      resultsEl.appendChild(el('p', { className: 'meta' }, `Page ${pagination.page} of ${totalPages}`));
    }
  } catch (err) {
    clear(resultsEl);
    const message = err instanceof ApiError ? err.message : 'Failed to load documents';
    showMessage(resultsEl, message, 'error');
  }
}

export async function renderDashboard(mount) {
  const searchInput = el('input', { type: 'search', placeholder: 'Search documents…' });
  const resultsEl = el('div', { className: 'results' });

  const searchForm = el(
    'form',
    {
      className: 'search-form',
      onsubmit: (e) => {
        e.preventDefault();
        loadResults(resultsEl, searchInput.value, 1);
      },
    },
    [searchInput, el('button', { type: 'submit' }, 'Search')],
  );

  const titleInput = el('input', { type: 'text', name: 'title', required: 'true', maxlength: '200' });
  const descriptionInput = el('textarea', { name: 'description', maxlength: '2000', rows: '3' });
  const fileInput = el('input', { type: 'file', name: 'file', required: 'true' });
  const uploadMessage = el('div');

  const uploadForm = el(
    'form',
    {
      className: 'upload-form',
      onsubmit: async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', titleInput.value);
        formData.append('description', descriptionInput.value);
        formData.append('file', fileInput.files[0]);

        try {
          await apiRequest('/api/documents', { method: 'POST', body: formData });
          showMessage(uploadMessage, 'Document uploaded.', 'success');
          titleInput.value = '';
          descriptionInput.value = '';
          fileInput.value = '';
          loadResults(resultsEl, searchInput.value, 1);
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Upload failed';
          showMessage(uploadMessage, message, 'error');
        }
      },
    },
    [
      el('h2', {}, 'Upload a document'),
      uploadMessage,
      el('label', {}, ['Title', titleInput]),
      el('label', {}, ['Description', descriptionInput]),
      el('label', {}, ['File (pdf, png, jpg, txt, docx — max 25MB)', fileInput]),
      el('button', { type: 'submit' }, 'Upload'),
    ],
  );

  mount.appendChild(el('h1', {}, 'Documents'));
  mount.appendChild(searchForm);
  mount.appendChild(resultsEl);
  mount.appendChild(uploadForm);

  await loadResults(resultsEl, '', 1);
}
