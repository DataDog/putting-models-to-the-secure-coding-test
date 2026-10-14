import { api, setToken, getToken, formatBytes, formatDate, toast } from './api.js';

let currentUser = null;

const main = document.getElementById('main');
const header = document.getElementById('header');
const userGreeting = document.getElementById('user-greeting');
const adminLink = document.getElementById('admin-link');
const logoutBtn = document.getElementById('logout-btn');

function setActiveNav(route) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.classList.toggle('active', el.dataset.nav === route);
  });
}

function showHeader(user) {
  header.hidden = false;
  userGreeting.textContent = user.name;
  adminLink.hidden = user.role !== 'admin';
}

function hideHeader() {
  header.hidden = true;
}

function render(html) {
  main.innerHTML = html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Auth views ───────────────────────────────────────────────

function loginView() {
  hideHeader();
  setActiveNav('');
  render(`
    <div class="card auth-card">
      <h1>Sign in</h1>
      <p class="subtitle">Access your document portal account</p>
      <div id="auth-error"></div>
      <form id="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required autocomplete="current-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Sign in</button>
      </form>
      <p class="link-row"><a href="#/forgot-password">Forgot password?</a></p>
      <p class="link-row">No account? <a href="#/register">Register</a></p>
    </div>
  `);

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('auth-error');
    errorEl.innerHTML = '';
    try {
      const { user, token } = await api.login(
        document.getElementById('email').value,
        document.getElementById('password').value
      );
      setToken(token);
      currentUser = user;
      location.hash = '#/';
    } catch (err) {
      errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
    }
  });
}

function registerView() {
  hideHeader();
  render(`
    <div class="card auth-card">
      <h1>Create account</h1>
      <p class="subtitle">Join the document portal</p>
      <div id="auth-error"></div>
      <form id="register-form">
        <div class="form-group">
          <label for="name">Full name</label>
          <input type="text" id="name" required autocomplete="name" />
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required minlength="8" autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Register</button>
      </form>
      <p class="link-row">Already have an account? <a href="#/login">Sign in</a></p>
    </div>
  `);

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('auth-error');
    errorEl.innerHTML = '';
    try {
      const { user, token } = await api.register(
        document.getElementById('email').value,
        document.getElementById('password').value,
        document.getElementById('name').value
      );
      setToken(token);
      currentUser = user;
      toast('Account created!', 'success');
      location.hash = '#/';
    } catch (err) {
      errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
    }
  });
}

function forgotPasswordView() {
  hideHeader();
  render(`
    <div class="card auth-card">
      <h1>Forgot password</h1>
      <p class="subtitle">Enter your email and we'll send a reset link</p>
      <div id="auth-error"></div>
      <div id="auth-success"></div>
      <form id="forgot-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required autocomplete="email" />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Send reset link</button>
      </form>
      <p class="link-row"><a href="#/login">Back to sign in</a></p>
    </div>
  `);

  document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    errorEl.innerHTML = '';
    successEl.innerHTML = '';
    try {
      const { message } = await api.forgotPassword(document.getElementById('email').value);
      successEl.innerHTML = `<div class="success-msg">${escapeHtml(message)}</div>`;
      document.getElementById('forgot-form').reset();
    } catch (err) {
      errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
    }
  });
}

function resetPasswordView(token) {
  hideHeader();
  render(`
    <div class="card auth-card">
      <h1>Reset password</h1>
      <p class="subtitle">Choose a new password for your account</p>
      <div id="auth-error"></div>
      <div id="auth-success"></div>
      <form id="reset-form">
        <div class="form-group">
          <label for="password">New password</label>
          <input type="password" id="password" required minlength="8" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label for="confirm">Confirm password</label>
          <input type="password" id="confirm" required minlength="8" autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary btn-block">Reset password</button>
      </form>
      <p class="link-row"><a href="#/login">Back to sign in</a></p>
    </div>
  `);

  document.getElementById('reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    errorEl.innerHTML = '';
    successEl.innerHTML = '';

    if (password !== confirm) {
      errorEl.innerHTML = '<div class="error-msg">Passwords do not match</div>';
      return;
    }

    try {
      const { message } = await api.resetPassword(token, password);
      successEl.innerHTML = `<div class="success-msg">${escapeHtml(message)}</div>`;
      setTimeout(() => { location.hash = '#/login'; }, 2000);
    } catch (err) {
      errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
    }
  });
}

