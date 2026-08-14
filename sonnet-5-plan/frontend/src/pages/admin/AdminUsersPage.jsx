import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/admin/users');
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRoleChange(id, role) {
    try {
      await apiRequest(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleDisabled(id, isDisabled) {
    try {
      await apiRequest(`/api/admin/users/${id}/disable`, {
        method: 'PATCH',
        body: JSON.stringify({ isDisabled }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await apiRequest(`/api/admin/users/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="page">
      <h1>Manage users</h1>
      {error && <p className="error">{error}</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={isSelf}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td>{u.isDisabled ? 'Disabled' : 'Active'}</td>
                <td>
                  <button disabled={isSelf} onClick={() => handleToggleDisabled(u.id, !u.isDisabled)}>
                    {u.isDisabled ? 'Enable' : 'Disable'}
                  </button>
                  <button disabled={isSelf} onClick={() => handleDelete(u.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
