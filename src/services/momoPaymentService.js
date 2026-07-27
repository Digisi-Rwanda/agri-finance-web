import { apiClient } from '../api/client'

export const requestLoanRepayment = async (payload) => {
  const response = await apiClient.post('/payments/loan-repayment', payload)
  return response.data
}

export const requestWalletTopup = async (payload) => {
  const response = await apiClient.post('/payments/wallet-topup', payload)
  return response.data
}

export const requestInsurancePayment = async (payload) => {
  const response = await apiClient.post('/payments/insurance-collection', payload)
  return response.data
}

export const requestLoanDisbursement = async (payload) => {
  const response = await apiClient.post('/payments/loan-disbursement', payload)
  return response.data
}

export const fetchPaymentHistory = async (farmerId) => {
  const response = await apiClient.get('/payments/history', {
    params: farmerId != null ? { farmerId } : {},
  })
  return response.data
}

export const fetchWalletBalance = async (farmerId) => {
  const response = await apiClient.get(`/payments/wallet/${farmerId}`)
  return response.data
}

export const refreshPaymentStatus = async (paymentId) => {
  const response = await apiClient.post(`/payments/${paymentId}/refresh-status`)
  return response.data
}

export const fetchEkashStatus = async () => {
  const response = await apiClient.get('/payments/ekash/status')
  return response.data
}

export const fetchEkashStatement = async (farmerId, { phone, days = 90, provider = 'EKASH' } = {}) => {
  const response = await apiClient.get('/payments/ekash/statement', {
    params: { farmerId, phone, days, provider },
  })
  return response.data
}

/** Refresh statement from provider for viewing (same as farmer app sync). */
export const syncEkashStatement = async (farmerId, { phone, days = 90, provider = 'EKASH' } = {}) => {
  const response = await apiClient.post('/payments/ekash/sync', null, {
    params: { farmerId, phone, days, provider },
  })
  return response.data
}

/** Load history and refresh a few PENDING rows so bank sees live statuses (mirrors farmer app). */
export const fetchPaymentHistoryWithRefresh = async (farmerId) => {
  const list = (await fetchPaymentHistory(farmerId)) || []
  const pending = list
    .filter((row) => String(row.status || '').toUpperCase() === 'PENDING')
    .slice(0, 5)
  if (pending.length) {
    await Promise.allSettled(pending.map((row) => refreshPaymentStatus(row.paymentId)))
    return (await fetchPaymentHistory(farmerId)) || list
  }
  return list
}