// ─── Documents ──────────────────────────────────────────────

let currentPage = 1;
let currentQuery = '';

async function documentsView() {
  if (!currentUser) return loginView();
  showHeader(currentUser);
  setActiveNav('documents');

  const canUpload = currentUser.role === 'admin' || currentUser.role === 'user';

  render(`
    <div class="page-header">
      <h1>Documents</h1>
      <div class="search-bar">
        <input type="search" id="search-input" placeholder="Search documents..." value="${escapeHtml(currentQuery)}" />
        <button class="btn btn-ghost" id="search-btn">Search</button>
      </div>
      ${canUpload ? '<button class="btn btn-primary" id="upload-btn">Upload</button>' : ''}
    </div>
    <div id="doc-list"><p class="empty-state">Loading...</p></div>
    <div id="pagination"></div>
  `);

  document.getElementById('search-btn').addEventListener('click', () => {
    currentQuery = document.getElementById('search-input').value;
    currentPage = 1;
    loadDocuments();
  });

  document.getElementById('search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentQuery = e.target.value;
      currentPage = 1;
      loadDocuments();
    }
  });

  if (canUpload) {
    document.getElementById('upload-btn').addEventListener('click', showUploadModal);
  }

  await loadDocuments();
}

async function loadDocuments() {
  const listEl = document.getElementById('doc-list');
  const paginationEl = document.getElementById('pagination');

  try {
    const params = { page: currentPage, limit: 20 };
    if (currentQuery) params.q = currentQuery;

    const { documents, pagination } = await api.getDocuments(params);

    if (documents.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No documents found.</p>';
    } else {
      listEl.innerHTML = `<div class="doc-grid">${documents.map((doc) => `
        <div class="doc-item" data-id="${doc.id}">
          <div class="doc-info">
            <h3>${escapeHtml(doc.original_name)}</h3>
            <p class="doc-meta">
              ${formatBytes(doc.size_bytes)} &middot;
              ${escapeHtml(doc.uploader_name)} &middot;
              ${formatDate(doc.created_at)}
            </p>
            ${doc.description ? `<p class="doc-meta">${escapeHtml(doc.description)}</p>` : ''}
          </div>
          <div class="doc-actions">
            <button class="btn btn-ghost btn-sm" data-download="${doc.id}" data-name="${escapeHtml(doc.original_name)}">Download</button>
          </div>
        </div>
      `).join('')}</div>`;

      listEl.querySelectorAll('.doc-item').forEach((el) => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('[data-download]')) return;
          location.hash = `#/documents/${el.dataset.id}`;
        });
      });

      listEl.querySelectorAll('[data-download]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await api.downloadDocument(btn.dataset.download, btn.dataset.name);
          } catch {
            toast('Download failed', 'error');
          }
        });
      });
    }

    const totalPages = Math.ceil(pagination.total / pagination.limit);
    if (totalPages > 1) {
      paginationEl.innerHTML = `
        <div class="pagination">
          <button class="btn btn-ghost btn-sm" id="prev-page" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
          <span>Page ${currentPage} of ${totalPages}</span>
          <button class="btn btn-ghost btn-sm" id="next-page" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      `;
      document.getElementById('prev-page')?.addEventListener('click', () => { currentPage--; loadDocuments(); });
      document.getElementById('next-page')?.addEventListener('click', () => { currentPage++; loadDocuments(); });
    } else {
      paginationEl.innerHTML = '';
    }
  } catch (err) {
    listEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
  }
}

function showUploadModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>Upload document</h2>
      <div id="upload-error"></div>
      <form id="upload-form">
        <div class="form-group">
          <label for="file">File (max 10 MB)</label>
          <input type="file" id="file" required
            accept=".pdf,.txt,.md,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif" />
        </div>
        <div class="form-group">
          <label for="description">Description (optional)</label>
          <textarea id="description" placeholder="Brief description for search..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="cancel-upload">Cancel</button>
          <button type="submit" class="btn btn-primary">Upload</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#cancel-upload').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = overlay.querySelector('#upload-error');
    errorEl.innerHTML = '';

    const formData = new FormData();
    formData.append('file', document.getElementById('file').files[0]);
    formData.append('description', document.getElementById('description').value);

    try {
      await api.uploadDocument(formData);
      overlay.remove();
      toast('Document uploaded', 'success');
      loadDocuments();
    } catch (err) {
      errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
    }
  });
}

