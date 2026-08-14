import { useState } from 'react';
import { api } from '../api.js';

export default function ResetPasswordPage({ token }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const data = await api.resetPassword(token, password);
      setMessage(`${data.message} You can now log in.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-layout">
      <section className="panel narrow">
        <p className="eyebrow">Password reset</p>
        <h1>Set a new password</h1>
        <form className="stack" onSubmit={submit}>
          <label>
            New password
            <input
              type="password"
              value={password}
              minLength={10}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit">Reset password</button>
        </form>
        {error ? <div className="error">{error}</div> : null}
        {message ? <div className="success">{message}</div> : null}
      </section>
    </main>
  );
}
