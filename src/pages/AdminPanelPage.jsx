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
import { partnerRoleLabel, roleLabel } from '../constants/portalLocales'
import { usePortalCopy } from '../context/AuthLocaleContext'
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

const PARTNER_ROLE_VALUES = [
  'BANK',
  'INSURER',
  'COOPERATIVE',
  'INSPECTOR',
  'GUARANTEE_OFFICER',
  'REGISTRATION_OFFICER',
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMPTY_INVITE = { fullName: '', email: '', phone: '', role: 'BANK', password: '' }

function AdminPanelPage() {
  const p = usePortalCopy().adminUsers
  const portal = usePortalCopy()
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
      toast.error(p.loadFailed)
    })
  }, [p.loadFailed])

  const updateInvite = (field) => (event) => {
    const { value } = event.target
    setInvite((prev) => ({ ...prev, [field]: value }))
    setInviteErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  const passwordBlocklist = [invite.email, invite.fullName]

  const validateInvite = () => {
    const errors = {}
    if (!invite.fullName.trim()) errors.fullName = p.validation.fullName
    if (!EMAIL_PATTERN.test(invite.email.trim())) errors.email = p.validation.email
    if (invite.phone.trim() && !isValidRwandaMobile(invite.phone)) {
      errors.phone = p.validation.phone
    }
    if (!evaluatePassword(invite.password, { blocklist: passwordBlocklist }).valid) {
      errors.password = p.validation.password
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
      toast.success(p.accountCreated(created.fullName || created.email || created.username))
    } catch (error) {
      toast.error(getAuthErrorMessage(error, p.accountCreateFailed))
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
      toast.success(p.roleUpdated(roleLabel(portal, nextRole)))
    } catch {
      toast.error(p.roleUpdateFailed)
    } finally {
      setBusyUserId(null)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(p.deleteConfirm)) return
    setBusyUserId(userId)
    try {
      await deleteAdminUser(userId)
      setUsers((prev) => prev.filter((u) => u.userId !== userId))
      setStats((prev) =>
        prev ? { ...prev, users: Math.max(0, Number(prev.users || 1) - 1) } : prev,
      )
      toast.success(p.deleted)
    } catch {
      toast.error(p.deleteFailed)
    } finally {
      setBusyUserId(null)
    }
  }

  const shortcuts = [
    { to: '/admin/reports', title: p.shortcutReports, description: p.shortcutReportsDesc, icon: BarChart3 },
    { to: '/audit', title: p.shortcutAudit, description: p.shortcutAuditDesc, icon: ScrollText },
    { to: '/farmer', title: p.shortcutFarmers, description: p.shortcutFarmersDesc, icon: UserRound },
    { to: '/loans', title: p.shortcutLoans, description: p.shortcutLoansDesc, icon: Landmark },
    { to: '/insurance', title: p.shortcutInsurance, description: p.shortcutInsuranceDesc, icon: ShieldCheck },
  ]

  return (
    <section className="dashboard-page dashboard-page--compact">
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        actions={
          <>
            <Link to="/admin/reports" className="btn-secondary">
              {p.reports}
            </Link>
            <Link to="/audit" className="btn-secondary">
              {p.auditLogs}
            </Link>
            <Link to="/farmer" className="btn-primary">
              {p.farmers}
              <ArrowRight size={16} />
            </Link>
          </>
        }
      />

      <div className="widgets four">
        <StatCard title={p.totalUsers} value={String(stats?.users ?? 0)} meta={p.totalUsersMeta} />
        <StatCard title={p.farmersStat} value={String(stats?.farmers ?? 0)} meta={p.farmersStatMeta} />
        <StatCard title={p.loansStat} value={String(stats?.loans ?? 0)} meta={p.loansStatMeta} accent="blue" />
        <StatCard
          title={p.policiesStat}
          value={String(stats?.insurancePolicies ?? 0)}
          meta={p.policiesStatMeta}
          accent="slate"
        />
      </div>

      <section className="admin-invite-card" aria-labelledby="partner-invite-title">
        <div className="admin-invite-card__intro">
          <span className="admin-invite-card__icon" aria-hidden="true">
            <MailPlus size={20} />
          </span>
          <div>
            <h2 id="partner-invite-title">{p.inviteTitle}</h2>
            <p>{p.inviteBody}</p>
          </div>
        </div>
        <form className="admin-invite-form" onSubmit={handleInvitePartner} noValidate>
          <label>
            <span>{p.fullName}</span>
            <input
              type="text"
              autoComplete="off"
              placeholder={p.fullNamePlaceholder}
              value={invite.fullName}
              onChange={updateInvite('fullName')}
              aria-invalid={inviteErrors.fullName ? true : undefined}
            />
            {inviteErrors.fullName ? (
              <em className="admin-invite-form__error">{inviteErrors.fullName}</em>
            ) : null}
          </label>
          <label>
            <span>{p.email}</span>
            <input
              type="email"
              autoComplete="off"
              placeholder={p.emailPlaceholder}
              value={invite.email}
              onChange={updateInvite('email')}
              aria-invalid={inviteErrors.email ? true : undefined}
            />
            {inviteErrors.email ? (
              <em className="admin-invite-form__error">{inviteErrors.email}</em>
            ) : null}
          </label>
          <label>
            <span>{p.phone}</span>
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
            <span>{p.accessRole}</span>
            <select value={invite.role} onChange={updateInvite('role')}>
              {PARTNER_ROLE_VALUES.map((role) => (
                <option key={role} value={role}>
                  {partnerRoleLabel(portal, role)}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-invite-form__password">
            <span>{p.startingPassword}</span>
            <input
              type="text"
              autoComplete="off"
              placeholder={p.passwordPlaceholder}
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
            {sendingInvite ? p.creating : p.createAccount}
          </button>
        </form>
        <p className="admin-invite-card__note">{p.inviteNote}</p>
      </section>

      <div className="dash-section">
        <div className="dash-section__head">
          <h2>{p.shortcutsTitle}</h2>
          <p>{p.shortcutsSubtitle}</p>
        </div>
        <div className="dash-quick-grid">
          {shortcuts.map((item) => (
            <QuickActionCard
              key={item.to}
              to={item.to}
              title={item.title}
              description={item.description}
              icon={item.icon}
            />
          ))}
        </div>
      </div>

      <DataTableShell title={p.tableTitle} footer={<span>{p.tableFooter(users.length)}</span>}>
        <p className="admin-users-hint">{p.partnerRoleHint}</p>
        <div className="table-scroll">
          <table className="desktop-table dashboard-table">
            <thead>
              <tr>
                <th>{p.colId}</th>
                <th>{p.colAccount}</th>
                <th>{p.colRole}</th>
                <th>{p.colFarmerId}</th>
                <th>{p.colActions}</th>
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
                    {p.empty}
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleOptions = user.farmerId
                    ? ['FARMER']
                    : ROLES.filter((role) => role !== 'FARMER')
                  return (
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
                          aria-label={p.roleFor(user.username)}
                          title={user.farmerId ? p.farmerRoleHint : undefined}
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {roleLabel(portal, role)}
                            </option>
                          ))}
                        </select>
                        {user.farmerId ? (
                          <span className="admin-user-role-hint">{p.farmerRoleHint}</span>
                        ) : null}
                      </td>
                      <td>{user.farmerId ?? '—'}</td>
                      <td className="action-cell">
                        <button
                          type="button"
                          className="btn-secondary danger"
                          onClick={() => handleDeleteUser(user.userId)}
                          disabled={busyUserId === user.userId}
                        >
                          {p.delete}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </DataTableShell>
    </section>
  )
}

export default AdminPanelPage
