import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AdminPage({ currentUser, setError }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await api.users();
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateUser(user, patch) {
    setError('');

    try {
      const data = await api.updateUser(user.id, patch);
      setUsers((current) =>
        current.map((item) => (item.id === data.user.id ? data.user : item))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel">
      <p className="eyebrow">Admin</p>
      <h2>User management</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(event) => updateUser(user, { role: event.target.value })}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <button
                    className={user.is_active ? 'secondary' : 'danger'}
                    disabled={user.id === currentUser.id}
                    onClick={() => updateUser(user, { isActive: !user.is_active })}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
