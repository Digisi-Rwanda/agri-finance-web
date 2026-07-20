import { ArrowRight, Landmark, ScrollText, ShieldCheck, UserRound, Users, BarChart3 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import QuickActionCard from '../components/dashboard/QuickActionCard'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import {
  deleteAdminUser,
  getAdminStats,
  getAdminUsers,
  updateAdminUserRole,
} from '../services/auditService'

const ROLES = [
  'ADMIN',
  'BANK',
  'INSURER',
  'FARMER',
  'COOPERATIVE',
  'INSPECTOR',
  'REGISTRATION_OFFICER',
  'GUARANTEE_OFFICER',
]

function AdminPanelPage() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [busyUserId, setBusyUserId] = useState(null)

  useEffect(() => {
    const load = async () => {
      const [statsData, usersData] = await Promise.all([getAdminStats(), getAdminUsers()])
      setStats(statsData)
      setUsers(usersData || [])
      setLoadingUsers(false)
    }
    load().catch(() => {
      setLoadingUsers(false)
      toast.error('Failed to load admin panel data.')
    })
  }, [])

  const handleRoleChange = async (userId, nextRole) => {
    setBusyUserId(userId)
    try {
      const updated = await updateAdminUserRole(userId, nextRole)
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, role: updated.role } : u)),
      )
      toast.success(`Role updated to ${nextRole}.`)
    } catch {
      toast.error('Could not update role.')
    } finally {
      setBusyUserId(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm('Delete this user account? This action cannot be undone.')
    if (!confirmed) return
    setBusyUserId(userId)
    try {
      await deleteAdminUser(userId)
      setUsers((prev) => prev.filter((u) => u.userId !== userId))
      setStats((prev) =>
        prev ? { ...prev, users: Math.max(0, Number(prev.users || 1) - 1) } : prev,
      )
      toast.success('User deleted successfully.')
    } catch {
      toast.error('Could not delete user.')
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title="Admin · Users"
        subtitle="Manage portal accounts and assign roles."
        actions={
          <>
            <Link to="/admin/reports" className="btn-secondary">
              Reports
            </Link>
            <Link to="/audit" className="btn-secondary">
              Audit logs
            </Link>
            <Link to="/farmer" className="btn-primary">
              Farmers
              <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      <div className="widgets four">
        <StatCard title="Total users" value={String(stats?.users ?? 0)} meta="All roles" />
        <StatCard title="Farmers" value={String(stats?.farmers ?? 0)} meta="Linked profiles" />
        <StatCard title="Loans" value={String(stats?.loans ?? 0)} meta="All statuses" accent="blue" />
        <StatCard
          title="Policies"
          value={String(stats?.insurancePolicies ?? 0)}
          meta="Insurance book"
          accent="slate"
        />
      </div>

      <div className="dash-section">
        <div className="dash-section__head">
          <h2>System shortcuts</h2>
          <p>Admin operations across the portal</p>
        </div>
        <div className="dash-quick-grid">
          <QuickActionCard
            to="/admin"
            title="Users"
            description="Roles & account access"
            icon={Users}
          />
          <QuickActionCard
            to="/admin/reports"
            title="Reports"
            description="Loans, harvest, insurance"
            icon={BarChart3}
          />
          <QuickActionCard
            to="/audit"
            title="Audit logs"
            description="Security & change trail"
            icon={ScrollText}
          />
          <QuickActionCard
            to="/farmer"
            title="Farmers"
            description="Directory & credit views"
            icon={UserRound}
          />
          <QuickActionCard
            to="/loans"
            title="Loans"
            description="Bank loan pipeline"
            icon={Landmark}
          />
          <QuickActionCard
            to="/insurance"
            title="Insurance"
            description="Policies overview"
            icon={ShieldCheck}
          />
        </div>
      </div>

      <DataTableShell title="User management" footer={<span>{users.length} account(s)</span>}>
        <div className="table-scroll">
          <table className="desktop-table dashboard-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Farmer ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                [...Array(3)].map((_, index) => (
                  <tr key={`sk-${index}`}>
                    <td colSpan={5}>
                      <div className="skeleton-row" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.userId}>
                    <td>{user.userId}</td>
                    <td>
                      <strong className="dash-name">{user.username}</strong>
                    </td>
                    <td>
                      <select
                        className="dash-role-select"
                        value={user.role}
                        onChange={(event) => handleRoleChange(user.userId, event.target.value)}
                        disabled={busyUserId === user.userId}
                        aria-label={`Role for ${user.username}`}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{user.farmerId ?? '—'}</td>
                    <td className="action-cell">
                      <button
                        type="button"
                        className="btn-secondary danger"
                        onClick={() => handleDeleteUser(user.userId)}
                        disabled={busyUserId === user.userId}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </section>
  )
}

export default AdminPanelPage
