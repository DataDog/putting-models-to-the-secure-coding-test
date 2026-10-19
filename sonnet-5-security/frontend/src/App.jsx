import { Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Navbar } from './components/Navbar.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { DocumentDetail } from './pages/DocumentDetail.jsx';
import { Profile } from './pages/Profile.jsx';
import { AdminUsers } from './pages/AdminUsers.jsx';

export function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
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
            <ProtectedRoute requireRole="admin">
              <AdminUsers />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
