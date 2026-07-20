const HOME_BY_ROLE = {
  ADMIN: '/',
  BANK: '/',
  INSURER: '/insurer',
  FARMER: '/payments',
  COOPERATIVE: '/cooperative',
}

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  BANK: 'Bank partner',
  INSURER: 'Insurance partner',
  FARMER: 'Farmer',
  COOPERATIVE: 'Cooperative',
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
