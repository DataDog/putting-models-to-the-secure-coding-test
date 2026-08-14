import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/">Dashboard</Link>
      {user && (
        <>
          <Link to="/upload">Upload</Link>
          <Link to="/profile">Profile</Link>
          {user.role === 'ADMIN' && <Link to="/admin/users">Admin</Link>}
          <span className="navbar-user">{user.name}</span>
          <button onClick={handleLogout}>Log out</button>
        </>
      )}
    </nav>
  );
}
