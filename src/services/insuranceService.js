import { apiClient } from '../api/client'

const mapPolicy = (policy, farmersById = {}) => ({
  id: policy.policyId,
  farmerId: policy.farmerId,
  farmer: farmersById[policy.farmerId]?.fullName || `Farmer #${policy.farmerId}`,
  policyType: policy.policyType || 'crop',
  policyReference: policy.policyReference || '',
  premium: Number(policy.premium || 0),
  status: String(policy.status || 'ACTIVE').toUpperCase(),
  insurerId: policy.insurerId,
  validFrom: policy.validFrom || null,
  validTo: policy.validTo || null,
})

const loadFarmerDirectory = async () => {
  try {
    // Insurers need the full farmer book — do not require bank consent.
    const response = await apiClient.get('/farmers')
    const farmers = Array.isArray(response.data) ? response.data : []
    return Object.fromEntries(farmers.map((farmer) => [farmer.farmerId, farmer]))
  } catch {
    return {}
  }
}

export const listFarmersForInsurance = async () => {
  const response = await apiClient.get('/farmers')
  return Array.isArray(response.data) ? response.data : []
}

export const getPolicies = async () => {
  const policyResponse = await apiClient.get('/insurance-policies')
  const farmersById = await loadFarmerDirectory()
  const rows = Array.isArray(policyResponse.data) ? policyResponse.data : []
  return rows.map((policy) => mapPolicy(policy, farmersById))
}

export const getInsurers = async () => {
  const response = await apiClient.get('/insurance-policies/insurers')
  return Array.isArray(response.data) ? response.data : []
}

export const createInsurer = async (payload) => {
  const response = await apiClient.post('/insurance-policies/insurers', payload)
  return response.data
}

export const updatePolicyStatus = async (policyId, status) => {
  const response = await apiClient.patch(
    `/insurance-policies/${policyId}/status`,
    null,
    { params: { status } },
  )
  return response.data
}

export const createPolicy = async (payload) => {
  const response = await apiClient.post('/insurance-policies', payload)
  return response.data
}

export const getActiveInsurance = async (farmerId) => {
  const response = await apiClient.get('/insurance-policies/active', { params: { farmerId } })
  return response.data
}

export const isInsuranceRequiredError = (error) => {
  const message = String(
    error?.response?.data?.error || error?.response?.data?.message || error?.message || '',
  ).toLowerCase()
  return message.includes('insurance')
}
