import { apiClient } from '../api/client'

export const getAuditLogs = async () => {
  const response = await apiClient.get('/audit-logs')
  return response.data
}

export const getAdminStats = async () => {
  const response = await apiClient.get('/admin/stats')
  return response.data
}

export const getAdminUsers = async () => {
  const response = await apiClient.get('/admin/users')
  return response.data
}

export const createAdminPartner = async ({ email, role, fullName, phone, password }) => {
  const normalizedEmail = email?.trim().toLowerCase()
  const payload = {
    // The backend derives `username` from the email, so both are sent together.
    username: normalizedEmail,
    email: normalizedEmail,
    role,
    fullName: fullName?.trim(),
    password,
  }
  if (phone) payload.phone = phone

  const response = await apiClient.post('/admin/users', payload)
  return response.data
}

export const updateAdminUserRole = async (userId, role) => {
  const response = await apiClient.patch(`/admin/users/${userId}/role`, { role })
  return response.data
}

export const deleteAdminUser = async (userId) => {
  await apiClient.delete(`/admin/users/${userId}`)
}
