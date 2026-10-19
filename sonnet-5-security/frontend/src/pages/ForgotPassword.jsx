import { useState } from 'react';
import { api } from '../api/client.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.post('/auth/forgot-password', { email });
      // Server always returns the same generic message, whether or not the
      // account exists, so this UI cannot leak account existence either.
      setMessage(data.message);
    } catch {
      setMessage('If an account with that email exists, a password reset link has been sent');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '2rem auto' }}>
      <h1>Forgot password</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
