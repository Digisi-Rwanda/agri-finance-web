import { ShieldCheck, UserCog, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
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
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Panel</h1>
          <p className="mt-1 text-slate-600">Manage users and assign roles (ADMIN, BANK, INSURER).</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Users className="h-5 w-5 text-green-700" />
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Total Users</p>
          <p className="text-3xl font-semibold text-slate-900">{stats?.users ?? 0}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <UserCog className="h-5 w-5 text-blue-700" />
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Farmers Managed</p>
          <p className="text-3xl font-semibold text-slate-900">{stats?.farmers ?? 0}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Loans + Policies</p>
          <p className="text-3xl font-semibold text-slate-900">{(stats?.loans ?? 0) + (stats?.insurancePolicies ?? 0)}</p>
        </article>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="p-4 text-sm text-slate-600">Live user control panel backed by `/api/admin/users` endpoints.</div>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Farmer ID</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingUsers ? (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan="5">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-slate-500" colSpan="5">No users found.</td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.userId}</td>
                  <td className="px-4 py-3 text-slate-700">{user.username}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(event) => handleRoleChange(user.userId, event.target.value)}
                      disabled={busyUserId === user.userId}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{user.farmerId ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleDeleteUser(user.userId)}
                      disabled={busyUserId === user.userId}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default AdminPanelPage
