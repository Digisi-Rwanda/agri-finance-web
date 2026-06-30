import { getCurrentUser } from '../services/auth'
import BankDashboardPage from '../pages/BankDashboardPage'
import InsurerDashboardPage from '../pages/InsurerDashboardPage'
import MomoPaymentsPage from '../pages/MomoPaymentsPage'

function RoleHome() {
  const role = getCurrentUser()?.role

  switch (role) {
    case 'INSURER':
      return <InsurerDashboardPage />
    case 'FARMER':
      return <MomoPaymentsPage />
    case 'ADMIN':
    case 'BANK':
    default:
      return <BankDashboardPage />
  }
}

export default RoleHome
