import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileMessage('');
    try {
      await api.patch('/users/me', { name, email });
      await refreshUser();
      setProfileMessage('Profile updated');
    } catch (err) {
      setProfileError(err.message);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      navigate('/login');
    } catch (err) {
      setPasswordError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '2rem auto' }}>
      <h1>Profile</h1>

      <form onSubmit={handleProfileSubmit}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {profileError && <p role="alert" style={{ color: 'crimson' }}>{profileError}</p>}
        {profileMessage && <p>{profileMessage}</p>}
        <button type="submit">Save profile</button>
      </form>

      <h2>Change password</h2>
      <form onSubmit={handlePasswordSubmit}>
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>
        {passwordError && <p role="alert" style={{ color: 'crimson' }}>{passwordError}</p>}
        <button type="submit">Change password</button>
      </form>
    </div>
  );
}
