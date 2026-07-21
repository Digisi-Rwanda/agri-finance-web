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

export const listInspectors = () => apiClient.get('/inspections/inspectors').then((r) => r.data)

export const uploadInspectionEvidence = (id, file) => {
  const form = new FormData()
  form.append('file', file)
  return apiClient
    .post(`/inspections/${id}/evidence`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export const listContractConsents = (contractId) =>
  apiClient.get(`/contracts/${contractId}/consents`).then((r) => r.data)

// --- OTP Consent Vault ---
// Step: list verified/pending consents for bank underwriting reviews
export const listConsentVault = (farmerId) =>
  apiClient
    .get('/bankability/consent-vault', { params: farmerId ? { farmerId } : {} })
    .then((r) => r.data)

export const getConsentVaultDetail = (id) =>
  apiClient.get(`/bankability/consent-vault/${id}`).then((r) => r.data)

export const listConsentOtpHistory = (contractId) =>
  apiClient.get(`/bankability/consent-vault/by-contract/${contractId}/history`).then((r) => r.data)

export const regenerateConsentCertificate = (id) =>
  apiClient.post(`/bankability/consent-vault/${id}/regenerate`).then((r) => r.data)

export const listConsentEvidence = (farmerId) =>
  apiClient.get('/bankability/consent-vault/evidence', { params: { farmerId } }).then((r) => r.data)

export const listBankProducts = (bankId) =>
  apiClient.get('/bankability/bank-products', { params: bankId ? { bankId } : {} }).then((r) => r.data)

export const createBankProduct = (payload) =>
  apiClient.post('/bankability/bank-products', payload).then((r) => r.data)

export const listPaymentWatches = (status = 'watching') =>
  apiClient.get('/bankability/payment-watches', { params: { status } }).then((r) => r.data)

// Step: Payment Watch dashboard totals (expected / received / gap / status counts)
export const fetchPaymentWatchSummary = (farmerId) =>
  apiClient
    .get('/bankability/payment-watches/summary', { params: farmerId ? { farmerId } : {} })
    .then((r) => r.data)

// Step: bank/admin overdue queue
export const listOverduePaymentWatches = () =>
  apiClient.get('/bankability/payment-watches/overdue').then((r) => r.data)

// Step: overpayments / wrong amounts for review
export const listUnmatchedPaymentWatches = () =>
  apiClient.get('/bankability/payment-watches/unmatched').then((r) => r.data)

// Step: recompute statuses + notify farmers (once per day per overdue watch)
export const scanPaymentWatchOverdue = () =>
  apiClient.post('/bankability/payment-watches/scan-overdue').then((r) => r.data)

// Step: post receipt — replace=true sets absolute total, else accumulates partials
export const recordPaymentWatchReceived = (watchId, amount, replace = false) =>
  apiClient
    .post(`/bankability/payment-watches/${watchId}/received`, { amount, replace })
    .then((r) => r.data)

export const listSettlements = () => apiClient.get('/bankability/settlements').then((r) => r.data)

export const createSettlement = (payload) =>
  apiClient.post('/bankability/settlements', payload).then((r) => r.data)

// Step: farmer/staff transparency timeline for one settlement
export const fetchSettlementTimeline = (id) =>
  apiClient.get(`/bankability/settlements/${id}/timeline`).then((r) => r.data)

// Step: all settlement timelines for a farmer
export const fetchSettlementTimelines = (farmerId) =>
  apiClient.get('/bankability/settlements/timelines', { params: { farmerId } }).then((r) => r.data)

export const listGuaranteeClaims = (status) =>
  apiClient.get('/bankability/guarantee-claims', { params: status ? { status } : {} }).then((r) => r.data)

export const openGuaranteeClaim = (payload) =>
  apiClient.post('/bankability/guarantee-claims', payload).then((r) => r.data)

export const updateGuaranteeClaim = (id, payload) =>
  apiClient.put(`/bankability/guarantee-claims/${id}`, payload).then((r) => r.data)

export const fetchGuaranteeClaimPackage = (id) =>
  apiClient.get(`/bankability/guarantee-claims/${id}/package`).then((r) => r.data)

export const generateGuaranteeClaimPackagePdf = (id) =>
  apiClient.post(`/bankability/guarantee-claims/${id}/package/pdf`).then((r) => r.data)

export const addClaimRecoveryAction = (id, payload) =>
  apiClient.post(`/bankability/guarantee-claims/${id}/recovery-actions`, payload).then((r) => r.data)

export const listClaimRecoveryActions = (id) =>
  apiClient.get(`/bankability/guarantee-claims/${id}/recovery-actions`).then((r) => r.data)

export const fetchTrustLadder = (params = {}) =>
  apiClient.get('/bankability/trust-ladder', { params }).then((r) => r.data)

export const listLoanMessages = (loanId) =>
  apiClient.get('/bankability/loan-messages', { params: { loanId } }).then((r) => r.data)

export const postLoanMessage = (payload) =>
  apiClient.post('/bankability/loan-messages', payload).then((r) => r.data)

export const uploadLoanMessageAttachment = (messageId, file) => {
  const form = new FormData()
  form.append('file', file)
  return apiClient
    .post(`/bankability/loan-messages/${messageId}/attachment`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

export const issueReceipt = (payload) =>
  apiClient.post('/bankability/receipts', payload).then((r) => r.data)

export const listExpiringReceipts = (withinDays = 30) =>
  apiClient.get('/bankability/receipts/expiring', { params: { withinDays } }).then((r) => r.data)

export const scanCollateralExpiry = () =>
  apiClient.post('/bankability/collateral/scan-expiry').then((r) => r.data)

export const createCollateralAsset = (payload) =>
  apiClient.post('/bankability/collateral-assets', payload).then((r) => r.data)

export const listCollateralAssets = (farmerId) =>
  apiClient.get('/bankability/collateral-assets', { params: { farmerId } }).then((r) => r.data)

export const listBanks = () => apiClient.get('/banks').then((r) => r.data)

export const createBank = (payload) => apiClient.post('/banks', payload).then((r) => r.data)

export const updateBank = (id, payload) => apiClient.put(`/banks/${id}`, payload).then((r) => r.data)

export const suggestLoanPackage = (farmerId, collateralType) =>
  apiClient
    .post('/loan-packages/suggest', {
      farmerId,
      ...(collateralType ? { collateralType } : {}),
    })
    .then((r) => r.data)

export const updateLoanPackageCollateral = (packageId, collateralType) =>
  apiClient
    .post(`/loan-packages/${packageId}/collateral`, { collateralType })
    .then((r) => r.data)

export const selectLoanPackageBank = (packageId, bankId) =>
  apiClient.post(`/loan-packages/${packageId}/select-bank`, { bankId }).then((r) => r.data)

export const submitLoanPackage = (packageId) =>
  apiClient.post(`/loan-packages/${packageId}/submit`).then((r) => r.data)

export const exportLoanPackage = (packageId) =>
  apiClient.get(`/loan-packages/${packageId}/export`).then((r) => r.data)

export const listBankLoanPackages = (params = {}) =>
  apiClient.get('/loan-packages', { params: { inbox: true, ...params } }).then((r) => r.data)

export const approveLoanPackage = (packageId, notes) =>
  apiClient.post(`/loan-packages/${packageId}/approve`, { notes }).then((r) => r.data)

export const rejectLoanPackage = (packageId, notes) =>
  apiClient.post(`/loan-packages/${packageId}/reject`, { notes }).then((r) => r.data)

export const disburseLoanPackage = (packageId) =>
  apiClient.post(`/loan-packages/${packageId}/disburse`).then((r) => r.data)

export const exportVerifiedFarmers = () =>
  apiClient.get('/bankability/exports/verified-farmers').then((r) => r.data)

export const listWarehouses = (status) =>
  apiClient.get('/bankability/v2/warehouses', { params: status ? { status } : {} }).then((r) => r.data)

export const applyWarehouse = (payload) =>
  apiClient.post('/bankability/v2/warehouses', payload).then((r) => r.data)

export const decideWarehouse = (id, status) =>
  apiClient.post(`/bankability/v2/warehouses/${id}/decide`, { status }).then((r) => r.data)

export const listInputLoans = (farmerId) =>
  apiClient.get('/bankability/v2/input-loans', { params: farmerId ? { farmerId } : {} }).then((r) => r.data)

export const registerInputLoan = (payload) =>
  apiClient.post('/bankability/v2/input-loans', payload).then((r) => r.data)

export const attachInputInsurance = (id, insuranceReferenceId) =>
  apiClient.post(`/bankability/v2/input-loans/${id}/insurance`, { insuranceReferenceId }).then((r) => r.data)

export const deliverInputLoan = (id) =>
  apiClient.post(`/bankability/v2/input-loans/${id}/deliver`).then((r) => r.data)

export const listGuaranteeRequests = (status) =>
  apiClient
    .get('/bankability/v2/guarantee-requests', { params: status ? { status } : {} })
    .then((r) => r.data)

export const listGuaranteeFacilities = () =>
  apiClient.get('/bankability/v2/guarantee-facilities').then((r) => r.data)

export const decideGuaranteeRequest = (id, payload) =>
  apiClient.post(`/bankability/v2/guarantee-requests/${id}/decide`, payload).then((r) => r.data)

export const selectLoanPackageReceipts = (packageId, receiptIds) =>
  apiClient.post(`/loan-packages/${packageId}/receipts`, { receiptIds }).then((r) => r.data)

export const getOutstandingInputBalance = (farmerId) =>
  apiClient.get('/bankability/v2/input-loans/outstanding', { params: { farmerId } }).then((r) => r.data)

export const confirmInputLoanByCoop = (id, confirmedByUserId) =>
  apiClient
    .post(`/bankability/v2/input-loans/${id}/coop-confirm`, { confirmedByUserId })
    .then((r) => r.data)

export const remitSettlement = (id, remittanceRef) =>
  apiClient.post(`/bankability/settlements/${id}/remit`, { remittanceRef }).then((r) => r.data)

export const listCoopWarehouses = (operatorUserId) =>
  apiClient
    .get('/bankability/v2/coop/warehouses', { params: { operatorUserId } })
    .then((r) => r.data)

export const claimCoopWarehouse = (id, operatorUserId) =>
  apiClient.post(`/bankability/v2/coop/warehouses/${id}/claim`, { operatorUserId }).then((r) => r.data)

export const getCoopDashboard = (id) =>
  apiClient.get(`/bankability/v2/coop/warehouses/${id}/dashboard`).then((r) => r.data)

export const addCoopMember = (warehouseId, farmerId, notes) =>
  apiClient
    .post(`/bankability/v2/coop/warehouses/${warehouseId}/members`, { farmerId, notes })
    .then((r) => r.data)

export const recordCoopStorage = (payload) =>
  apiClient.post('/bankability/v2/coop/storage', payload).then((r) => r.data)

export const updateCoopGovernance = (id, payload) =>
  apiClient.post(`/bankability/v2/coop/warehouses/${id}/governance`, payload).then((r) => r.data)