async function documentDetailView(id) {
  if (!currentUser) return loginView();
  showHeader(currentUser);
  setActiveNav('documents');

  render('<p class="empty-state">Loading...</p>');

  try {
    const [{ document: doc }, { comments }] = await Promise.all([
      api.getDocument(id),
      api.getComments(id),
    ]);

    const canDelete = doc.user_id === currentUser.id || currentUser.role === 'admin';

    render(`
      <a href="#/" style="font-size:0.85rem;color:var(--text-muted)">&larr; Back to documents</a>
      <div class="detail-header" style="margin-top:1rem">
        <h1>${escapeHtml(doc.original_name)}</h1>
        <p class="detail-meta">
          ${formatBytes(doc.size_bytes)} &middot;
          ${escapeHtml(doc.uploader_name)} &middot;
          ${formatDate(doc.created_at)}
        </p>
        ${doc.description ? `<p style="margin-top:0.5rem">${escapeHtml(doc.description)}</p>` : ''}
        <div style="margin-top:1rem;display:flex;gap:0.5rem">
          <button class="btn btn-primary btn-sm" id="download-btn">Download</button>
          ${canDelete ? '<button class="btn btn-danger btn-sm" id="delete-btn">Delete</button>' : ''}
        </div>
      </div>

      <div class="comments-section">
        <h2>Comments (${comments.length})</h2>
        <form id="comment-form" style="margin:1rem 0">
          <div class="form-group">
            <textarea id="comment-input" placeholder="Add a comment..." required></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-sm">Post comment</button>
        </form>
        <div id="comments-list">
          ${comments.length === 0
            ? '<p class="empty-state">No comments yet.</p>'
            : comments.map((c) => `
              <div class="comment" data-comment-id="${c.id}">
                <div class="comment-header">
                  <span>${escapeHtml(c.author_name)}</span>
                  <span>
                    ${formatDate(c.created_at)}
                    ${(c.author_id === currentUser.id || currentUser.role === 'admin')
                      ? `<button class="btn btn-ghost btn-sm delete-comment" data-id="${c.id}" style="margin-left:0.5rem;padding:0.1rem 0.4rem">Delete</button>`
                      : ''}
                  </span>
                </div>
                <div class="comment-body">${escapeHtml(c.content)}</div>
              </div>
            `).join('')}
        </div>
      </div>
    `);

    document.getElementById('download-btn').addEventListener('click', () =>
      api.downloadDocument(id, doc.original_name)
    );

    if (canDelete) {
      document.getElementById('delete-btn').addEventListener('click', async () => {
        if (!confirm('Delete this document?')) return;
        try {
          await api.deleteDocument(id);
          toast('Document deleted', 'success');
          location.hash = '#/';
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }

    document.getElementById('comment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('comment-input');
      try {
        await api.addComment(id, input.value);
        toast('Comment posted', 'success');
        documentDetailView(id);
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    document.querySelectorAll('.delete-comment').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api.deleteComment(id, btn.dataset.id);
          toast('Comment deleted', 'success');
          documentDetailView(id);
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    render(`<div class="error-msg">${escapeHtml(err.message)}</div>`);
  }
}

// ─── Profile ────────────────────────────────────────────────

async function profileView() {
  if (!currentUser) return loginView();
  showHeader(currentUser);
  setActiveNav('profile');

  render(`
    <div class="card" style="max-width:520px">
      <h1>Profile</h1>
      <p class="subtitle">Manage your account settings</p>
      <div id="profile-error"></div>
      <div id="profile-success"></div>
      <form id="profile-form">
        <div class="form-group">
          <label>Email</label>
          <input type="email" value="${escapeHtml(currentUser.email)}" disabled />
        </div>
        <div class="form-group">
          <label>Role</label>
          <input type="text" value="${escapeHtml(currentUser.role)}" disabled />
        </div>
        <div class="form-group">
          <label for="name">Display name</label>
          <input type="text" id="name" value="${escapeHtml(currentUser.name)}" required />
        </div>
        <div class="form-group">
          <label for="bio">Bio</label>
          <textarea id="bio">${escapeHtml(currentUser.bio || '')}</textarea>
        </div>
        <hr style="border:none;border-top:1px solid var(--border);margin:1.5rem 0" />
        <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:1rem">Change password (leave blank to keep current)</p>
        <div class="form-group">
          <label for="current-password">Current password</label>
          <input type="password" id="current-password" autocomplete="current-password" />
        </div>
        <div class="form-group">
          <label for="new-password">New password</label>
          <input type="password" id="new-password" minlength="8" autocomplete="new-password" />
        </div>
        <button type="submit" class="btn btn-primary">Save changes</button>
      </form>
    </div>
  `);

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');
    errorEl.innerHTML = '';
    successEl.innerHTML = '';

    const data = {
      name: document.getElementById('name').value,
      bio: document.getElementById('bio').value,
    };

    const newPassword = document.getElementById('new-password').value;
    if (newPassword) {
      data.currentPassword = document.getElementById('current-password').value;
      data.newPassword = newPassword;
    }

    try {
      const { user } = await api.updateProfile(data);
      currentUser = user;
      showHeader(currentUser);
      successEl.innerHTML = '<div class="success-msg">Profile updated successfully.</div>';
    } catch (err) {
      errorEl.innerHTML = `<div class="error-msg">${escapeHtml(err.message)}</div>`;
    }
  });
}

// ─── Admin ──────────────────────────────────────────────────

async function adminView() {
  if (!currentUser) return loginView();
  if (currentUser.role !== 'admin') {
    toast('Admin access required', 'error');
    return documentsView();
  }

  showHeader(currentUser);
  setActiveNav('admin');

  render('<p class="empty-state">Loading users...</p>');

  try {
    const { users } = await api.getUsers();

    render(`
      <div class="page-header">
        <h1>User management</h1>
      </div>
      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((u) => `
              <tr data-user-id="${u.id}">
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>
                  <select class="role-select" data-id="${u.id}" ${u.id === currentUser.id ? 'disabled' : ''}>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                  </select>
                </td>
                <td>${formatDate(u.created_at)}</td>
                <td>
                  ${u.id !== currentUser.id
                    ? `<button class="btn btn-danger btn-sm delete-user" data-id="${u.id}">Delete</button>`
                    : '<span style="color:var(--text-muted);font-size:0.8rem">You</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `);

    document.querySelectorAll('.role-select').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          await api.updateUser(select.dataset.id, { role: select.value });
          toast('Role updated', 'success');
        } catch (err) {
          toast(err.message, 'error');
          adminView();
        }
      });
    });

    document.querySelectorAll('.delete-user').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this user and all their documents?')) return;
        try {
          await api.deleteUser(btn.dataset.id);
          toast('User deleted', 'success');
          adminView();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    render(`<div class="error-msg">${escapeHtml(err.message)}</div>`);
  }
}

// ─── Router ─────────────────────────────────────────────────

async function router() {
  const hash = location.hash.slice(2) || '/';
  const [route, ...params] = hash.split('/');

  if (route === 'login') return loginView();
  if (route === 'register') return registerView();
  if (route === 'forgot-password') return forgotPasswordView();

  if (route === 'reset-password') {
    const token = new URLSearchParams(location.hash.split('?')[1] || '').get('token');
    return resetPasswordView(token);
  }

  if (!currentUser && getToken()) {
    try {
      const { user } = await api.me();
      currentUser = user;
    } catch {
      setToken(null);
      return loginView();
    }
  }

  if (!currentUser) return loginView();

  if (route === 'documents' && params[0]) return documentDetailView(params[0]);
  if (route === 'profile') return profileView();
  if (route === 'admin') return adminView();
  return documentsView();
}

logoutBtn.addEventListener('click', async () => {
  try { await api.logout(); } catch { /* ignore */ }
  setToken(null);
  currentUser = null;
  location.hash = '#/login';
});

window.addEventListener('hashchange', router);
router();
