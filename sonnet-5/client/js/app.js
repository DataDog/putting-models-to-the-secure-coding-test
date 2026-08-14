import { el, clear } from './dom.js';
import { registerRoute, setNotFound, startRouter, navigate } from './router.js';
import { getCurrentUser, onAuthChange, refreshCurrentUser, logout } from './auth.js';
import { apiRequest } from './api.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderForgotPassword } from './pages/forgotPassword.js';
import { renderResetPassword } from './pages/resetPassword.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderDocumentDetail } from './pages/documentDetail.js';
import { renderProfile } from './pages/profile.js';
import { renderAdmin } from './pages/admin.js';

const appMount = document.getElementById('app');
const navMount = document.getElementById('nav');

function guardAuthenticated(render) {
  return async (mount, ctx) => {
    if (!getCurrentUser()) {
      navigate('/login');
      return;
    }
    await render(mount, ctx);
  };
}

function guardAdmin(render) {
  return async (mount, ctx) => {
    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      mount.appendChild(el('p', {}, 'You do not have access to this page.'));
      return;
    }
    await render(mount, ctx);
  };
}

registerRoute('/login', renderLogin);
registerRoute('/register', renderRegister);
registerRoute('/forgot-password', renderForgotPassword);
registerRoute('/reset-password', renderResetPassword);
registerRoute('/documents', guardAuthenticated(renderDashboard));
registerRoute('/documents/:id', guardAuthenticated(renderDocumentDetail));
registerRoute('/profile', guardAuthenticated(renderProfile));
registerRoute('/admin', guardAdmin(renderAdmin));
registerRoute('/', async (mount) => {
  navigate(getCurrentUser() ? '/documents' : '/login');
});
setNotFound((mount) => mount.appendChild(el('p', {}, 'Page not found.')));

function renderNav() {
  clear(navMount);
  const user = getCurrentUser();

  if (!user) {
    navMount.appendChild(
      el('nav', {}, [el('a', { href: '#/login' }, 'Log in'), el('a', { href: '#/register' }, 'Register')]),
    );
    return;
  }

  const links = [
    el('a', { href: '#/documents' }, 'Documents'),
    el('a', { href: '#/profile' }, 'Profile'),
  ];
  if (user.role === 'admin') {
    links.push(el('a', { href: '#/admin' }, 'Admin'));
  }
  links.push(
    el(
      'button',
      {
        className: 'link-button',
        onclick: async () => {
          await logout();
          navigate('/login');
        },
      },
      'Log out',
    ),
  );

  navMount.appendChild(el('nav', {}, [el('span', {}, `Signed in as ${user.name}`), ...links]));
}

onAuthChange(() => {
  renderNav();
});

async function bootstrap() {
  // Seeds the CSRF cookie before any state-changing request is made.
  await apiRequest('/api/health').catch(() => null);
  await refreshCurrentUser();
  await startRouter(appMount);
}

bootstrap();
