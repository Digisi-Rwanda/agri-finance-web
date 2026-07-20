import { getCurrentUser } from '../services/auth'
import AdminReportsPage from '../pages/AdminReportsPage'
import BankDashboardPage from '../pages/BankDashboardPage'
import CooperativeDashboardPage from '../pages/CooperativeDashboardPage'
import InsurerDashboardPage from '../pages/InsurerDashboardPage'
import InspectionQueuePage from '../pages/InspectionQueuePage'
import MomoPaymentsPage from '../pages/MomoPaymentsPage'
import SpecV2OpsPage from '../pages/SpecV2OpsPage'

function RoleHome() {
  const role = getCurrentUser()?.role

  switch (role) {
    case 'INSURER':
      return <InsurerDashboardPage />
    case 'FARMER':
      return <MomoPaymentsPage />
    case 'COOPERATIVE':
      return <CooperativeDashboardPage />
    case 'INSPECTOR':
      return <InspectionQueuePage />
    case 'GUARANTEE_OFFICER':
      return <SpecV2OpsPage />
    case 'REGISTRATION_OFFICER':
      return <AdminReportsPage />
    case 'ADMIN':
    case 'BANK':
    default:
      return <BankDashboardPage />
  }
}

export default RoleHome
