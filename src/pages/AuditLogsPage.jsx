import { useEffect, useState } from 'react'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import { getAdminStats, getAuditLogs } from '../services/auditService'

function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const load = async () => {
      const [logs, adminStats] = await Promise.all([
        getAuditLogs(),
        getAdminStats(),
      ])
      setAuditLogs(logs)
      setStats(adminStats)
    }
    load()
  }, [])

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Administration › Audit Logs"
        title="System Transparency Portal"
        subtitle="Real-time audit trailing and administrative control center."
        actions={
          <>
          <button type="button" className="btn-secondary">Export CSV</button>
          <button type="button" className="btn-primary">Refresh Logs</button>
          </>
        }
      />

      <div className="widgets four">
        <StatCard title="Log Entries (24h)" value={String(auditLogs.length)} />
        <StatCard title="Security Alerts" value="04" />
        <StatCard title="Admin Sessions" value={String(stats?.users || 0)} />
        <StatCard title="System Health" value="Operational" meta="99.8%" className="hero-strip" />
      </div>

      <DataTableShell
        filters={
          <>
          <label>
            Date Range
            <input type="text" value="Oct 12, 2023 - Oct 19, 2023" readOnly />
          </label>
          <label>
            Module
            <select defaultValue="All Modules">
              <option>All Modules</option>
              <option>Loans</option>
              <option>Analysis</option>
              <option>Finance</option>
              <option>Insurance</option>
              <option>Admin</option>
            </select>
          </label>
          </>
        }
      >
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
            {auditLogs.map((log, index) => (
              <tr key={log.logId}>
                <td>User #{log.userId}</td>
                <td>{log.action}</td>
                <td>{['Loans', 'Analysis', 'Finance', 'Insurance', 'Admin'][index % 5]}</td>
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
            ))}
          </tbody>
        </table>
      </DataTableShell>

      <div className="dashboard-grid">
        <article className="card">
          <h2>Security Protocol v4.2</h2>
          <p>All administrative actions are encrypted and immutable for 7 years retention.</p>
        </article>
        <article className="card neutral-strip">
          <h2>Compliance Dashboard</h2>
          <p>Access high-level reporting for annual audits and external regulatory reviews.</p>
        </article>
      </div>
    </section>
  )
}

export default AuditLogsPage
