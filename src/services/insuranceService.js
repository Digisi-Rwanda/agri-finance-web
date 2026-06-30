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
    premium: Number(policy.premium || 0),
    status: policy.status || 'ACTIVE',
    insurerId: policy.insurerId,
  }))
}

export const getInsurers = async () => {
  const response = await apiClient.get('/insurance-policies/insurers')
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
