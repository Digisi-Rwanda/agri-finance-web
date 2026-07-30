import axios from 'axios'

export const TOKEN_KEY = 'agri_finance_token'
export const USER_KEY = 'agri_finance_user'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
const authClient = axios.create({ baseURL: API_BASE_URL })

const getStoredValue = (key) => sessionStorage.getItem(key) || localStorage.getItem(key)

export const getToken = () => getStoredValue(TOKEN_KEY)

export const setToken = (token, remember = false) => {
  const storage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage
  otherStorage.removeItem(TOKEN_KEY)
  storage.setItem(TOKEN_KEY, token)
}

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export const getCurrentUser = () => {
  const raw = getStoredValue(USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    clearSession()
    return null
  }
}

export const hasAnyRole = (allowedRoles = []) => {
  const role = getCurrentUser()?.role
  return Boolean(role) && allowedRoles.includes(role)
}

const persistSession = (responseData, remember = false) => {
  const token = responseData?.token
  const role = responseData?.role
  if (!token || !role || isTokenExpired(token)) {
    throw new Error('The server returned an invalid session')
  }

  const user = {
    username: responseData?.username,
    role,
  }
  const storage = remember ? localStorage : sessionStorage
  const otherStorage = remember ? sessionStorage : localStorage
  setToken(token, remember)
  otherStorage.removeItem(USER_KEY)
  storage.setItem(USER_KEY, JSON.stringify(user))
  return { token, user }
}

export const loginUser = async ({ identifier, password, remember = false }) => {
  const response = await authClient.post('/auth/login', {
    username: identifier?.trim(),
    password,
  })
  return persistSession(response.data, remember)
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

/**
 * Updates fields the signed-in account holder owns. Email, username and role
 * are intentionally excluded; those remain administrator-controlled.
 */
export const updateProfile = async ({ fullName, phone }) => {
  const token = getToken()
  await authClient.patch(
    '/auth/profile',
    {
      fullName: fullName?.trim(),
      phone,
    },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Some APIs return only the changed fields (or 204). Re-read the canonical
  // profile so every consumer receives the complete, server-normalized object.
  const profile = await getProfile()
  const storage = sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : localStorage
  const current = getCurrentUser() || {}
  storage.setItem(
    USER_KEY,
    JSON.stringify({
      ...current,
      fullName: profile?.fullName,
      phone: profile?.phone,
      email: profile?.email ?? current.email,
      username: profile?.username ?? current.username,
      role: profile?.role ?? current.role,
    }),
  )
  window.dispatchEvent(new CustomEvent('agri:profile-updated', { detail: profile }))
  return profile
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
    return true
  }
}

export const hydrateSessionUser = async () => {
  try {
    const profile = await getProfile()
    const storage = sessionStorage.getItem(TOKEN_KEY) ? sessionStorage : localStorage
    storage.setItem(
      USER_KEY,
      JSON.stringify({
        userId: profile?.userId,
        username: profile?.username,
        role: profile?.role,
        fullName: profile?.fullName,
        email: profile?.email,
        phone: profile?.phone,
        farmerId: profile?.farmerId,
      }),
    )
    return profile
  } catch {
    // ignore, session may still be valid with token only
    return null
  }
}
