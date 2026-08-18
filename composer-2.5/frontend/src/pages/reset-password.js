// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { api } from '../api.js';
import { navigate } from '../router.js';

export function renderResetPassword(container, { query }) {
  const token = query.token;

  if (!token) {
    container.innerHTML = `
      <div class="auth-container">
        <div class="auth-card">
          <div class="alert alert-error">Invalid reset link. Please request a new one.</div>
          <div class="auth-footer"><a href="#/forgot-password">Request reset link</a></div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Reset password</h1>
        <p class="subtitle">Enter your new password</p>
        <div id="reset-error"></div>
        <div id="reset-success"></div>
        <form id="reset-form">
          <div class="form-group">
            <label for="password">New password</label>
            <input type="password" id="password" name="password" required minlength="6" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label for="confirm">Confirm password</label>
            <input type="password" id="confirm" name="confirm" required minlength="6" autocomplete="new-password" />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Reset password</button>
        </form>
      </div>
    </div>
  `;

  container.querySelector('#reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = container.querySelector('#reset-error');
    const successEl = container.querySelector('#reset-success');
    errorEl.innerHTML = '';
    successEl.innerHTML = '';

    if (e.target.password.value !== e.target.confirm.value) {
      errorEl.innerHTML = `<div class="alert alert-error">Passwords do not match</div>`;
      return;
    }

    const btn = e.target.querySelector('button');
    btn.disabled = true;

    try {
      const data = await api.resetPassword(token, e.target.password.value);
      successEl.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      errorEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}
