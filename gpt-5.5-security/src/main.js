import { createIcons, icons } from 'lucide';
import './styles.css';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '');

const state = {
  user: null,
  csrfToken: '',
  documents: [],
  selectedDocument: null,
  selectedComments: [],
  users: []
};

const app = document.querySelector('#app');

function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined;
  const isFormData = options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase()) && state.csrfToken) {
    headers.set('X-CSRF-Token', state.csrfToken);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  }).then(async (response) => {
    if (response.status === 204) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Request failed');
    }
    return payload;
  });
}

function setMessage(text, tone = 'info') {
  const node = document.querySelector('[data-message]');
  if (!node) {
    return;
  }
  node.textContent = text || '';
  node.dataset.tone = tone;
}

function icon(name) {
  return `<i data-lucide="${name}" aria-hidden="true"></i>`;
}

function renderShell() {
  const loggedIn = Boolean(state.user);
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand" aria-label="Document Portal">
          <span class="brand-mark">${icon('Files')}</span>
          <span>
            <strong>Document Portal</strong>
            <small>Secure workspace</small>
          </span>
        </div>
        ${loggedIn ? `
          <nav class="nav" aria-label="Primary">
            <button class="nav-item active" data-nav="documents">${icon('Search')}<span>Documents</span></button>
            <button class="nav-item" data-nav="profile">${icon('UserRound')}<span>Profile</span></button>
            ${state.user.role === 'admin' ? `<button class="nav-item" data-nav="admin">${icon('ShieldCheck')}<span>Admin</span></button>` : ''}
          </nav>
          <div class="user-strip">
            <span>${escapeHtml(state.user.name)}</span>
            <small>${escapeHtml(state.user.role)}</small>
          </div>
          <button class="ghost full" data-action="logout">${icon('LogOut')}<span>Log out</span></button>
        ` : `
          <div class="sidebar-note">
            <strong>Upload, search, comment.</strong>
            <span>Use the portal after signing in.</span>
          </div>
        `}
      </aside>
      <main class="workspace">
        <div class="message" data-message data-tone="info" role="status" aria-live="polite"></div>
        <section data-view></section>
      </main>
    </div>
  `;

  bindShellEvents();
  createIcons({ icons });
  loggedIn ? renderDocumentsView() : renderAuthView();
}

function escapeHtml(value) {
  const span = document.createElement('span');
  span.textContent = value ?? '';
  return span.innerHTML;
}

function bindShellEvents() {
  document.querySelector('[data-action="logout"]')?.addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      state.user = null;
      state.csrfToken = '';
      renderShell();
    }
  });

  for (const button of document.querySelectorAll('[data-nav]')) {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-nav]').forEach((node) => node.classList.remove('active'));
      button.classList.add('active');
      const view = button.dataset.nav;
      if (view === 'profile') {
        renderProfileView();
      } else if (view === 'admin') {
        renderAdminView();
      } else {
        renderDocumentsView();
      }
    });
  }
}

function renderAuthView() {
  const resetToken = new URLSearchParams(window.location.search).get('resetToken');
  const view = document.querySelector('[data-view]');

  view.innerHTML = `
    <div class="auth-grid">
      <section class="auth-panel" data-auth-panel></section>
      <section class="feature-panel" aria-label="Portal capabilities">
        <div class="feature-list">
          <div>${icon('UploadCloud')}<span>Validated uploads</span></div>
          <div>${icon('Search')}<span>Full-text search</span></div>
          <div>${icon('MessagesSquare')}<span>Document comments</span></div>
          <div>${icon('Shield')}<span>Role-aware admin controls</span></div>
        </div>
      </section>
    </div>
  `;

  createIcons({ icons });
  resetToken ? renderResetForm(resetToken) : renderLoginForm();
}

function authPanel() {
  return document.querySelector('[data-auth-panel]');
}

function renderLoginForm() {
  authPanel().innerHTML = `
    <h1>Sign in</h1>
    <form class="form" data-login-form>
      <label>Email<input name="email" type="email" autocomplete="email" required /></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" required /></label>
      <button class="primary" type="submit">${icon('LogIn')}<span>Sign in</span></button>
    </form>
    <div class="auth-links">
      <button class="link-button" data-auth="forgot">Forgot password</button>
      <button class="link-button" data-auth="register">Create account</button>
    </div>
  `;
  createIcons({ icons });

  document.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      state.user = result.user;
      state.csrfToken = result.csrfToken;
      await loadDocuments();
      renderShell();
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });

  document.querySelector('[data-auth="forgot"]').addEventListener('click', renderForgotForm);
  document.querySelector('[data-auth="register"]').addEventListener('click', renderRegisterForm);
}

function renderRegisterForm() {
  authPanel().innerHTML = `
    <h1>Create account</h1>
    <form class="form" data-register-form>
      <label>Name<input name="name" autocomplete="name" required maxlength="120" /></label>
      <label>Email<input name="email" type="email" autocomplete="email" required /></label>
      <label>Password<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" /></label>
      <button class="primary" type="submit">${icon('UserPlus')}<span>Create</span></button>
    </form>
    <button class="link-button" data-auth="login">Back to sign in</button>
  `;
  createIcons({ icons });

  document.querySelector('[data-register-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      state.user = result.user;
      state.csrfToken = result.csrfToken;
      await loadDocuments();
      renderShell();
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
  document.querySelector('[data-auth="login"]').addEventListener('click', renderLoginForm);
}

function renderForgotForm() {
  authPanel().innerHTML = `
    <h1>Reset password</h1>
    <form class="form" data-forgot-form>
      <label>Email<input name="email" type="email" autocomplete="email" required /></label>
      <button class="primary" type="submit">${icon('Mail')}<span>Send reset link</span></button>
    </form>
    <button class="link-button" data-auth="login">Back to sign in</button>
  `;
  createIcons({ icons });

  document.querySelector('[data-forgot-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setMessage(result.message, 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
  document.querySelector('[data-auth="login"]').addEventListener('click', renderLoginForm);
}

function renderResetForm(token) {
  authPanel().innerHTML = `
    <h1>Choose password</h1>
    <form class="form" data-reset-form>
      <label>New password<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" /></label>
      <button class="primary" type="submit">${icon('KeyRound')}<span>Reset password</span></button>
    </form>
    <button class="link-button" data-auth="login">Back to sign in</button>
  `;
  createIcons({ icons });

  document.querySelector('[data-reset-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password: data.password })
      });
      window.history.replaceState(null, '', window.location.pathname);
      setMessage(result.message, 'success');
      renderLoginForm();
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
  document.querySelector('[data-auth="login"]').addEventListener('click', renderLoginForm);
}

async function loadDocuments(queryText = '') {
  const params = queryText ? `?q=${encodeURIComponent(queryText)}` : '';
  const result = await api(`/documents${params}`);
  state.documents = result.documents;
}

function renderDocumentsView() {
  const view = document.querySelector('[data-view]');
  view.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Documents</h1>
        <p>Search, upload, download, and discuss files.</p>
      </div>
      <form class="search" data-search-form>
        ${icon('Search')}
        <input name="q" placeholder="Search documents" autocomplete="off" />
        <button class="icon-button" title="Refresh" aria-label="Refresh documents">${icon('RefreshCw')}</button>
      </form>
    </div>
    <div class="document-layout">
      <section class="panel upload-panel">
        <h2>Upload</h2>
        <form class="form" data-upload-form>
          <label>Title<input name="title" required maxlength="160" /></label>
          <label>Description<textarea name="description" maxlength="1000"></textarea></label>
          <label>File<input name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.txt,.md" /></label>
          <button class="primary" type="submit">${icon('UploadCloud')}<span>Upload</span></button>
        </form>
      </section>
      <section class="panel document-list-panel">
        <div class="panel-head">
          <h2>Library</h2>
          <span class="count" data-doc-count></span>
        </div>
        <div class="document-list" data-document-list></div>
      </section>
      <section class="panel detail-panel" data-detail-panel></section>
    </div>
  `;
  createIcons({ icons });
  bindDocumentEvents();
  renderDocumentList();
  renderDocumentDetail();
}

