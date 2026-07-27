import { apiClient } from '../api/client'
import { getFarmers } from './farmerService'

export const getPolicies = async () => {
  const [policyResponse, farmers] = await Promise.all([
    apiClient.get('/insurance-policies'),
    getFarmers(),
  ])

  const farmersById = Object.fromEntries(farmers.map((farmer) => [farmer.farmerId, farmer]))

  return policyResponse.data.map((policy) => ({
    id: policy.policyId,
    farmerId: policy.farmerId,
    farmer: farmersById[policy.farmerId]?.fullName || `Farmer #${policy.farmerId}`,
    policyType: policy.policyType || 'General',
    policyReference: policy.policyReference || '',
    premium: Number(policy.premium || 0),
    status: policy.status || 'ACTIVE',
    insurerId: policy.insurerId,
    validFrom: policy.validFrom,
    validTo: policy.validTo,
  }))
}

export const getInsurers = async () => {
  const response = await apiClient.get('/insurance-policies/insurers')
  return response.data
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

/** True when /active returns a real policy (policyId) or explicit active flag. */
export const isActiveInsurancePayload = (data) =>
  Boolean(data?.policyId) || data?.active === true

async function resolveInsurerId() {
  const insurers = await getInsurers()
  if (Array.isArray(insurers) && insurers[0]?.insurerId) {
    return Number(insurers[0].insurerId)
  }
  const created = await createInsurer({ insurerName: 'Default Agri Insurer' })
  return Number(created.insurerId)
}

/**
 * Spec §10: loan approval needs an ACTIVE policy in its validity window.
 * Creates a 1-year crop policy (and a default insurer if needed) when none exists.
 */
export const ensureActiveInsuranceForFarmer = async (farmerId) => {
  if (!farmerId) {
    throw new Error('Farmer id is required for insurance')
  }

  try {
    const existing = await getActiveInsurance(farmerId)
    if (isActiveInsurancePayload(existing)) return existing
  } catch {
    // No active policy — create one below.
  }

  const insurerId = await resolveInsurerId()
  return createPolicy({
    farmerId: Number(farmerId),
    insurerId,
    policyType: 'crop',
    status: 'ACTIVE',
  })
}

export const isInsuranceRequiredError = (error) => {
  const message = String(
    error?.response?.data?.error || error?.response?.data?.message || error?.message || '',
  ).toLowerCase()
  return message.includes('insurance')
}
