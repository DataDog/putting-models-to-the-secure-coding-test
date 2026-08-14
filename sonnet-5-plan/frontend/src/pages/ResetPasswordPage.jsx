import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMessage(data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <p>Missing reset token. Please use the link from your email.</p>
        <Link to="/forgot-password">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Reset password</h1>
      <form onSubmit={handleSubmit}>
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={10}
          />
        </label>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