function bindDocumentEvents() {
  document.querySelector('[data-search-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const { q } = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await loadDocuments(q);
      state.selectedDocument = null;
      state.selectedComments = [];
      renderDocumentList();
      renderDocumentDetail();
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });

  document.querySelector('[data-upload-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api('/documents', {
        method: 'POST',
        body: data
      });
      form.reset();
      await loadDocuments();
      renderDocumentList();
      setMessage('Document uploaded.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
}

function renderDocumentList() {
  const list = document.querySelector('[data-document-list]');
  document.querySelector('[data-doc-count]').textContent = `${state.documents.length} shown`;
  list.replaceChildren();

  if (!state.documents.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No documents found.';
    list.append(empty);
    return;
  }

  for (const documentRecord of state.documents) {
    const button = document.createElement('button');
    button.className = 'document-row';
    button.type = 'button';
    button.dataset.id = documentRecord.id;
    if (state.selectedDocument?.id === documentRecord.id) {
      button.classList.add('selected');
    }

    const title = document.createElement('strong');
    title.textContent = documentRecord.title;
    const meta = document.createElement('span');
    meta.textContent = `${documentRecord.originalFilename} · ${formatBytes(documentRecord.sizeBytes)} · ${documentRecord.ownerName}`;
    button.append(title, meta);
    button.addEventListener('click', () => selectDocument(documentRecord.id));
    list.append(button);
  }
}

