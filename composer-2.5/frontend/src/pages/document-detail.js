import { api } from '../api.js';
import { navigate } from '../router.js';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export async function renderDocumentDetail(container, { user, params }) {
  const docId = params.id;
  container.innerHTML = `<p class="text-muted">Loading...</p>`;

  try {
    const [{ document }, { comments }] = await Promise.all([
      api.getDocument(docId),
      api.getComments(docId),
    ]);

    const canDelete =
      user.role === 'admin' ||
      (user.role === 'editor' && document.uploaded_by === user.id);

    container.innerHTML = `
      <a href="#/documents" class="text-muted" style="font-size:0.85rem">&larr; Back to documents</a>
      <div class="doc-detail mt-2">
        <h1>${escapeHtml(document.title)}</h1>
        <div class="meta">
          <span>Uploaded by ${escapeHtml(document.uploader_name)}</span>
          <span>${formatDate(document.created_at)}</span>
          <span>${escapeHtml(document.original_name)}</span>
        </div>
        ${document.description ? `<div class="description">${escapeHtml(document.description)}</div>` : ''}
        <div class="doc-actions">
          <a href="${api.downloadDocument(docId)}" class="btn btn-primary" target="_blank" rel="noopener">Download</a>
          ${canDelete ? `<button class="btn btn-danger" id="delete-doc">Delete</button>` : ''}
        </div>
      </div>

      <div class="comments-section">
        <h2>Comments (${comments.length})</h2>
        <div class="comment-form">
          <form id="comment-form">
            <div class="form-group">
              <textarea id="comment-content" placeholder="Add a comment..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-sm">Post comment</button>
          </form>
        </div>
        <div id="comment-list">
          ${renderComments(comments, user, docId)}
        </div>
      </div>
    `;

    container.querySelector('#comment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = container.querySelector('#comment-content').value;
      try {
        await api.addComment(docId, content);
        const { comments: updated } = await api.getComments(docId);
        container.querySelector('#comment-list').innerHTML = renderComments(updated, user, docId);
        container.querySelector('#comment-content').value = '';
        bindCommentActions(container, user, docId);
      } catch (err) {
        alert(err.message);
      }
    });

    container.querySelector('#delete-doc')?.addEventListener('click', async () => {
      if (!confirm('Delete this document?')) return;
      try {
        await api.deleteDocument(docId);
        navigate('/documents');
      } catch (err) {
        alert(err.message);
      }
    });

    bindCommentActions(container, user, docId);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function renderComments(comments, user, docId) {
  if (comments.length === 0) {
    return '<p class="text-muted">No comments yet. Be the first to comment.</p>';
  }

  return `<div class="comment-list">${comments
    .map(
      (c) => `
      <div class="comment" data-id="${c.id}">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(c.user_name)}</span>
          <span class="comment-date">${formatDate(c.created_at)}</span>
        </div>
        <div class="comment-body" id="comment-body-${c.id}">${escapeHtml(c.content)}</div>
        ${
          c.user_id === user.id || user.role === 'admin'
            ? `<div class="comment-actions">
                <button class="btn btn-secondary btn-sm edit-comment" data-id="${c.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-comment" data-id="${c.id}">Delete</button>
              </div>`
            : ''
        }
      </div>
    `
    )
    .join('')}</div>`;
}

function bindCommentActions(container, user, docId) {
  container.querySelectorAll('.delete-comment').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return;
      try {
        await api.deleteComment(docId, btn.dataset.id);
        const { comments } = await api.getComments(docId);
        container.querySelector('#comment-list').innerHTML = renderComments(comments, user, docId);
        bindCommentActions(container, user, docId);
      } catch (err) {
        alert(err.message);
      }
    });
  });

  container.querySelectorAll('.edit-comment').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const bodyEl = container.querySelector(`#comment-body-${id}`);
      const current = bodyEl.textContent;
      bodyEl.innerHTML = `
        <textarea id="edit-${id}" style="width:100%;min-height:60px">${escapeHtml(current)}</textarea>
        <div class="comment-actions">
          <button class="btn btn-primary btn-sm save-edit" data-id="${id}">Save</button>
          <button class="btn btn-secondary btn-sm cancel-edit" data-id="${id}">Cancel</button>
        </div>
      `;

      container.querySelector(`.cancel-edit[data-id="${id}"]`).addEventListener('click', () => {
        bodyEl.textContent = current;
      });

      container.querySelector(`.save-edit[data-id="${id}"]`).addEventListener('click', async () => {
        const newContent = container.querySelector(`#edit-${id}`).value;
        try {
          await api.updateComment(docId, id, newContent);
          bodyEl.textContent = newContent;
        } catch (err) {
          alert(err.message);
        }
      });
    });
  });
}
