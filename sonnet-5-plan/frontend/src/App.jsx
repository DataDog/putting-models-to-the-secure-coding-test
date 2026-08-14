import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { NavBar } from './components/NavBar.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AdminRoute } from './components/AdminRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DocumentDetailPage } from './pages/DocumentDetailPage.jsx';
import { UploadPage } from './pages/UploadPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <NavBar />
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/documents/:id" element={<DocumentDetailPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Routes>
      </main>
    </AuthProvider>
  );
}
