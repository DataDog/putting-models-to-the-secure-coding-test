import { useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export function ProfilePage() {
  const { user, refreshMe, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    setProfileMessage('');
    try {
      await apiRequest('/api/users/me', { method: 'PATCH', body: JSON.stringify({ name, email }) });
      await refreshMe();
      setProfileMessage('Profile updated.');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      await apiRequest('/api/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMessage('Password changed. Please log in again.');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => logout(), 1500);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="page">
      <h1>Profile</h1>

      <section>
        <h2>Edit profile</h2>
        <form onSubmit={handleProfileSubmit}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {profileError && <p className="error">{profileError}</p>}
          {profileMessage && <p className="success">{profileMessage}</p>}
          <button type="submit" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </section>

      <section>
        <h2>Change password</h2>
        <form onSubmit={handlePasswordSubmit}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={10}
            />
          </label>
          {passwordError && <p className="error">{passwordError}</p>}
          {passwordMessage && <p className="success">{passwordMessage}</p>}
          <button type="submit" disabled={savingPassword}>
            {savingPassword ? 'Saving...' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  );
}
