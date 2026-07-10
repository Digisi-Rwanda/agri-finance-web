import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import AdminPanelPage from '../pages/AdminPanelPage'
import AuditLogsPage from '../pages/AuditLogsPage'
import ConsentPage from '../pages/ConsentPage'
import FarmerAnalysisPage from '../pages/FarmerAnalysisPage'
import FarmerAnalysisEntryPage from '../pages/FarmerAnalysisEntryPage'
import FarmerProfileRedirect from '../pages/FarmerProfileRedirect'
import InsuranceManagementPage from '../pages/InsuranceManagementPage'
import InsurerDashboardPage from '../pages/InsurerDashboardPage'
import LoginPage from '../pages/LoginPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import VerifyEmailPage from '../pages/VerifyEmailPage'
import LoanManagementPage from '../pages/LoanManagementPage'
import NotFoundPage from '../pages/NotFoundPage'
import NotificationsPage from '../pages/NotificationsPage'
import ProfilePage from '../pages/ProfilePage'
import RegisterPage from '../pages/RegisterPage'
import SettingsPage from '../pages/SettingsPage'
import MomoPaymentsPage from '../pages/MomoPaymentsPage'
import ProtectedRoute from './ProtectedRoute'
import RoleHome from './RoleHome'

function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="verify-email" element={<VerifyEmailPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleHome />} />
        <Route
          path="loans"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN']}>
              <LoanManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN']}>
              <FarmerAnalysisEntryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/profile"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN']}>
              <FarmerProfileRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/:farmerId"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN']}>
              <FarmerAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="insurer"
          element={
            <ProtectedRoute allowedRoles={['INSURER', 'ADMIN']}>
              <InsurerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="insurance"
          element={
            <ProtectedRoute allowedRoles={['INSURER', 'ADMIN']}>
              <InsuranceManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminPanelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="consent"
          element={
            <ProtectedRoute allowedRoles={['FARMER', 'ADMIN']}>
              <ConsentPage />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="payments"
          element={
            <ProtectedRoute allowedRoles={['FARMER', 'BANK', 'INSURER', 'ADMIN']}>
              <MomoPaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
