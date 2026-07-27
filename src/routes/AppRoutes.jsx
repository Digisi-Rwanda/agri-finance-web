import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import AdminPanelPage from '../pages/AdminPanelPage'
import AdminReportsPage from '../pages/AdminReportsPage'
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
import InspectionQueuePage from '../pages/InspectionQueuePage'
import BankabilityOpsPage from '../pages/BankabilityOpsPage'
import PaymentWatchPage from '../pages/PaymentWatchPage'
import ConsentVaultPage from '../pages/ConsentVaultPage'
import TrustLadderPage from '../pages/TrustLadderPage'
import ContractsPage from '../pages/ContractsPage'
import SpecV2OpsPage from '../pages/SpecV2OpsPage'
import BuyerVerificationPage from '../pages/BuyerVerificationPage'
import BankLoanPackagesPage from '../pages/BankLoanPackagesPage'
import CooperativeDashboardPage from '../pages/CooperativeDashboardPage'
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
      <Route path="buyer-verify" element={<BuyerVerificationPage />} />

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
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN', 'REGISTRATION_OFFICER']}>
              <LoanManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="loan-packages"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN']}>
              <BankLoanPackagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN', 'REGISTRATION_OFFICER']}>
              <FarmerAnalysisEntryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/profile"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN', 'REGISTRATION_OFFICER']}>
              <FarmerProfileRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="farmer/:farmerId"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN', 'REGISTRATION_OFFICER']}>
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
            <ProtectedRoute allowedRoles={['INSURER', 'ADMIN', 'BANK', 'REGISTRATION_OFFICER']}>
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
          path="admin/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'REGISTRATION_OFFICER']}>
              <AdminReportsPage />
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
        {/* New bankability routes */}
        <Route
          path="contracts"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN', 'GUARANTEE_OFFICER', 'REGISTRATION_OFFICER']}>
              <ContractsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inspections"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'INSPECTOR']}>
              <InspectionQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bankability"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'GUARANTEE_OFFICER']}>
              <BankabilityOpsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payment-watch"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN', 'GUARANTEE_OFFICER']}>
              <PaymentWatchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="consent-vault"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN', 'GUARANTEE_OFFICER', 'REGISTRATION_OFFICER']}>
              <ConsentVaultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="trust-ladder"
          element={
            <ProtectedRoute allowedRoles={['BANK', 'ADMIN', 'GUARANTEE_OFFICER']}>
              <TrustLadderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bankability/v2"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'GUARANTEE_OFFICER']}>
              <SpecV2OpsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cooperative"
          element={
            <ProtectedRoute allowedRoles={['COOPERATIVE', 'ADMIN']}>
              <CooperativeDashboardPage />
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
            <ProtectedRoute
              allowedRoles={[
                'FARMER',
                'BANK',
                'INSURER',
                'ADMIN',
                'COOPERATIVE',
                'REGISTRATION_OFFICER',
              ]}
            >
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
