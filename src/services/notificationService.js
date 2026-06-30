import { getAuditLogs } from './auditService'
import { getLoans } from './bankService'
import { formatRwf } from '../utils/currency'

export const getNotifications = async () => {
  const [loans, logs] = await Promise.allSettled([getLoans(), getAuditLogs()])

  const items = []

  if (loans.status === 'fulfilled') {
    loans.value
      .filter((loan) => ['APPROVED', 'Approved', 'REJECTED', 'Rejected'].includes(loan.status))
      .slice(0, 4)
      .forEach((loan) => {
        items.push({
          id: `loan-${loan.id}`,
          title: loan.status.toLowerCase().includes('approve') ? 'Loan Approved' : 'Loan Rejected',
          message: `${loan.farmer} application (${formatRwf(loan.amount)}) is now ${loan.status}.`,
        })
      })
  }

  if (logs.status === 'fulfilled') {
    logs.value.slice(0, 4).forEach((log) => {
      items.push({
        id: `audit-${log.logId}`,
        title: 'Audit Activity',
        message: log.action,
      })
    })
  }

  return items
}
