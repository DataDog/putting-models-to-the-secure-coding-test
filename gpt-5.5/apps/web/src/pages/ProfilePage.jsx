import { useState } from 'react';
import { api } from '../api.js';

export default function ProfilePage({ user, onUserChange, setError }) {
  const [form, setForm] = useState({
    name: user.name,
    bio: user.bio || '',
    currentPassword: '',
    newPassword: ''
  });
  const [message, setMessage] = useState('');

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
      const data = await api.updateProfile(form);
      onUserChange(data.user);
      setForm((current) => ({
        ...current,
        currentPassword: '',
        newPassword: ''
      }));
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel narrow">
      <p className="eyebrow">Profile</p>
      <h2>Edit your account</h2>
      <form className="stack" onSubmit={submit}>
        <label>
          Name
          <input name="name" value={form.name} onChange={updateField} required />
        </label>
        <label>
          Bio
          <textarea name="bio" value={form.bio} onChange={updateField} />
        </label>
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={updateField}
          />
        </label>
        <label>
          New password
          <input
            name="newPassword"
            type="password"
            value={form.newPassword}
            minLength={10}
            onChange={updateField}
          />
        </label>
        <button type="submit">Save profile</button>
      </form>
      {message ? <div className="success">{message}</div> : null}
    </section>
  );
}
