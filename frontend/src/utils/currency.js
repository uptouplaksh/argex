export const FALLBACK_CURRENCIES = ['USD']

export function normalizeCurrency(currency, supportedCurrencies = FALLBACK_CURRENCIES) {
  const value = String(currency || 'USD').toUpperCase()
  return supportedCurrencies.includes(value) ? value : 'USD'
}

export function getRate(rates, currency) {
  const rate = rates?.[currency]
  return Number.isFinite(rate) && rate > 0 ? rate : null
}

export function convertFromUsd(amount, currency, rates) {
  const rate = getRate(rates, currency)
  return rate ? Number(amount || 0) * rate : Number(amount || 0)
}

export function convertToUsd(amount, currency, rates) {
  const rate = getRate(rates, currency)
  return rate ? Number(amount || 0) / rate : Number(amount || 0)
}

export function formatMoney(amount, currency = 'USD', rates) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(convertFromUsd(amount, currency, rates))
}

export function formatCurrencyCode(currency) {
  const code = String(currency || 'USD').toUpperCase()
  const symbols = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
  }
  return `${symbols[code] || code} ${code}`
}

export function formatAuctionMoney(amount, auctionCurrency = 'USD', rates, preferredCurrency) {
  const displayCurrencies = [...new Set(['USD', 'INR', 'EUR', 'GBP', ...Object.keys(rates || {})])]
  const nativeCurrency = normalizeCurrency(auctionCurrency, displayCurrencies)
  const nativeValue = formatMoney(amount, nativeCurrency, rates)
  const preferred = preferredCurrency
    ? normalizeCurrency(preferredCurrency, displayCurrencies)
    : nativeCurrency

  if (!preferred || preferred === nativeCurrency) {
    return nativeValue
  }

  return `${nativeValue} (~${formatMoney(amount, preferred, rates)})`
}

export function formatRateAge(value) {
  if (!value) {
    return 'Rates not loaded'
  }

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return 'Rates not loaded'
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (diffMinutes < 1) {
    return 'Rates updated just now'
  }
  if (diffMinutes === 1) {
    return 'Rates updated 1 minute ago'
  }
  return `Rates updated ${diffMinutes} minutes ago`
}
