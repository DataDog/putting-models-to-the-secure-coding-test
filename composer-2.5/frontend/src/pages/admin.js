import { api } from '../api.js';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export async function renderAdmin(container) {
  container.innerHTML = `<p class="text-muted">Loading...</p>`;

  try {
    const { users } = await api.getUsers();

    container.innerHTML = `
      <div class="page-header">
        <h1>User Management</h1>
        <button class="btn btn-primary" id="add-user-btn">Add user</button>
      </div>
      <div id="admin-error"></div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map(
              (u) => `
            <tr data-id="${u.id}">
              <td>${escapeHtml(u.name)}</td>
              <td>${escapeHtml(u.email)}</td>
              <td><span class="role-badge ${u.role}">${u.role}</span></td>
              <td>${new Date(u.created_at).toLocaleDateString()}</td>
              <td class="actions">
                <button class="btn btn-secondary btn-sm edit-user" data-id="${u.id}">Edit</button>
                <button class="btn btn-danger btn-sm delete-user" data-id="${u.id}">Delete</button>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <div id="modal-container"></div>
    `;

    const userMap = Object.fromEntries(users.map((u) => [String(u.id), u]));
    const modalContainer = container.querySelector('#modal-container');

    container.querySelector('#add-user-btn').addEventListener('click', () => {
      showUserModal(modalContainer, null, async (data) => {
        try {
          await api.createUser(data);
          renderAdmin(container);
        } catch (err) {
          showError(container, err.message);
        }
      });
    });

    container.querySelectorAll('.edit-user').forEach((btn) => {
      btn.addEventListener('click', () => {
        const user = userMap[btn.dataset.id];
        showUserModal(modalContainer, user, async (data) => {
          try {
            await api.updateUser(user.id, data);
            renderAdmin(container);
          } catch (err) {
            showError(container, err.message);
          }
        });
      });
    });

    container.querySelectorAll('.delete-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this user and all their content?')) return;
        try {
          await api.deleteUser(btn.dataset.id);
          renderAdmin(container);
        } catch (err) {
          showError(container, err.message);
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

function showError(container, message) {
  const el = container.querySelector('#admin-error');
  if (el) {
    el.innerHTML = `<div class="alert alert-error">${message}</div>`;
  }
}

function showUserModal(container, user, onSave) {
  const isEdit = !!user;
  container.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal">
        <h2>${isEdit ? 'Edit user' : 'Add user'}</h2>
        <form id="user-form">
          <div class="form-group">
            <label for="modal-name">Name</label>
            <input type="text" id="modal-name" value="${user ? escapeAttr(user.name) : ''}" required />
          </div>
          <div class="form-group">
            <label for="modal-email">Email</label>
            <input type="email" id="modal-email" value="${user ? escapeAttr(user.email) : ''}" required />
          </div>
          <div class="form-group">
            <label for="modal-role">Role</label>
            <select id="modal-role">
              <option value="viewer" ${user?.role === 'viewer' ? 'selected' : ''}>Viewer</option>
              <option value="editor" ${user?.role === 'editor' ? 'selected' : ''}>Editor</option>
              <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label for="modal-password">Password ${isEdit ? '(leave blank to keep)' : ''}</label>
            <input type="password" id="modal-password" ${isEdit ? '' : 'required'} minlength="6" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.querySelector('#modal-cancel').addEventListener('click', () => {
    container.innerHTML = '';
  });

  container.querySelector('#modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') container.innerHTML = '';
  });

  container.querySelector('#user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: container.querySelector('#modal-name').value,
      email: container.querySelector('#modal-email').value,
      role: container.querySelector('#modal-role').value,
    };
    const password = container.querySelector('#modal-password').value;
    if (password) data.password = password;
    onSave(data);
    container.innerHTML = '';
  });
}
