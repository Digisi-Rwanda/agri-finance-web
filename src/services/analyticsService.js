import { apiClient } from '../api/client'

export const getAnalyticsOverview = async () => {
  const response = await apiClient.get('/analytics/overview')
  return response.data
}
