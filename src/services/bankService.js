import { apiClient } from '../api/client'

export const getFarmers = async () => {
  const response = await apiClient.get('/farmers', {
    params: { requireBankConsent: true },
  })
  return response.data
}

const toDisplayStatus = (status) => {
  if (!status) return 'Pending'
  const upper = String(status).toUpperCase()
  if (upper === 'APPROVED') return 'Approved'
  if (upper === 'REJECTED') return 'Rejected'
  if (upper === 'PENDING') return 'Pending'
  return status
}

export const getLoans = async () => {
  const [loanResponse, farmersResponse] = await Promise.all([
    apiClient.get('/loans'),
    apiClient.get('/farmers'),
  ])

  const farmersById = Object.fromEntries(
    farmersResponse.data.map((farmer) => [farmer.farmerId, farmer]),
  )

  const farmerIds = [...new Set(loanResponse.data.map((loan) => loan.farmerId).filter(Boolean))]
  const scoreEntries = await Promise.allSettled(
    farmerIds.map(async (farmerId) => {
      const response = await apiClient.get(`/credit-scores/farmer/${farmerId}/latest`)
      return [farmerId, Number(response.data?.score || 0)]
    }),
  )

  const scoresByFarmerId = Object.fromEntries(
    scoreEntries
      .filter((entry) => entry.status === 'fulfilled')
      .map((entry) => entry.value),
  )

  return loanResponse.data.map((loan) => ({
    id: loan.loanId,
    farmerId: loan.farmerId,
    farmer: farmersById[loan.farmerId]?.fullName || `Farmer #${loan.farmerId}`,
    amount: Number(loan.amount || 0),
    score: Number(scoresByFarmerId[loan.farmerId] || 0),
    status: toDisplayStatus(loan.status),
    purpose: loan.loanPurpose || 'General',
  }))
}

export const updateLoanStatus = async (loanId, status) => {
  const endpoint = status === 'Approved' ? 'approve' : 'reject'
  const response = await apiClient.patch(`/loans/${loanId}/${endpoint}`)
  return {
    id: response.data.loanId,
    farmerId: response.data.farmerId,
    amount: Number(response.data.amount || 0),
    score: Number(response.data.creditScore || 0),
    status: response.data.status || status,
  }
}
