import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import {
  deleteAdminUser,
  getAdminStats,
  getAdminUsers,
  updateAdminUserRole,
} from '../services/auditService'

const ROLES = ['ADMIN', 'BANK', 'INSURER', 'FARMER']

function AdminPanelPage() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [busyUserId, setBusyUserId] = useState(null)

  useEffect(() => {
    const load = async () => {
      const [statsData, usersData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
      ])
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
      setStats((prev) => (prev ? { ...prev, users: Math.max(0, Number(prev.users || 1) - 1) } : prev))
      toast.success('User deleted successfully.')
    } catch {
      toast.error('Could not delete user.')
    } finally {
      setBusyUserId(null)
    }
  }

  return (
    <section className="dashboard-page">
      <PageHeader
        breadcrumb="Home › System › Users"
        subtitle="Manage portal users and assign roles."
      />

      <div className="widgets three">
        <StatCard title="Total users" value={String(stats?.users ?? 0)} />
        <StatCard title="Farmers" value={String(stats?.farmers ?? 0)} />
        <StatCard
          title="Loans & policies"
          value={String((stats?.loans ?? 0) + (stats?.insurancePolicies ?? 0))}
        />
      </div>

      <DataTableShell
        title="User management"
        footer={<span>{users.length} user account(s)</span>}
      >
        <div className="table-scroll">
          <table className="desktop-table dashboard-table">
            <thead>
              <tr>
                <th>User ID</th>
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
                    <td>{user.username}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(event) => handleRoleChange(user.userId, event.target.value)}
                        disabled={busyUserId === user.userId}
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
