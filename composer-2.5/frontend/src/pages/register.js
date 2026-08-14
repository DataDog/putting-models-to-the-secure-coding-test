import { api, setToken } from '../api.js';
import { navigate } from '../router.js';

export function renderRegister(container, { onLogin }) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <h1>Create account</h1>
        <p class="subtitle">Register for the document portal</p>
        <div id="register-error"></div>
        <form id="register-form">
          <div class="form-group">
            <label for="name">Full name</label>
            <input type="text" id="name" name="name" required autocomplete="name" />
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required minlength="6" autocomplete="new-password" />
          </div>
          <button type="submit" class="btn btn-primary btn-block">Create account</button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="#/login">Sign in</a>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = container.querySelector('#register-error');
    errorEl.innerHTML = '';
    const btn = e.target.querySelector('button');
    btn.disabled = true;

    try {
      const data = await api.register(
        e.target.email.value,
        e.target.password.value,
        e.target.name.value
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
