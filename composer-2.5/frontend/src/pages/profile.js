// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { api } from '../api.js';

export async function renderProfile(container) {
  container.innerHTML = `<p class="text-muted">Loading...</p>`;

  try {
    const { user } = await api.getProfile();

    container.innerHTML = `
      <div class="page-header">
        <h1>Profile</h1>
      </div>
      <div class="doc-detail">
        <div id="profile-error"></div>
        <div id="profile-success"></div>
        <form id="profile-form">
          <div class="form-group">
            <label for="name">Full name</label>
            <input type="text" id="name" name="name" value="${escapeAttr(user.name)}" required />
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" value="${escapeAttr(user.email)}" required />
          </div>
          <div class="form-group">
            <label>Role</label>
            <input type="text" value="${escapeAttr(user.role)}" disabled />
          </div>
          <hr style="border:none;border-top:1px solid var(--border);margin:1.5rem 0" />
          <p class="text-muted mb-2" style="font-size:0.85rem">Change password (leave blank to keep current)</p>
          <div class="form-group">
            <label for="currentPassword">Current password</label>
            <input type="password" id="currentPassword" name="currentPassword" autocomplete="current-password" />
          </div>
          <div class="form-group">
            <label for="newPassword">New password</label>
            <input type="password" id="newPassword" name="newPassword" autocomplete="new-password" minlength="6" />
          </div>
          <button type="submit" class="btn btn-primary">Save changes</button>
        </form>
      </div>
    `;

    container.querySelector('#profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorEl = container.querySelector('#profile-error');
      const successEl = container.querySelector('#profile-success');
      errorEl.innerHTML = '';
      successEl.innerHTML = '';

      const payload = {
        name: e.target.name.value,
        email: e.target.email.value,
      };

      if (e.target.newPassword.value) {
        payload.currentPassword = e.target.currentPassword.value;
        payload.newPassword = e.target.newPassword.value;
      }

      const btn = e.target.querySelector('button');
      btn.disabled = true;

      try {
        await api.updateProfile(payload);
        successEl.innerHTML = `<div class="alert alert-success">Profile updated successfully</div>`;
        e.target.currentPassword.value = '';
        e.target.newPassword.value = '';
      } catch (err) {
        errorEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      } finally {
        btn.disabled = false;
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
