const HOME_BY_ROLE = {
  ADMIN: '/',
  BANK: '/',
  INSURER: '/insurer',
  FARMER: '/payments',
  COOPERATIVE: '/',
  INSPECTOR: '/inspections',
  GUARANTEE_OFFICER: '/bankability/v2',
  REGISTRATION_OFFICER: '/admin/reports',
}

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  BANK: 'Bank partner',
  INSURER: 'Insurance partner',
  FARMER: 'Farmer',
  COOPERATIVE: 'Cooperative',
  INSPECTOR: 'Field inspector',
  GUARANTEE_OFFICER: 'Guarantee officer',
  REGISTRATION_OFFICER: 'Registration officer',
}

export const getHomePathForRole = (role) => HOME_BY_ROLE[role] || '/'

export const getUserInitials = (user) => {
  const source = user?.fullName || user?.username || ''
  if (!source) return 'AF'

  const parts = source.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}
