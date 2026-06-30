import { apiClient } from '../api/client'
import { resolvePrimaryFarmerId } from './auth'

const CONSENT_TYPES = {
  shareTransactions: 'TRANSACTIONS',
  shareSatelliteData: 'SATELLITE',
}

const toConsentState = (transactionsConsent, satelliteConsent) => ({
  shareTransactions: Boolean(transactionsConsent?.granted),
  shareSatelliteData: Boolean(satelliteConsent?.granted),
  meta: {
    transactionsConsentId: transactionsConsent?.consentId || null,
    satelliteConsentId: satelliteConsent?.consentId || null,
    farmerId: transactionsConsent?.farmerId || satelliteConsent?.farmerId || null,
  },
})

export const getConsent = async () => {
  const farmerId = await resolvePrimaryFarmerId()
  if (!farmerId) {
    return { shareTransactions: false, shareSatelliteData: false, meta: { farmerId: null } }
  }

  const [transactionsResponse, satelliteResponse] = await Promise.allSettled([
    apiClient.get('/consents/latest', { params: { farmerId, dataType: 'TRANSACTIONS' } }),
    apiClient.get('/consents/latest', { params: { farmerId, dataType: 'SATELLITE' } }),
  ])

  const transactions = transactionsResponse.status === 'fulfilled' ? transactionsResponse.value.data : null
  const satellite = satelliteResponse.status === 'fulfilled' ? satelliteResponse.value.data : null

  return toConsentState(transactions, satellite)
}

export const updateConsent = async (updates) => {
  const state = await getConsent()
  const changedKey = Object.keys(updates)[0]
  const nextValue = updates[changedKey]
  const dataType = CONSENT_TYPES[changedKey]

  if (!state.meta?.farmerId || !dataType) {
    throw new Error('Unable to resolve farmer consent context.')
  }

  if (nextValue) {
    await apiClient.post('/consents/grant', null, {
      params: { farmerId: state.meta.farmerId, dataType },
    })
  } else {
    const consentId =
      changedKey === 'shareTransactions'
        ? state.meta.transactionsConsentId
        : state.meta.satelliteConsentId

    if (consentId) {
      await apiClient.patch(`/consents/${consentId}/revoke`)
    }
  }

  return getConsent()
}
