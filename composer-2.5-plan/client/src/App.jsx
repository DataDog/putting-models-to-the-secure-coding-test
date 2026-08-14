import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Documents from './pages/Documents.jsx';
import DocumentDetail from './pages/DocumentDetail.jsx';
import Profile from './pages/Profile.jsx';
import AdminUsers from './pages/AdminUsers.jsx';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return <Navigate to={user ? '/documents' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <Documents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <ProtectedRoute>
            <DocumentDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
