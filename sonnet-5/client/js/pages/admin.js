// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { el, showMessage, clear } from '../dom.js';
import { apiRequest, ApiError } from '../api.js';
import { getCurrentUser } from '../auth.js';

async function loadUsers(container, query) {
  clear(container);
  container.appendChild(el('p', {}, 'Loading…'));
  try {
    const { users } = await apiRequest(`/api/users?q=${encodeURIComponent(query)}&pageSize=50`);
    clear(container);
    const currentUser = getCurrentUser();

    const rows = users.map((user) => {
      const roleSelect = el(
        'select',
        {
          disabled: user.id === currentUser.id ? 'true' : undefined,
          onchange: async (e) => {
            try {
              await apiRequest(`/api/users/${user.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ role: e.target.value }),
              });
            } catch (err) {
              alert(err instanceof ApiError ? err.message : 'Failed to update role'); // eslint-disable-line no-alert
              loadUsers(container, query);
            }
          },
        },
        [
          el('option', { value: 'user', selected: user.role === 'user' ? 'true' : undefined }, 'user'),
          el('option', { value: 'admin', selected: user.role === 'admin' ? 'true' : undefined }, 'admin'),
        ],
      );

      const toggleActiveButton = el(
        'button',
        {
          disabled: user.id === currentUser.id ? 'true' : undefined,
          onclick: async () => {
            try {
              await apiRequest(`/api/users/${user.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: !user.is_active }),
              });
              loadUsers(container, query);
            } catch (err) {
              alert(err instanceof ApiError ? err.message : 'Failed to update user'); // eslint-disable-line no-alert
            }
          },
        },
        user.is_active ? 'Deactivate' : 'Activate',
      );

      const deleteButton = el(
        'button',
        {
          className: 'danger',
          disabled: user.id === currentUser.id ? 'true' : undefined,
          onclick: async () => {
            if (!confirm(`Delete user ${user.email}?`)) return; // eslint-disable-line no-alert
            try {
              await apiRequest(`/api/users/${user.id}`, { method: 'DELETE' });
              loadUsers(container, query);
            } catch (err) {
              alert(err instanceof ApiError ? err.message : 'Failed to delete user'); // eslint-disable-line no-alert
            }
          },
        },
        'Delete',
      );

      return el('tr', {}, [
        el('td', {}, user.name),
        el('td', {}, user.email),
        el('td', {}, roleSelect),
        el('td', {}, user.is_active ? 'Active' : 'Inactive'),
        el('td', {}, [toggleActiveButton, deleteButton]),
      ]);
    });

    container.appendChild(
      el('table', { className: 'user-table' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Name'), el('th', {}, 'Email'), el('th', {}, 'Role'), el('th', {}, 'Status'), el('th', {}, 'Actions')])),
        el('tbody', {}, rows),
      ]),
    );
  } catch (err) {
    clear(container);
    showMessage(container, err instanceof ApiError ? err.message : 'Failed to load users', 'error');
  }
}

export async function renderAdmin(mount) {
  mount.appendChild(el('h1', {}, 'Manage users'));

  const searchInput = el('input', { type: 'search', placeholder: 'Search by name or email…' });
  const usersContainer = el('div');

  const searchForm = el(
    'form',
    {
      onsubmit: (e) => {
        e.preventDefault();
        loadUsers(usersContainer, searchInput.value);
      },
    },
    [searchInput, el('button', { type: 'submit' }, 'Search')],
  );

  mount.appendChild(searchForm);
  mount.appendChild(usersContainer);
  await loadUsers(usersContainer, '');
}
