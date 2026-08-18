// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import { api, setToken, getToken } from './api.js';
import { getRoute, navigate, onRouteChange } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';
import { renderForgotPassword } from './pages/forgot-password.js';
import { renderResetPassword } from './pages/reset-password.js';
import { renderDocuments } from './pages/documents.js';
import { renderDocumentDetail } from './pages/document-detail.js';
import { renderUpload } from './pages/upload.js';
import { renderProfile } from './pages/profile.js';
import { renderAdmin } from './pages/admin.js';

const app = document.getElementById('app');
let currentUser = null;

const publicRoutes = ['login', 'register', 'forgot-password', 'reset-password'];

function renderNavbar(user) {
  if (!user) return '';

  const links = [
    { href: '#/documents', label: 'Documents', route: 'documents' },
  ];

  if (user.role !== 'viewer') {
    links.push({ href: '#/upload', label: 'Upload', route: 'upload' });
  }

  links.push({ href: '#/profile', label: 'Profile', route: 'profile' });

  if (user.role === 'admin') {
    links.push({ href: '#/admin', label: 'Admin', route: 'admin' });
  }

  const route = getRoute();

  return `
    <nav class="navbar">
      <a href="#/documents" class="navbar-brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Document Portal
      </a>
      <ul class="navbar-nav">
        ${links
          .map(
            (l) =>
              `<li><a href="${l.href}" class="${route.name === l.route || (l.route === 'documents' && route.name === 'document-detail') ? 'active' : ''}">${l.label}</a></li>`
          )
          .join('')}
      </ul>
      <div class="navbar-user">
        <span class="role-badge ${user.role}">${user.role}</span>
        <span>${user.name}</span>
        <button class="btn btn-secondary btn-sm" id="logout-btn">Logout</button>
      </div>
    </nav>
  `;
}

async function render() {
  const route = getRoute();

  if (!currentUser && getToken()) {
    try {
      const data = await api.me();
      currentUser = data.user;
    } catch {
      setToken(null);
    }
  }

  if (!currentUser && !publicRoutes.includes(route.name)) {
    navigate('/login');
    return;
  }

  if (currentUser && publicRoutes.includes(route.name)) {
    navigate('/documents');
    return;
  }

  const shell = document.createElement('div');
  shell.className = 'app-shell';

  if (currentUser) {
    shell.innerHTML = renderNavbar(currentUser);
  }

  const content = document.createElement('main');
  content.className = 'main-content';
  content.id = 'page-content';
  shell.appendChild(content);
  app.innerHTML = '';
  app.appendChild(shell);

  shell.querySelector('#logout-btn')?.addEventListener('click', async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    currentUser = null;
    navigate('/login');
  });

  const ctx = {
    user: currentUser,
    params: route.params,
    query: route.query,
    onLogin: (user) => {
      currentUser = user;
    },
  };

  switch (route.name) {
    case 'login':
      renderLogin(content, ctx);
      break;
    case 'register':
      renderRegister(content, ctx);
      break;
    case 'forgot-password':
      renderForgotPassword(content);
      break;
    case 'reset-password':
      renderResetPassword(content, ctx);
      break;
    case 'documents':
      await renderDocuments(content, ctx);
      break;
    case 'document-detail':
      await renderDocumentDetail(content, ctx);
      break;
    case 'upload':
      if (currentUser.role === 'viewer') {
        navigate('/documents');
        return;
      }
      renderUpload(content);
      break;
    case 'profile':
      await renderProfile(content);
      break;
    case 'admin':
      if (currentUser.role !== 'admin') {
        navigate('/documents');
        return;
      }
      await renderAdmin(content);
      break;
    default:
      navigate('/documents');
  }
}

render();
onRouteChange(render);

// Default route
if (!window.location.hash) {
  navigate('/');
}
