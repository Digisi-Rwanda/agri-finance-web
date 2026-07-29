import { useEffect, useMemo, useState } from 'react'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getAdminStats, getAuditLogs } from '../services/auditService'

function deriveModule(action = '') {
  const text = String(action).toLowerCase()
  if (text.includes('loan')) return 'Loans'
  if (text.includes('insur')) return 'Insurance'
  if (text.includes('payment') || text.includes('momo')) return 'Payments'
  if (text.includes('consent')) return 'Consent'
  if (text.includes('login') || text.includes('auth') || text.includes('user')) return 'Auth'
  if (text.includes('farm') || text.includes('credit') || text.includes('score')) return 'Analysis'
  return 'System'
}

function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const loadLogs = async () => {
    setLoading(true)
    try {
      const [logs, adminStats] = await Promise.all([getAuditLogs(), getAdminStats()])
      setAuditLogs(Array.isArray(logs) ? logs : [])
      setStats(adminStats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const uniqueUsers = useMemo(
    () => new Set(auditLogs.map((log) => log.userId).filter(Boolean)).size,
    [auditLogs],
  )

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return auditLogs.filter((log) => {
      const module = deriveModule(log.action)
      const moduleOk = moduleFilter === 'All' || module === moduleFilter
      const searchOk =
        !query ||
        String(log.action || '').toLowerCase().includes(query) ||
        String(log.userId || '').includes(query) ||
        module.toLowerCase().includes(query)
      return moduleOk && searchOk
    })
  }, [auditLogs, moduleFilter, searchQuery])

  const alertCount = auditLogs.filter((log) =>
    /denied|failed|reject|error/i.test(log.action || ''),
  ).length

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title="System audit trail"
        subtitle="Immutable record of sign-ins, approvals, and administrative actions."
        actions={
          <button type="button" className="btn-primary" onClick={loadLogs} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh logs'}
          </button>
        }
      />

      <div className="widgets four">
        <StatCard title="Total entries" value={String(auditLogs.length)} />
        <StatCard title="Unique users" value={String(uniqueUsers)} />
        <StatCard title="Security alerts" value={String(alertCount)} meta="Failed or denied actions" />
        <StatCard title="Registered users" value={String(stats?.users || 0)} meta="Platform accounts" />
      </div>

      <DataTableShell
        filters={
          <>
            <label>
              Search
              <input
                type="search"
                placeholder="Action, user ID, or module"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </label>
            <label>
              Module
              <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
                <option>All</option>
                <option>Loans</option>
                <option>Analysis</option>
                <option>Payments</option>
                <option>Insurance</option>
                <option>Consent</option>
                <option>Auth</option>
                <option>System</option>
              </select>
            </label>
          </>
        }
        footer={<span>Showing {filteredLogs.length} of {auditLogs.length} log entries</span>}
      >
        <div className="table-scroll">
          <table className="desktop-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, index) => (
                  <tr key={`sk-${index}`}>
                    <td colSpan={5}>
                      <div className="skeleton-row" />
                    </td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    No audit logs match your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.logId}>
                    <td>User #{log.userId}</td>
                    <td>{log.action}</td>
                    <td>{deriveModule(log.action)}</td>
                    <td>{log.timestamp?.replace('T', ' ').slice(0, 19) || 'N/A'}</td>
                    <td>
                      <StatusBadge
                        value={
                          /denied|failed|reject|error/i.test(log.action || '')
                            ? 'Alert'
                            : 'Success'
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>

      <div className="dashboard-grid">
        <article className="card">
          <h2>Retention policy</h2>
          <p>Administrative actions are stored for compliance and can be exported for annual audits.</p>
        </article>
        <article className="card neutral-strip">
          <h2>Access control</h2>
          <p>Only administrators can view this page. Bank partners see activity summaries on their dashboard.</p>
        </article>
      </div>
    </section>
  )
}

export default AuditLogsPage
