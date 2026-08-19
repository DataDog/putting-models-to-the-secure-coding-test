// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { el, showMessage, clear } from '../dom.js';
import { apiRequest, apiRequestBlob, ApiError } from '../api.js';
import { getCurrentUser } from '../auth.js';
import { navigate } from '../router.js';

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

async function renderComments(container, documentId) {
  clear(container);
  container.appendChild(el('p', {}, 'Loading comments…'));
  try {
    const { comments } = await apiRequest(`/api/comments?documentId=${documentId}`);
    clear(container);

    const currentUser = getCurrentUser();
    const list = el(
      'ul',
      { className: 'comment-list' },
      comments.map((comment) => {
        const canDelete = currentUser && (currentUser.id === comment.author_id || currentUser.role === 'admin');
        const li = el('li', {}, [
          el('div', { className: 'comment-meta' }, `${comment.author_name} — ${formatDate(comment.created_at)}`),
          // Rendered as plain text (via `el`'s textContent-only children),
          // so a comment body can never inject markup or scripts.
          el('div', { className: 'comment-body' }, comment.body),
        ]);
        if (canDelete) {
          li.appendChild(
            el(
              'button',
              {
                className: 'link-button',
                onclick: async () => {
                  try {
                    await apiRequest(`/api/comments/${comment.id}`, { method: 'DELETE' });
                    renderComments(container, documentId);
                  } catch (err) {
                    // eslint-disable-next-line no-alert
                    alert(err instanceof ApiError ? err.message : 'Failed to delete comment');
                  }
                },
              },
              'Delete',
            ),
          );
        }
        return li;
      }),
    );

    container.appendChild(comments.length ? list : el('p', {}, 'No comments yet.'));
  } catch (err) {
    clear(container);
    const message = err instanceof ApiError ? err.message : 'Failed to load comments';
    showMessage(container, message, 'error');
  }
}

export async function renderDocumentDetail(mount, { params }) {
  const documentId = params.id;
  mount.appendChild(el('p', {}, 'Loading…'));

  let doc;
  try {
    const result = await apiRequest(`/api/documents/${documentId}`);
    doc = result.document;
  } catch (err) {
    clear(mount);
    const message = err instanceof ApiError ? err.message : 'Failed to load document';
    showMessage(mount, message, 'error');
    return;
  }

  clear(mount);

  const downloadMessage = el('div');
  const downloadButton = el(
    'button',
    {
      onclick: async () => {
        try {
          const blob = await apiRequestBlob(`/api/documents/${documentId}/download`);
          const url = URL.createObjectURL(blob);
          const link = el('a', { href: url, download: doc.original_filename });
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Download failed';
          showMessage(downloadMessage, message, 'error');
        }
      },
    },
    'Download',
  );

  const currentUser = getCurrentUser();
  const canDelete = currentUser && (currentUser.id === doc.owner_id || currentUser.role === 'admin');

  mount.appendChild(el('h1', {}, doc.title));
  mount.appendChild(el('p', { className: 'meta' }, `Uploaded by ${doc.owner_name} on ${formatDate(doc.created_at)}`));
  if (doc.description) mount.appendChild(el('p', {}, doc.description));
  mount.appendChild(downloadButton);
  mount.appendChild(downloadMessage);

  if (canDelete) {
    mount.appendChild(
      el(
        'button',
        {
          className: 'danger',
          onclick: async () => {
            // eslint-disable-next-line no-alert
            if (!confirm('Delete this document?')) return;
            try {
              await apiRequest(`/api/documents/${documentId}`, { method: 'DELETE' });
              navigate('/documents');
            } catch (err) {
              // eslint-disable-next-line no-alert
              alert(err instanceof ApiError ? err.message : 'Failed to delete document');
            }
          },
        },
        'Delete document',
      ),
    );
  }

  mount.appendChild(el('h2', {}, 'Comments'));
  const commentsContainer = el('div', { className: 'comments' });
  mount.appendChild(commentsContainer);

  const commentInput = el('textarea', { rows: '3', maxlength: '2000', required: 'true' });
  const commentMessage = el('div');
  const commentForm = el(
    'form',
    {
      onsubmit: async (e) => {
        e.preventDefault();
        if (!commentInput.value.trim()) return;
        try {
          await apiRequest('/api/comments', {
            method: 'POST',
            body: JSON.stringify({ documentId, body: commentInput.value }),
          });
          commentInput.value = '';
          renderComments(commentsContainer, documentId);
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Failed to post comment';
          showMessage(commentMessage, message, 'error');
        }
      },
    },
    [commentMessage, el('label', {}, ['Add a comment', commentInput]), el('button', { type: 'submit' }, 'Post')],
  );
  mount.appendChild(commentForm);

  await renderComments(commentsContainer, documentId);
}
