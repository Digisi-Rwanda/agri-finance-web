import { apiClient } from '../api/client'

export const getAdminReportSummary = () =>
  apiClient.get('/admin-reports/summary').then((r) => r.data)

export const getAdminReportLoans = () =>
  apiClient.get('/admin-reports/loans').then((r) => r.data)

export const getAdminReportRepayments = () =>
  apiClient.get('/admin-reports/repayments').then((r) => r.data)

export const getAdminReportHarvest = () =>
  apiClient.get('/admin-reports/harvest').then((r) => r.data)

export const getAdminReportReceipts = () =>
  apiClient.get('/admin-reports/warehouse-receipts').then((r) => r.data)

export const getAdminReportInsurance = () =>
  apiClient.get('/admin-reports/insurance').then((r) => r.data)
