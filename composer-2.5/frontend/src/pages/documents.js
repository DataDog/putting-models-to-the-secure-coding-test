// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { api } from '../api.js';
import { navigate } from '../router.js';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function renderDocuments(container, { user }) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Documents</h1>
      ${user.role !== 'viewer' ? '<a href="#/upload" class="btn btn-primary">Upload</a>' : ''}
    </div>
    <div class="search-bar">
      <input type="search" id="search-input" placeholder="Search documents by title or description..." />
      <button class="btn btn-secondary" id="search-btn">Search</button>
    </div>
    <div id="doc-list"><p class="text-muted">Loading...</p></div>
  `;

  const searchInput = container.querySelector('#search-input');
  const listEl = container.querySelector('#doc-list');

  async function loadDocs(q = '') {
    try {
      const data = await api.searchDocuments(q);
      if (data.documents.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <h3>No documents found</h3>
            <p>${q ? 'Try a different search term' : 'Upload a document to get started'}</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = `
        <div class="doc-list">
          ${data.documents
            .map(
              (doc) => `
            <div class="doc-card" data-id="${doc.id}">
              <div class="doc-card-info">
                <h3>${escapeHtml(doc.title)}</h3>
                <p>${escapeHtml(doc.description || 'No description')}</p>
              </div>
              <div class="doc-card-meta">
                <div class="file-name">${escapeHtml(doc.original_name)}</div>
                <div>${formatSize(doc.file_size)} &middot; ${formatDate(doc.created_at)}</div>
                <div>by ${escapeHtml(doc.uploader_name)}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      listEl.querySelectorAll('.doc-card').forEach((card) => {
        card.addEventListener('click', () => navigate(`/documents/${card.dataset.id}`));
      });
    } catch (err) {
      listEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  }

  container.querySelector('#search-btn').addEventListener('click', () => loadDocs(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadDocs(searchInput.value);
  });

  await loadDocs();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
