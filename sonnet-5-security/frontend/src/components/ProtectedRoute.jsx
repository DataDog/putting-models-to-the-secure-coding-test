import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children, requireRole }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />;

  return children;
}
