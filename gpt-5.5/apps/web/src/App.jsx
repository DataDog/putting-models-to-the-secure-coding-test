import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import AdminPage from './pages/AdminPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';

const tabs = [
  { id: 'documents', label: 'Documents' },
  { id: 'profile', label: 'Profile' },
  { id: 'admin', label: 'Admin', adminOnly: true }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  const [error, setError] = useState('');

  const resetToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('resetToken') || params.get('token');
  }, []);

  useEffect(() => {
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setActiveTab('documents');
  }

  if (loading) {
    return <main className="shell">Loading…</main>;
  }

  if (resetToken && !user) {
    return <ResetPasswordPage token={resetToken} />;
  }

  if (!user) {
    return <LoginPage onAuth={setUser} />;
  }

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || user.role === 'admin');

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Document Portal</p>
          <h1>Secure team documents</h1>
        </div>
        <div className="account-chip">
          <span>{user.name}</span>
          <small>{user.role}</small>
          <button className="secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <nav className="tabs" aria-label="Primary">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => {
              setError('');
              setActiveTab(tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'documents' ? <DocumentsPage user={user} setError={setError} /> : null}
        {activeTab === 'profile' ? (
          <ProfilePage user={user} onUserChange={setUser} setError={setError} />
        ) : null}
        {activeTab === 'admin' && user.role === 'admin' ? (
          <AdminPage currentUser={user} setError={setError} />
        ) : null}
      </main>
    </div>
  );
}
