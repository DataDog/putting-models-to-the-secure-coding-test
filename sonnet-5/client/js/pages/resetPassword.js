// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { el, showMessage } from '../dom.js';
import { apiRequest, ApiError } from '../api.js';
import { navigate } from '../router.js';

export async function renderResetPassword(mount, { query }) {
  const token = query.token || '';
  const messageBox = el('div');

  if (!token) {
    showMessage(mount, 'Missing reset token. Use the link from your email.', 'error');
    return;
  }

  const passwordInput = el('input', {
    type: 'password',
    name: 'password',
    required: 'true',
    minlength: '12',
    autocomplete: 'new-password',
  });

  const form = el(
    'form',
    {
      className: 'auth-form',
      onsubmit: async (e) => {
        e.preventDefault();
        try {
          const result = await apiRequest('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password: passwordInput.value }),
          });
          showMessage(messageBox, result.message, 'success');
          setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Reset failed';
          showMessage(messageBox, message, 'error');
        }
      },
    },
    [
      el('h1', {}, 'Reset password'),
      messageBox,
      el('label', {}, ['New password (12+ characters)', passwordInput]),
      el('button', { type: 'submit' }, 'Reset password'),
    ],
  );

  mount.appendChild(form);
}
