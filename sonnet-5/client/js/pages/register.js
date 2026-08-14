import { el, showMessage } from '../dom.js';
import { register } from '../auth.js';
import { navigate } from '../router.js';
import { ApiError } from '../api.js';

export async function renderRegister(mount) {
  const errorBox = el('div');
  const nameInput = el('input', { type: 'text', name: 'name', required: 'true', maxlength: '100' });
  const emailInput = el('input', { type: 'email', name: 'email', required: 'true', autocomplete: 'username' });
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
          await register(emailInput.value, passwordInput.value, nameInput.value);
          navigate('/documents');
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Registration failed';
          showMessage(errorBox, message, 'error');
        }
      },
    },
    [
      el('h1', {}, 'Create an account'),
      errorBox,
      el('label', {}, ['Name', nameInput]),
      el('label', {}, ['Email', emailInput]),
      el('label', {}, ['Password (12+ characters)', passwordInput]),
      el('button', { type: 'submit' }, 'Register'),
      el('p', {}, ['Already have an account? ', el('a', { href: '#/login' }, 'Log in')]),
    ],
  );

  mount.appendChild(form);
}
