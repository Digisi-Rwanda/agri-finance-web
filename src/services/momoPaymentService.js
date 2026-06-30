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
  const response = await apiClient.get('/payments/history', { params: { farmerId } })
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
