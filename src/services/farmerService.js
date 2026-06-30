import { apiClient } from '../api/client'

const ACTIVE_LOAN_STATUSES = new Set(['APPROVED', 'DISBURSED', 'PENDING'])

export const getFarmers = async () => {
  const response = await apiClient.get('/farmers', {
    params: { requireBankConsent: true },
  })
  return response.data
}

export const enrichFarmersWithInsights = async (farmers = [], { includeLoans = true } = {}) => {
  if (!farmers.length) return []

  const farmerIds = farmers.map((farmer) => farmer.farmerId).filter(Boolean)

  const scoreResults = await Promise.allSettled(
    farmerIds.map((farmerId) =>
      apiClient.get(`/credit-scores/farmer/${farmerId}/latest`).then((response) => ({
        farmerId,
        score: response.data,
      })),
    ),
  )

  let loans = []
  if (includeLoans) {
    try {
      const loansResult = await apiClient.get('/loans')
      loans = loansResult.data || []
    } catch {
      loans = []
    }
  }

  const scoresByFarmerId = {}
  scoreResults.forEach((entry) => {
    if (entry.status !== 'fulfilled') return
    const { farmerId, score } = entry.value
    scoresByFarmerId[farmerId] = score
  })

  const activeLoanByFarmerId = {}
  loans.forEach((loan) => {
    const status = String(loan.status || '').toUpperCase()
    if (!ACTIVE_LOAN_STATUSES.has(status)) return
    if (!activeLoanByFarmerId[loan.farmerId]) {
      activeLoanByFarmerId[loan.farmerId] = status
    }
  })

  return farmers.map((farmer) => {
    const latestScore = scoresByFarmerId[farmer.farmerId]
    const activeLoan = activeLoanByFarmerId[farmer.farmerId] || null
    return {
      ...farmer,
      latestCreditScore: latestScore?.score ?? null,
      creditScore: latestScore?.score ?? null,
      riskLevel: latestScore?.riskLevel || null,
      activeLoan,
      hasActiveLoan: Boolean(activeLoan),
    }
  })
}

export const getFarmersWithInsights = async (options) => {
  const farmers = await getFarmers()
  return enrichFarmersWithInsights(farmers, options)
}

export const getFarmerById = async (farmerId) => {
  const response = await apiClient.get(`/farmers/${farmerId}`, {
    params: { requireBankConsent: true },
  })
  return response.data
}

export const getFarmsByFarmerId = async (farmerId) => {
  const response = await apiClient.get(`/farms/farmer/${farmerId}`)
  return response.data
}

export const getYieldHistoryForFarms = async (farms = []) => {
  if (!farms.length) return []

  const results = await Promise.allSettled(
    farms.map((farm) =>
      apiClient.get(`/farms/${farm.farmId}/yield-history`).then((response) =>
        (response.data || []).map((record) => ({
          ...record,
          farmName: farm.name || `Farm #${farm.farmId}`,
          cropType: farm.cropType,
        })),
      ),
    ),
  )

  return results
    .filter((entry) => entry.status === 'fulfilled')
    .flatMap((entry) => entry.value)
    .sort((a, b) => {
      const yearDiff = Number(b.year || 0) - Number(a.year || 0)
      if (yearDiff !== 0) return yearDiff
      return String(b.season || '').localeCompare(String(a.season || ''))
    })
}

export const getTransactionsByFarmerId = async (farmerId) => {
  const response = await apiClient.get(`/transactions/farmer/${farmerId}`, {
    params: { requireTransactionsConsent: true },
  })
  return response.data
}

export const getPaymentMovementsByFarmerId = async (farmerId) => {
  const response = await apiClient.get('/payments/history', {
    params: { farmerId },
  })
  return response.data
}

export const getMobileMoneyByFarmerId = async (farmerId) => {
  const response = await apiClient.get('/payments/mobile-money', {
    params: { farmerId },
  })
  return response.data
}

export const getLatestCreditScore = async (farmerId) => {
  const response = await apiClient.get(`/credit-scores/farmer/${farmerId}/latest`)
  return response.data
}

export const getLoansByFarmerId = async (farmerId) => {
  const response = await apiClient.get('/loans', { params: { farmerId } })
  return response.data
}

export const getInsurancePoliciesByFarmerId = async (farmerId) => {
  const response = await apiClient.get('/insurance-policies', { params: { farmerId } })
  return response.data
}
