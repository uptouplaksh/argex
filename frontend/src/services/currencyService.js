import api from './api'

export async function getExchangeRates({ forceRefresh = false } = {}) {
  const { data } = await api.get('/currency/rates', {
    params: forceRefresh ? { force_refresh: true } : undefined,
  })
  return data
}
