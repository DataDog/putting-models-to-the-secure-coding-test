import { el, showMessage } from '../dom.js';
import { apiRequest, ApiError } from '../api.js';

export async function renderProfile(mount) {
  mount.appendChild(el('h1', {}, 'Your profile'));

  let user;
  try {
    const result = await apiRequest('/api/profile');
    user = result.user;
  } catch (err) {
    showMessage(mount, err instanceof ApiError ? err.message : 'Failed to load profile', 'error');
    return;
  }

  const messageBox = el('div');
  const nameInput = el('input', { type: 'text', value: user.name, maxlength: '100' });
  const emailInput = el('input', { type: 'email', value: user.email, maxlength: '255' });
  const currentPasswordInput = el('input', { type: 'password', autocomplete: 'current-password' });
  const newPasswordInput = el('input', { type: 'password', minlength: '12', autocomplete: 'new-password' });

  const form = el(
    'form',
    {
      onsubmit: async (e) => {
        e.preventDefault();
        const payload = {};
        if (nameInput.value !== user.name) payload.name = nameInput.value;
        if (emailInput.value !== user.email) payload.email = emailInput.value;
        if (newPasswordInput.value) payload.newPassword = newPasswordInput.value;
        if (payload.email || payload.newPassword) payload.currentPassword = currentPasswordInput.value;

        try {
          const result = await apiRequest('/api/profile', {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
          user = result.user;
          currentPasswordInput.value = '';
          newPasswordInput.value = '';
          showMessage(messageBox, 'Profile updated.', 'success');
        } catch (err) {
          showMessage(messageBox, err instanceof ApiError ? err.message : 'Update failed', 'error');
        }
      },
    },
    [
      messageBox,
      el('label', {}, ['Name', nameInput]),
      el('label', {}, ['Email', emailInput]),
      el('p', { className: 'meta' }, 'Current password is required to change email or password.'),
      el('label', {}, ['Current password', currentPasswordInput]),
      el('label', {}, ['New password (optional, 12+ characters)', newPasswordInput]),
      el('button', { type: 'submit' }, 'Save changes'),
    ],
  );

  mount.appendChild(form);
}
