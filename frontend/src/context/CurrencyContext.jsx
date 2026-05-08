import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { getExchangeRates } from '../services/currencyService'

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const [snapshot, setSnapshot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRates = useCallback(async ({ forceRefresh = false, showLoader = false } = {}) => {
    if (showLoader) {
      setIsLoading(true)
    }

    try {
      const data = await getExchangeRates({ forceRefresh })
      setSnapshot(data)
      setError(data?.error || '')
    } catch (loadError) {
      setError(loadError.message || 'Exchange rates unavailable')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => loadRates({ showLoader: true }), 0)
    const interval = setInterval(() => loadRates(), 10 * 60 * 1000)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [loadRates])

  const value = useMemo(
    () => ({
      baseCurrency: snapshot?.base || 'USD',
      error,
      fetchedAt: snapshot?.fetched_at || null,
      isLoading,
      isStale: Boolean(snapshot?.stale),
      provider: snapshot?.provider || 'Frankfurter',
      providerDate: snapshot?.provider_date || null,
      rates: snapshot?.rates || { USD: 1 },
      refreshRates: () => loadRates({ forceRefresh: true, showLoader: false }),
      supportedCurrencies: snapshot?.supported_currencies || ['USD'],
    }),
    [error, isLoading, loadRates, snapshot],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export default CurrencyContext
