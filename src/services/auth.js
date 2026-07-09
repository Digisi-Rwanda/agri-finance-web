import axios from 'axios'

export const TOKEN_KEY = 'agri_finance_token'
export const USER_KEY = 'agri_finance_user'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
const authClient = axios.create({ baseURL: API_BASE_URL })

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const getCurrentUser = () => {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export const hasAnyRole = (allowedRoles = []) => {
  const role = getCurrentUser()?.role
  return Boolean(role) && allowedRoles.includes(role)
}

const persistSession = (responseData) => {
  const token = responseData?.token
  const user = {
    username: responseData?.username,
    role: responseData?.role,
  }
  setToken(token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return { token, user }
}

export const loginUser = async ({ email, password }) => {
  const response = await authClient.post('/auth/login', {
    username: email,
    password,
  })
  return persistSession(response.data)
}

export const registerUser = async ({ email, password, role, fullName, phone, institution }) => {
  const normalizedEmail = email?.trim()
  const payload = {
    username: normalizedEmail,
    email: normalizedEmail,
    password,
    role,
    fullName: fullName?.trim(),
  }
  if (phone) {
    payload.phone = phone
  }
  if (institution?.trim()) {
    payload.location = institution.trim()
  }
  const response = await authClient.post('/auth/register', payload)
  return response.data
}

export const forgotPasswordByEmail = async (email) => {
  const response = await authClient.post('/auth/forgot-password', { username: email })
  return response.data
}

export const forgotPasswordByPhone = async (phone) => {
  const response = await authClient.post('/auth/forgot-password-phone', { phone })
  return response.data
}

export const resetPasswordWithToken = async ({ token, newPassword }) => {
  const response = await authClient.post('/auth/reset-password', { token, newPassword })
  return response.data
}

export const resetPasswordWithCode = async (payload) => {
  const response = await authClient.post('/auth/reset-password', payload)
  return response.data
}

export const validateResetToken = async (token) => {
  const response = await authClient.get('/auth/reset-password/validate', { params: { token } })
  return response.data
}

export const verifyEmailWithToken = async (token) => {
  const response = await authClient.post('/auth/verify-email', { token })
  return response.data
}

const extractAuthError = (error, fallback) =>
  error?.response?.data?.error || error?.response?.data?.message || fallback

export const getAuthErrorMessage = extractAuthError

export const getProfile = async () => {
  const token = getToken()
  const response = await authClient.get('/auth/profile', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return response.data
}

export const resolvePrimaryFarmerId = async () => {
  const cached = getCurrentUser()?.farmerId
  if (cached) return cached

  try {
    const profile = await getProfile()
    if (profile?.farmerId) return profile.farmerId
  } catch {
    // no-op; fallback below
  }

  const token = getToken()
  const farmersResponse = await authClient.get('/farmers', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  return farmersResponse.data?.[0]?.farmerId || null
}

export const isAuthenticated = () => {
  const token = getToken()
  return Boolean(token) && !isTokenExpired(token)
}

export const isTokenExpired = (token) => {
  if (!token) return true

  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return !payload.exp || payload.exp * 1000 < Date.now()
  } catch {
    return false
  }
}

export const hydrateSessionUser = async () => {
  try {
    const profile = await getProfile()
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        username: profile?.username,
        role: profile?.role,
        fullName: profile?.fullName,
        email: profile?.email,
        phone: profile?.phone,
        farmerId: profile?.farmerId,
      }),
    )
  } catch {
    // ignore, session may still be valid with token only
  }
}
