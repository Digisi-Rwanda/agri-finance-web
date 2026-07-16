import { apiClient } from '../api/client'

/**
 * Bankability Layer web API helpers.
 * Comment: used by inspection queue, bank products, settlements, guarantees, contracts.
 */

export const listContracts = (farmerId) =>
  apiClient.get('/contracts', { params: farmerId ? { farmerId } : {} }).then((r) => r.data)

export const getContract = (id) => apiClient.get(`/contracts/${id}`).then((r) => r.data)

export const startBuyerConsent = (id) =>
  apiClient.post(`/contracts/${id}/buyer-consent/start`).then((r) => r.data)

export const listInspections = (outcome) =>
  apiClient.get('/inspections', { params: outcome ? { outcome } : {} }).then((r) => r.data)

export const createInspection = (payload) =>
  apiClient.post('/inspections', payload).then((r) => r.data)

export const updateInspection = (id, payload) =>
  apiClient.put(`/inspections/${id}`, payload).then((r) => r.data)

export const decideInspection = (id, outcome, adminId) =>
  apiClient.post(`/inspections/${id}/decide`, { outcome, adminId }).then((r) => r.data)

export const listBankProducts = (bankId) =>
  apiClient.get('/bankability/bank-products', { params: bankId ? { bankId } : {} }).then((r) => r.data)

export const createBankProduct = (payload) =>
  apiClient.post('/bankability/bank-products', payload).then((r) => r.data)

export const listPaymentWatches = (status = 'watching') =>
  apiClient.get('/bankability/payment-watches', { params: { status } }).then((r) => r.data)

export const listSettlements = () => apiClient.get('/bankability/settlements').then((r) => r.data)

export const createSettlement = (payload) =>
  apiClient.post('/bankability/settlements', payload).then((r) => r.data)

export const listGuaranteeClaims = (status) =>
  apiClient.get('/bankability/guarantee-claims', { params: status ? { status } : {} }).then((r) => r.data)

export const openGuaranteeClaim = (payload) =>
  apiClient.post('/bankability/guarantee-claims', payload).then((r) => r.data)

export const updateGuaranteeClaim = (id, payload) =>
  apiClient.put(`/bankability/guarantee-claims/${id}`, payload).then((r) => r.data)

export const listLoanMessages = (loanId) =>
  apiClient.get('/bankability/loan-messages', { params: { loanId } }).then((r) => r.data)

export const postLoanMessage = (payload) =>
  apiClient.post('/bankability/loan-messages', payload).then((r) => r.data)

export const issueReceipt = (payload) =>
  apiClient.post('/bankability/receipts', payload).then((r) => r.data)

export const listExpiringReceipts = (withinDays = 30) =>
  apiClient.get('/bankability/receipts/expiring', { params: { withinDays } }).then((r) => r.data)

export const listBanks = () => apiClient.get('/banks').then((r) => r.data)
