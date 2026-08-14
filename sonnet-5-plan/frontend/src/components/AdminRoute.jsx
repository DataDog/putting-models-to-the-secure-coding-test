import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export function AdminRoute() {
  const { user, initializing } = useAuth();

  if (initializing) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;

  return <Outlet />;
}
