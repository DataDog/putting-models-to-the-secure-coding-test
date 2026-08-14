import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/documents" className="navbar-brand">
        Document Portal
      </Link>
      {user && (
        <div className="navbar-links">
          <Link to="/documents">Documents</Link>
          <Link to="/profile">Profile</Link>
          {user.role === 'ADMIN' && <Link to="/admin/users">Users</Link>}
          <span style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
            {user.name || user.email}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: '1rem' }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