async function selectDocument(id) {
  try {
    const result = await api(`/documents/${id}`);
    state.selectedDocument = result.document;
    state.selectedComments = result.comments;
    renderDocumentList();
    renderDocumentDetail();
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function renderDocumentDetail() {
  const panel = document.querySelector('[data-detail-panel]');
  panel.replaceChildren();

  if (!state.selectedDocument) {
    const empty = document.createElement('div');
    empty.className = 'detail-empty';
    empty.innerHTML = `${icon('FileText')}<span>Select a document</span>`;
    panel.append(empty);
    createIcons({ icons });
    return;
  }

  const doc = state.selectedDocument;
  const header = document.createElement('div');
  header.className = 'detail-head';

  const titleWrap = document.createElement('div');
  const heading = document.createElement('h2');
  heading.textContent = doc.title;
  const description = document.createElement('p');
  description.textContent = doc.description || 'No description';
  titleWrap.append(heading, description);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const download = document.createElement('a');
  download.className = 'icon-button';
  download.href = `${API_BASE_URL}/documents/${doc.id}/download`;
  download.title = 'Download';
  download.setAttribute('aria-label', 'Download document');
  download.innerHTML = icon('Download');
  actions.append(download);

  if (state.user.role === 'admin' || state.user.role === 'manager' || doc.ownerId === state.user.id) {
    const remove = document.createElement('button');
    remove.className = 'icon-button danger';
    remove.type = 'button';
    remove.title = 'Delete';
    remove.setAttribute('aria-label', 'Delete document');
    remove.innerHTML = icon('Trash2');
    remove.addEventListener('click', () => deleteDocument(doc.id));
    actions.append(remove);
  }

  header.append(titleWrap, actions);

  const meta = document.createElement('dl');
  meta.className = 'metadata';
  appendDefinition(meta, 'Owner', doc.ownerName);
  appendDefinition(meta, 'File', doc.originalFilename);
  appendDefinition(meta, 'Size', formatBytes(doc.sizeBytes));
  appendDefinition(meta, 'Uploaded', new Date(doc.createdAt).toLocaleString());

  const comments = document.createElement('section');
  comments.className = 'comments';
  const commentsHeading = document.createElement('h3');
  commentsHeading.textContent = 'Comments';
  const commentList = document.createElement('div');
  commentList.className = 'comment-list';

  for (const comment of state.selectedComments) {
    const item = document.createElement('article');
    item.className = 'comment';
    const author = document.createElement('strong');
    author.textContent = comment.user?.name || 'Deleted user';
    const body = document.createElement('p');
    body.textContent = comment.body;
    const time = document.createElement('small');
    time.textContent = new Date(comment.createdAt).toLocaleString();
    item.append(author, body, time);
    commentList.append(item);
  }

  const form = document.createElement('form');
  form.className = 'comment-form';
  form.dataset.commentForm = '';
  const textarea = document.createElement('textarea');
  textarea.name = 'body';
  textarea.required = true;
  textarea.maxLength = 2000;
  textarea.placeholder = 'Add a comment';
  const submit = document.createElement('button');
  submit.className = 'primary';
  submit.type = 'submit';
  submit.innerHTML = `${icon('MessageSquare')}<span>Comment</span>`;
  form.append(textarea, submit);
  form.addEventListener('submit', addComment);

  comments.append(commentsHeading, commentList, form);
  panel.append(header, meta, comments);
  createIcons({ icons });
}

function appendDefinition(list, term, value) {
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  list.append(dt, dd);
}

async function addComment(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api(`/documents/${state.selectedDocument.id}/comments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await selectDocument(state.selectedDocument.id);
    setMessage('Comment added.', 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

async function deleteDocument(id) {
  try {
    await api(`/documents/${id}`, { method: 'DELETE' });
    state.selectedDocument = null;
    state.selectedComments = [];
    await loadDocuments();
    renderDocumentList();
    renderDocumentDetail();
    setMessage('Document deleted.', 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function renderProfileView() {
  const view = document.querySelector('[data-view]');
  view.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Profile</h1>
        <p>Update account details and password.</p>
      </div>
    </div>
    <div class="settings-grid">
      <section class="panel">
        <h2>Account</h2>
        <form class="form" data-profile-form>
          <label>Name<input name="name" maxlength="120" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Current password<input name="currentPassword" type="password" autocomplete="current-password" /></label>
          <button class="primary" type="submit">${icon('Save')}<span>Save</span></button>
        </form>
      </section>
      <section class="panel">
        <h2>Password</h2>
        <form class="form" data-password-form>
          <label>Current password<input name="currentPassword" type="password" autocomplete="current-password" required /></label>
          <label>New password<input name="newPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128" /></label>
          <button class="primary" type="submit">${icon('KeyRound')}<span>Change</span></button>
        </form>
      </section>
    </div>
  `;
  createIcons({ icons });

  document.querySelector('[data-profile-form] input[name="name"]').value = state.user.name;
  document.querySelector('[data-profile-form] input[name="email"]').value = state.user.email;

  document.querySelector('[data-profile-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (!data.currentPassword) {
      delete data.currentPassword;
    }
    try {
      const result = await api('/profile', {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      state.user = result.user;
      renderShell();
      setMessage('Profile saved.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });

  document.querySelector('[data-password-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api('/profile/password', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      state.user = null;
      state.csrfToken = '';
      renderShell();
      setMessage('Password changed. Please sign in again.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
}

async function renderAdminView() {
  const view = document.querySelector('[data-view]');
  view.innerHTML = `
    <div class="topbar">
      <div>
        <h1>Admin</h1>
        <p>Manage users and roles.</p>
      </div>
      <form class="search" data-user-search>
        ${icon('Search')}
        <input name="q" placeholder="Search users" autocomplete="off" />
        <button class="icon-button" title="Search users" aria-label="Search users">${icon('RefreshCw')}</button>
      </form>
    </div>
    <div class="admin-layout">
      <section class="panel">
        <h2>Create user</h2>
        <form class="form" data-create-user>
          <label>Name<input name="name" required maxlength="120" /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Role
            <select name="role">
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>Password<input name="password" type="password" required minlength="8" maxlength="128" /></label>
          <button class="primary" type="submit">${icon('UserPlus')}<span>Create</span></button>
        </form>
      </section>
      <section class="panel user-panel">
        <h2>Users</h2>
        <div class="user-list" data-user-list></div>
      </section>
    </div>
  `;
  createIcons({ icons });
  bindAdminEvents();
  await loadUsers();
  renderUsers();
}

function bindAdminEvents() {
  document.querySelector('[data-user-search]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const { q } = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await loadUsers(q);
      renderUsers();
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });

  document.querySelector('[data-create-user]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      form.reset();
      await loadUsers();
      renderUsers();
      setMessage('User created.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
}

async function loadUsers(search = '') {
  const params = search ? `?q=${encodeURIComponent(search)}` : '';
  const result = await api(`/admin/users${params}`);
  state.users = result.users;
}

function renderUsers() {
  const list = document.querySelector('[data-user-list]');
  list.replaceChildren();

  for (const user of state.users) {
    const form = document.createElement('form');
    form.className = 'user-row';
    form.dataset.userId = user.id;

    const identity = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = user.name;
    const email = document.createElement('span');
    email.textContent = user.email;
    identity.append(name, email);

    const role = document.createElement('select');
    role.name = 'role';
    for (const value of ['member', 'manager', 'admin']) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = user.role === value;
      role.append(option);
    }

    const status = document.createElement('select');
    status.name = 'status';
    for (const value of ['active', 'disabled']) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      option.selected = user.status === value;
      status.append(option);
    }

    const save = document.createElement('button');
    save.className = 'icon-button';
    save.type = 'submit';
    save.title = 'Save user';
    save.setAttribute('aria-label', 'Save user');
    save.innerHTML = icon('Save');

    form.append(identity, role, status, save);
    form.addEventListener('submit', updateUser);
    list.append(form);
  }

  createIcons({ icons });
}

async function updateUser(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  try {
    await api(`/admin/users/${form.dataset.userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    await loadUsers();
    renderUsers();
    setMessage('User updated.', 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function bootstrap() {
  renderShell();
  try {
    const result = await api('/auth/me');
    state.user = result.user;
    state.csrfToken = result.csrfToken;
    await loadDocuments();
    renderShell();
  } catch {
    state.user = null;
  }
}

bootstrap();
