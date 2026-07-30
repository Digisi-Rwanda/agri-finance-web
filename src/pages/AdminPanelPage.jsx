import {
  ArrowRight,
  BarChart3,
  Landmark,
  MailPlus,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import PasswordStrength from '../components/auth/PasswordStrength'
import QuickActionCard from '../components/dashboard/QuickActionCard'
import DataTableShell from '../components/ui/DataTableShell'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { passwordPolicyCopy } from '../constants/authCopy'
import { getAuthErrorMessage } from '../services/auth'
import { evaluatePassword } from '../utils/passwordPolicy'
import {
  createAdminPartner,
  deleteAdminUser,
  getAdminStats,
  getAdminUsers,
  updateAdminUserRole,
} from '../services/auditService'
import {
  formatRwandaPhoneDisplay,
  isValidRwandaMobile,
  normalizeRwandaPhone,
  RWANDA_PHONE_PLACEHOLDER,
} from '../utils/rwandaPhone'

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY_INVITE = { fullName: '', email: '', phone: '', role: 'BANK', password: '' }

const PARTNER_ROLES = [
  { value: 'BANK', label: 'Bank partner' },
  { value: 'INSURER', label: 'Insurance partner' },
  { value: 'COOPERATIVE', label: 'Cooperative' },
  { value: 'INSPECTOR', label: 'Field inspector' },
  { value: 'GUARANTEE_OFFICER', label: 'Guarantee officer' },
  { value: 'REGISTRATION_OFFICER', label: 'Registration officer' },
]

function AdminPanelPage() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [busyUserId, setBusyUserId] = useState(null)
  const [invite, setInvite] = useState(EMPTY_INVITE)
  const [inviteErrors, setInviteErrors] = useState({})
  const [sendingInvite, setSendingInvite] = useState(false)

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

  const updateInvite = (field) => (event) => {
    const { value } = event.target
    setInvite((prev) => ({ ...prev, [field]: value }))
    setInviteErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  // Stops the admin from setting a password built out of the account's own details.
  const passwordBlocklist = [invite.email, invite.fullName]

  const validateInvite = () => {
    const errors = {}
    if (!invite.fullName.trim()) errors.fullName = 'Enter the person’s full name.'
    if (!EMAIL_PATTERN.test(invite.email.trim())) errors.email = 'Enter a valid email address.'
    if (invite.phone.trim() && !isValidRwandaMobile(invite.phone)) {
      errors.phone = 'Enter a valid Rwanda mobile number, or leave it blank.'
    }
    if (!evaluatePassword(invite.password, { blocklist: passwordBlocklist }).valid) {
      errors.password = passwordPolicyCopy.tooWeak
    }
    return errors
  }

  const handleInvitePartner = async (event) => {
    event.preventDefault()

    const errors = validateInvite()
    if (Object.keys(errors).length > 0) {
      setInviteErrors(errors)
      return
    }
    setInviteErrors({})

    setSendingInvite(true)
    try {
      const created = await createAdminPartner({
        fullName: invite.fullName,
        email: invite.email,
        phone: invite.phone.trim() ? normalizeRwandaPhone(invite.phone) : '',
        role: invite.role,
        password: invite.password,
      })
      setUsers((prev) => [created, ...prev])
      setStats((prev) => (prev ? { ...prev, users: Number(prev.users || 0) + 1 } : prev))
      setInvite(EMPTY_INVITE)
      toast.success(`Account created for ${created.fullName || created.email || created.username}.`)
    } catch (error) {
      toast.error(getAuthErrorMessage(error, 'Could not create the partner account.'))
    } finally {
      setSendingInvite(false)
    }
  }

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

      <section className="admin-invite-card" aria-labelledby="partner-invite-title">
        <div className="admin-invite-card__intro">
          <span className="admin-invite-card__icon" aria-hidden="true">
            <MailPlus size={20} />
          </span>
          <div>
            <h2 id="partner-invite-title">Create a partner or staff account</h2>
            <p>
              You set the starting password. Share it with the account holder privately and ask them
              to change it after their first sign-in.
            </p>
          </div>
        </div>
        <form className="admin-invite-form" onSubmit={handleInvitePartner} noValidate>
          <label>
            <span>Full name</span>
            <input
              type="text"
              autoComplete="off"
              placeholder="e.g. Celine Umukamisha"
              value={invite.fullName}
              onChange={updateInvite('fullName')}
              aria-invalid={inviteErrors.fullName ? true : undefined}
            />
            {inviteErrors.fullName ? (
              <em className="admin-invite-form__error">{inviteErrors.fullName}</em>
            ) : null}
          </label>
          <label>
            <span>Organization email</span>
            <input
              type="email"
              autoComplete="off"
              placeholder="name@organization.com"
              value={invite.email}
              onChange={updateInvite('email')}
              aria-invalid={inviteErrors.email ? true : undefined}
            />
            {inviteErrors.email ? (
              <em className="admin-invite-form__error">{inviteErrors.email}</em>
            ) : null}
          </label>
          <label>
            <span>Phone (optional)</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder={RWANDA_PHONE_PLACEHOLDER}
              value={invite.phone}
              onChange={updateInvite('phone')}
              onBlur={() =>
                setInvite((prev) => ({
                  ...prev,
                  phone: prev.phone.trim() ? formatRwandaPhoneDisplay(prev.phone) : '',
                }))
              }
              aria-invalid={inviteErrors.phone ? true : undefined}
            />
            {inviteErrors.phone ? (
              <em className="admin-invite-form__error">{inviteErrors.phone}</em>
            ) : null}
          </label>
          <label>
            <span>Access role</span>
            <select value={invite.role} onChange={updateInvite('role')}>
              {PARTNER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-invite-form__password">
            <span>Starting password</span>
            <input
              type="text"
              autoComplete="off"
              placeholder="Mix letters, numbers and a symbol"
              value={invite.password}
              onChange={updateInvite('password')}
              aria-invalid={inviteErrors.password ? true : undefined}
            />
            <PasswordStrength
              password={invite.password}
              blocklist={passwordBlocklist}
              copy={passwordPolicyCopy}
            />
            {inviteErrors.password ? (
              <em className="admin-invite-form__error">{inviteErrors.password}</em>
            ) : null}
          </label>
          <button type="submit" className="btn-primary" disabled={sendingInvite}>
            <MailPlus size={16} />
            {sendingInvite ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="admin-invite-card__note">
          The name and phone number you enter here are what the account holder sees on their profile.
        </p>
      </section>

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
                <th>Account</th>
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
                      {user.email && user.email !== user.username ? (
                        <span className="admin-user-email">{user.email}</span>
                      ) : null}
                    </td>
                    <td>
                      <select
                        className="dash-role-select"
                        value={user.role}
                        onChange={(event) => handleRoleChange(user.userId, event.target.value)}
                        disabled={busyUserId === user.userId}
                        aria-label={`Role for ${user.username}`}
                      >
                        {(user.farmerId ? ['FARMER'] : ROLES.filter((role) => role !== 'FARMER')).map((role) => (
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
