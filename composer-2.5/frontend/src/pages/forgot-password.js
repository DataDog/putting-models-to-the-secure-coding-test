import { api } from '../api.js';

export function renderForgotPassword(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Forgot password</h1>
        <p class="subtitle">Enter your email and we'll send a reset link</p>
        <div id="forgot-error"></div>
        <div id="forgot-success"></div>
        <form id="forgot-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Send reset link</button>
        </form>
        <div class="auth-footer">
          <a href="#/login">Back to sign in</a>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = container.querySelector('#forgot-error');
    const successEl = container.querySelector('#forgot-success');
    errorEl.innerHTML = '';
    successEl.innerHTML = '';
    const btn = e.target.querySelector('button');
    btn.disabled = true;

    try {
      const data = await api.forgotPassword(e.target.email.value);
      successEl.innerHTML = `<div class="alert alert-success">${data.message}</div>`;
      e.target.reset();
    } catch (err) {
      errorEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    } finally {
      btn.disabled = false;
    }
  });
}
