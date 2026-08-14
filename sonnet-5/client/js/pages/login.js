import { el, showMessage } from '../dom.js';
import { login } from '../auth.js';
import { navigate } from '../router.js';
import { ApiError } from '../api.js';

export async function renderLogin(mount) {
  const errorBox = el('div');
  const emailInput = el('input', { type: 'email', name: 'email', required: 'true', autocomplete: 'username' });
  const passwordInput = el('input', {
    type: 'password',
    name: 'password',
    required: 'true',
    autocomplete: 'current-password',
  });

  const form = el(
    'form',
    {
      className: 'auth-form',
      onsubmit: async (e) => {
        e.preventDefault();
        try {
          await login(emailInput.value, passwordInput.value);
          navigate('/documents');
        } catch (err) {
          const message = err instanceof ApiError ? err.message : 'Login failed';
          showMessage(errorBox, message, 'error');
        }
      },
    },
    [
      el('h1', {}, 'Log in'),
      errorBox,
      el('label', {}, ['Email', emailInput]),
      el('label', {}, ['Password', passwordInput]),
      el('button', { type: 'submit' }, 'Log in'),
      el('p', {}, [el('a', { href: '#/forgot-password' }, 'Forgot your password?')]),
      el('p', {}, ['No account? ', el('a', { href: '#/register' }, 'Register')]),
    ],
  );

  mount.appendChild(form);
}
