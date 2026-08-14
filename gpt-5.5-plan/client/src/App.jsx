import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  LogOut,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  Shield,
  Upload,
  User
} from "lucide-react";
import { apiRequest, downloadFile } from "./api.js";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function Alert({ error, notice }) {
  if (!error && !notice) return null;

  return (
    <div className={error ? "alert alert-error" : "alert alert-notice"}>
      {error || notice}
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (mode === "forgot") {
        const data = await apiRequest("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: form.email })
        });
        setNotice(data.message);
        return;
      }

      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const body =
        mode === "register"
          ? { email: form.email, fullName: form.fullName, password: form.password }
          : { email: form.email, password: form.password };
      const data = await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(body)
      });

      onAuthenticated(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-lockup">
          <FileText size={32} aria-hidden="true" />
          <div>
            <h1>Document Portal</h1>
            <p>{mode === "forgot" ? "Reset access" : "Secure workspace"}</p>
          </div>
        </div>

        <div className="segmented" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Register
          </button>
          <button
            type="button"
            className={mode === "forgot" ? "active" : ""}
            onClick={() => setMode("forgot")}
          >
            Forgot
          </button>
        </div>

        <Alert error={error} notice={notice} />

        <form className="stack" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Full name
              <input
                name="fullName"
                autoComplete="name"
                value={form.fullName}
                onChange={updateField}
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </label>
          {mode !== "forgot" && (
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={form.password}
                onChange={updateField}
                minLength={8}
                required
              />
            </label>
          )}
          <button className="primary-action" disabled={busy}>
            {busy ? "Working" : mode === "forgot" ? "Send reset link" : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}

function ResetPasswordScreen() {
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      setNotice("Password updated. You can log in with the new password.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-lockup">
          <FileText size={32} aria-hidden="true" />
          <div>
            <h1>Document Portal</h1>
            <p>Password reset</p>
          </div>
        </div>
        <Alert error={error} notice={notice} />
        <form className="stack" onSubmit={submit}>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="primary-action" disabled={busy || !token}>
            {busy ? "Working" : "Reset password"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Shell({ user, currentView, onViewChange, onLogout, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup compact">
          <FileText size={28} aria-hidden="true" />
          <div>
            <h1>Document Portal</h1>
            <p>{user.role}</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <button
            className={currentView === "documents" ? "active" : ""}
            onClick={() => onViewChange("documents")}
          >
            <FileText size={18} aria-hidden="true" />
            Documents
          </button>
          <button
            className={currentView === "profile" ? "active" : ""}
            onClick={() => onViewChange("profile")}
          >
            <User size={18} aria-hidden="true" />
            Profile
          </button>
          {user.role === "admin" && (
            <button
              className={currentView === "admin" ? "active" : ""}
              onClick={() => onViewChange("admin")}
            >
              <Shield size={18} aria-hidden="true" />
              Admin
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </div>
          <button className="icon-label-button" onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>
      {children}
    </div>
  );
}

function DocumentsView() {
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [comment, setComment] = useState("");
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    file: null
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadDocuments(nextSearch = search) {
    const query = nextSearch.trim() ? `?search=${encodeURIComponent(nextSearch.trim())}` : "";
    const data = await apiRequest(`/documents${query}`);
    setDocuments(data.documents);
    if (!selectedId && data.documents[0]) {
      setSelectedId(data.documents[0].id);
    }
  }

  async function loadSelected(id) {
    if (!id) {
      setSelected(null);
      return;
    }

    const data = await apiRequest(`/documents/${id}`);
    setSelected(data);
  }

  useEffect(() => {
    loadDocuments().catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    loadSelected(selectedId).catch((requestError) => setError(requestError.message));
  }, [selectedId]);

  async function submitSearch(event) {
    event.preventDefault();
    setError("");

    try {
      await loadDocuments(search);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!uploadForm.file) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const body = new FormData();
      body.append("title", uploadForm.title);
      body.append("description", uploadForm.description);
      body.append("file", uploadForm.file);
      const data = await apiRequest("/documents", {
        method: "POST",
        body
      });
      setUploadForm({ title: "", description: "", file: null });
      event.target.reset();
      setNotice("Document uploaded.");
      await loadDocuments(search);
      setSelectedId(data.document.id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!selectedId || !comment.trim()) return;

    setBusy(true);
    setError("");

    try {
      await apiRequest(`/documents/${selectedId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment })
      });
      setComment("");
      await loadSelected(selectedId);
      await loadDocuments(search);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadSelected() {
    if (!selected?.document) return;
    setError("");

    try {
      await downloadFile(selected.document.id, selected.document.originalName);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <h2>Documents</h2>
          <p>{documents.length} visible</p>
        </div>
        <form className="search-box" onSubmit={submitSearch}>
          <Search size={18} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents"
          />
          <button type="submit" title="Search">
            Search
          </button>
        </form>
      </header>

      <Alert error={error} notice={notice} />

      <div className="document-layout">
        <section className="document-list-panel">
          <form className="upload-panel" onSubmit={submitUpload}>
            <div className="panel-title">
              <Upload size={18} aria-hidden="true" />
              <h3>Upload</h3>
            </div>
            <label>
              Title
              <input
                value={uploadForm.title}
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, title: event.target.value }))
                }
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={uploadForm.description}
                onChange={(event) =>
                  setUploadForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                rows={3}
              />
            </label>
            <label>
              File
              <input
                type="file"
                onChange={(event) =>
                  setUploadForm((current) => ({ ...current, file: event.target.files[0] }))
                }
                required
              />
            </label>
            <button className="primary-action" disabled={busy}>
              {busy ? "Uploading" : "Upload document"}
            </button>
          </form>

          <div className="list">
            {documents.map((document) => (
              <button
                className={document.id === selectedId ? "document-row active" : "document-row"}
                key={document.id}
                onClick={() => setSelectedId(document.id)}
              >
                <FileText size={18} aria-hidden="true" />
                <span>
                  <strong>{document.title}</strong>
                  <small>
                    {document.originalName} · {formatBytes(document.byteSize)}
                  </small>
                </span>
                <em>{document.commentCount}</em>
              </button>
            ))}
            {documents.length === 0 && <p className="empty-state">No documents found.</p>}
          </div>
        </section>

        <section className="detail-panel">
          {selected?.document ? (
            <>
              <div className="detail-header">
                <div>
                  <h3>{selected.document.title}</h3>
                  <p>{selected.document.originalName}</p>
                </div>
                <button className="icon-button" title="Download" onClick={downloadSelected}>
                  <Download size={19} aria-hidden="true" />
                </button>
              </div>

              <dl className="metadata-grid">
                <div>
                  <dt>Owner</dt>
                  <dd>{selected.document.owner.fullName}</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>{formatBytes(selected.document.byteSize)}</dd>
                </div>
                <div>
                  <dt>Uploaded</dt>
                  <dd>{formatDate(selected.document.createdAt)}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{selected.document.mimeType}</dd>
                </div>
              </dl>

              {selected.document.description && (
                <p className="document-description">{selected.document.description}</p>
              )}

              <div className="comments-header">
                <MessageSquare size={18} aria-hidden="true" />
                <h3>Comments</h3>
              </div>
              <div className="comments-list">
                {selected.comments.map((item) => (
                  <article className="comment" key={item.id}>
                    <header>
                      <strong>{item.author.fullName}</strong>
                      <span>{formatDate(item.createdAt)}</span>
                    </header>
                    <p>{item.body}</p>
                  </article>
                ))}
                {selected.comments.length === 0 && <p className="empty-state">No comments yet.</p>}
              </div>

              <form className="comment-form" onSubmit={submitComment}>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add a comment"
                  rows={3}
                  required
                />
                <button className="primary-action" disabled={busy}>
                  Comment
                </button>
              </form>
            </>
          ) : (
            <p className="empty-state">Select a document.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function ProfileView({ user, onUserChange }) {
  const [form, setForm] = useState({
    fullName: user.fullName,
    email: user.email
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest("/me", {
        method: "PATCH",
        body: JSON.stringify(form)
      });
      onUserChange(data.user);
      setNotice("Profile saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace narrow">
      <header className="workspace-header">
        <div>
          <h2>Profile</h2>
          <p>{user.role}</p>
        </div>
      </header>
      <Alert error={error} notice={notice} />
      <form className="settings-panel" onSubmit={submit}>
        <label>
          Full name
          <input
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
          />
        </label>
        <button className="primary-action" disabled={busy}>
          <Save size={18} aria-hidden="true" />
          Save profile
        </button>
      </form>
    </main>
  );
}

function AdminView({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  async function loadUsers() {
    const data = await apiRequest("/admin/users");
    setUsers(data.users);
    setDrafts(
      Object.fromEntries(
        data.users.map((user) => [
          user.id,
          {
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isDisabled: user.isDisabled
          }
        ])
      )
    );
  }

  useEffect(() => {
    loadUsers().catch((requestError) => setError(requestError.message));
  }, []);

  function updateDraft(userId, field, value) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value
      }
    }));
  }

  async function saveUser(userId) {
    setBusyId(userId);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(drafts[userId])
      });
      setNotice(`${data.user.fullName} saved.`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users]
  );

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <h2>Admin</h2>
          <p>{users.length} users</p>
        </div>
        <button className="icon-label-button" onClick={loadUsers}>
          <RefreshCw size={18} aria-hidden="true" />
          Refresh
        </button>
      </header>
      <Alert error={error} notice={notice} />
      <section className="admin-table" aria-label="User management">
        <div className="admin-header-row">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {sortedUsers.map((user) => {
          const draft = drafts[user.id] || user;
          const isSelf = user.id === currentUser.id;

          return (
            <div className="admin-row" key={user.id}>
              <input
                value={draft.fullName}
                onChange={(event) => updateDraft(user.id, "fullName", event.target.value)}
              />
              <input
                type="email"
                value={draft.email}
                onChange={(event) => updateDraft(user.id, "email", event.target.value)}
              />
              <select
                value={draft.role}
                disabled={isSelf}
                onChange={(event) => updateDraft(user.id, "role", event.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={!draft.isDisabled}
                  disabled={isSelf}
                  onChange={(event) => updateDraft(user.id, "isDisabled", !event.target.checked)}
                />
                Active
              </label>
              <button
                className="icon-button"
                title="Save user"
                onClick={() => saveUser(user.id)}
                disabled={busyId === user.id}
              >
                <Save size={18} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </section>
    </main>
  );
}

export default function App() {
  const hasResetToken =
    window.location.pathname.includes("reset-password") &&
    new URLSearchParams(window.location.search).has("token");
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState("documents");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasResetToken) {
      setLoading(false);
      return;
    }

    apiRequest("/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [hasResetToken]);

  async function logout() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setCurrentView("documents");
    }
  }

  if (hasResetToken) {
    return <ResetPasswordScreen />;
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <FileText size={34} aria-hidden="true" />
        <span>Loading</span>
      </main>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />;
  }

  return (
    <Shell user={user} currentView={currentView} onViewChange={setCurrentView} onLogout={logout}>
      {currentView === "documents" && <DocumentsView />}
      {currentView === "profile" && <ProfileView user={user} onUserChange={setUser} />}
      {currentView === "admin" && user.role === "admin" && <AdminView currentUser={user} />}
    </Shell>
  );
}
