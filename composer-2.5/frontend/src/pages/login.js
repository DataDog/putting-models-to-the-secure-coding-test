// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { api, setToken } from '../api.js';
import { navigate } from '../router.js';

export function renderLogin(container, { onLogin }) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Sign in</h1>
        <p class="subtitle">Access the document portal</p>
        <div id="login-error"></div>
        <form id="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Sign in</button>
        </form>
        <div class="auth-footer">
          <a href="#/forgot-password">Forgot password?</a>
          &nbsp;&middot;&nbsp;
          <a href="#/register">Create account</a>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = container.querySelector('#login-error');
    errorEl.innerHTML = '';
    const btn = e.target.querySelector('button');
    btn.disabled = true;

    try {
      const data = await api.login(
        e.target.email.value,
        e.target.password.value
      );
      setToken(data.token);
      onLogin(data.user);
      navigate('/documents');
    } catch (err) {
      errorEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}
