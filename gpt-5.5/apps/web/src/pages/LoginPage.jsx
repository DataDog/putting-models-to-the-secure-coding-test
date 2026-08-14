import { useState } from 'react';
import { api } from '../api.js';

export default function LoginPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const data =
        mode === 'login'
          ? await api.login({ email: form.email, password: form.password })
          : await api.register({
              email: form.email,
              password: form.password,
              name: form.name
            });
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function forgotPassword(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const data = await api.forgotPassword(forgotEmail);
      setMessage(data.resetUrl ? `${data.message} Dev reset URL: ${data.resetUrl}` : data.message);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-layout">
      <section className="hero-card">
        <p className="eyebrow">Document Portal</p>
        <h1>Upload, search, and discuss documents in one place.</h1>
        <p>
          JWT-backed session cookies protect the portal. Admin users can manage user roles
          and deactivate accounts.
        </p>
      </section>

      <section className="panel">
        <div className="auth-switch">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="stack">
          {mode === 'register' ? (
            <label>
              Name
              <input name="name" value={form.name} onChange={updateField} required />
            </label>
          ) : null}
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              required
            />
          </label>
          <button type="submit">{mode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>

        <form onSubmit={forgotPassword} className="forgot-form">
          <h2>Forgot password</h2>
          <label>
            Email
            <input
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              required
            />
          </label>
          <button className="secondary" type="submit">
            Generate reset link
          </button>
        </form>

        {error ? <div className="error">{error}</div> : null}
        {message ? <div className="success">{message}</div> : null}
      </section>
    </main>
  );
}
