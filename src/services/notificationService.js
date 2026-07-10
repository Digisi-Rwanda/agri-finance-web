import { getAuditLogs } from './auditService'
import { getLoans } from './bankService'
import { formatRwf } from '../utils/currency'
import { formatAuditAction, formatTimestamp } from '../utils/dashboard'

export const getNotifications = async () => {
  const [loans, logs] = await Promise.allSettled([getLoans(), getAuditLogs()])

  const items = []

  if (loans.status === 'fulfilled') {
    loans.value
      .filter((loan) =>
        ['APPROVED', 'Approved', 'REJECTED', 'Rejected', 'PENDING', 'Pending'].includes(loan.status),
      )
      .slice(0, 8)
      .forEach((loan) => {
        const status = String(loan.status || '')
        const approved = status.toLowerCase().includes('approve')
        const pending = status.toLowerCase().includes('pending')
        items.push({
          id: `loan-${loan.id}`,
          type: 'loan',
          title: pending ? 'Loan pending review' : approved ? 'Loan approved' : 'Loan rejected',
          message: `${loan.farmer} · ${formatRwf(loan.amount)} · ${status}`,
          time: loan.createdAt || null,
          href: '/loans',
          tone: pending ? 'warn' : approved ? 'good' : 'risk',
        })
      })
  }

  if (logs.status === 'fulfilled') {
    logs.value.slice(0, 8).forEach((log) => {
      items.push({
        id: `audit-${log.logId}`,
        type: 'system',
        title: 'System activity',
        message: formatAuditAction(log.action) || log.action || 'Audit event',
        time: log.timestamp || null,
        href: null,
        tone: 'neutral',
      })
    })
  }

  return items.map((item) => ({
    ...item,
    timeLabel: item.time ? formatTimestamp(item.time) : null,
  }))
}
