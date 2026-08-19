// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { api } from '../api.js';
import { navigate } from '../router.js';

export function renderUpload(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Upload Document</h1>
    </div>
    <div class="doc-detail">
      <div id="upload-error"></div>
      <div id="upload-success"></div>
      <form id="upload-form">
        <div class="form-group">
          <label for="title">Title</label>
          <input type="text" id="title" name="title" required />
        </div>
        <div class="form-group">
          <label for="description">Description</label>
          <textarea id="description" name="description" placeholder="Optional description for search..."></textarea>
        </div>
        <div class="form-group">
          <label for="file">File</label>
          <input type="file" id="file" name="file" required
            accept=".pdf,.txt,.md,.doc,.docx,.png,.jpg,.jpeg" />
        </div>
        <div style="display:flex;gap:0.75rem">
          <button type="submit" class="btn btn-primary">Upload</button>
          <a href="#/documents" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `;

  container.querySelector('#upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = container.querySelector('#upload-error');
    const successEl = container.querySelector('#upload-success');
    errorEl.innerHTML = '';
    successEl.innerHTML = '';

    const formData = new FormData();
    formData.append('title', e.target.title.value);
    formData.append('description', e.target.description.value);
    formData.append('file', e.target.file.files[0]);

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      const data = await api.uploadDocument(formData);
      successEl.innerHTML = `<div class="alert alert-success">Document "${data.document.title}" uploaded successfully!</div>`;
      setTimeout(() => navigate(`/documents/${data.document.id}`), 1500);
    } catch (err) {
      errorEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}
