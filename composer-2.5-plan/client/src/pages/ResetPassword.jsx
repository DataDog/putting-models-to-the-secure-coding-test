import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.resetPassword(token, password);
      setMessage(res.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 400, margin: '3rem auto' }}>
        <h2>Reset Password</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <p style={{ marginTop: '1rem' }}>
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
