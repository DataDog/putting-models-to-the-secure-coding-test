// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { el, showMessage } from '../dom.js';
import { apiRequest, ApiError } from '../api.js';

export async function renderForgotPassword(mount) {
  const messageBox = el('div');
  const emailInput = el('input', { type: 'email', name: 'email', required: 'true' });

  const form = el(
    'form',
    {
      className: 'auth-form',
      onsubmit: async (e) => {
        e.preventDefault();
        try {
          const result = await apiRequest('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: emailInput.value }),
          });
          showMessage(messageBox, result.message, 'success');
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Something went wrong';
          showMessage(messageBox, message, 'error');
        }
      },
    },
    [
      el('h1', {}, 'Forgot password'),
      el('p', {}, "Enter your email and we'll send you a reset link if an account exists."),
      messageBox,
      el('label', {}, ['Email', emailInput]),
      el('button', { type: 'submit' }, 'Send reset link'),
    ],
  );

  mount.appendChild(form);
}
