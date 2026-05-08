import { useState } from 'react'
import { convertFromUsd, convertToUsd, formatMoney, normalizeCurrency } from '../utils/currency'
import Button from './Button'
import Input from './Input'

const presetMultipliers = [10, 25, 50]

function AutoBidPanel({
  autoBid,
  currentPrice,
  currency = 'USD',
  disabled,
  disabledReason,
  isRateReady = true,
  isSubmitting,
  onDisable,
  onSubmit,
  rates,
  walletBalance,
}) {
  const [isOpen, setIsOpen] = useState(Boolean(autoBid?.is_active))
  const [maxAmount, setMaxAmount] = useState('')
  const [incrementAmount, setIncrementAmount] = useState('1')
  const [error, setError] = useState('')
  const displayCurrency = normalizeCurrency(currency, Object.keys(rates || { USD: 1 }))
  const displayCurrentPrice = convertFromUsd(currentPrice, displayCurrency, rates)
  const displayBalance = convertFromUsd(walletBalance || 0, displayCurrency, rates)
  const minimumMaxBid = Number(currentPrice || 0) + 1
  const displayMinimumMaxBid = convertFromUsd(minimumMaxBid, displayCurrency, rates)
  const marketIncrement = convertFromUsd(1, displayCurrency, rates)

  const statusTone = autoBid?.is_active
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
    : autoBid
      ? 'border-slate-100 bg-slate-50 text-slate-600'
      : 'border-violet-100 bg-violet-50 text-violet-700'

  const panelOpen = isOpen || Boolean(autoBid?.is_active)
  const step = Math.max(1, Number(incrementAmount) || marketIncrement || 1)
  const presets = presetMultipliers.map((multiplier) => {
    const value = displayCurrentPrice + step * multiplier
    return {
      label: `+${multiplier}`,
      value: Math.ceil(value),
    }
  })

  const validate = () => {
    const numericAmount = Number(maxAmount)

    if (!maxAmount) {
      return 'Enter a max auto-bid amount'
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return 'Max auto-bid amount must be greater than zero'
    }

    if (numericAmount <= displayCurrentPrice) {
      return `Max auto-bid must be higher than ${formatMoney(currentPrice, displayCurrency, rates)}`
    }

    if (walletBalance !== undefined && numericAmount > displayBalance) {
      return 'Insufficient balance for that auto-bid limit'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    await onSubmit(convertToUsd(Number(maxAmount), displayCurrency, rates))
  }

  const handlePreset = (value) => {
    setMaxAmount(String(value))
    setError('')
  }

  return (
    <section className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 transition duration-300 dark:border-violet-900 dark:bg-violet-950/25">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-violet-700 dark:text-violet-200">Auto-Bid</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {autoBid?.is_active ? 'Active limit in place' : autoBid ? 'Paused for this auction' : 'Set a ceiling and stay competitive'}
          </p>
        </div>
        <button
          type="button"
          className={`rounded-full border px-3 py-1 text-xs font-black transition ${statusTone}`}
          onClick={() => setIsOpen((current) => !current)}
          disabled={disabled && !panelOpen}
        >
          {autoBid?.is_active ? 'Configure' : panelOpen ? 'Hide' : 'Enable Auto-Bid'}
        </button>
      </div>

      {autoBid ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-white/80 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
            <p className={`mt-1 text-sm font-black ${autoBid.is_active ? 'text-emerald-700' : 'text-slate-600'}`}>
              {autoBid.is_active ? 'Auto-Bid Active' : 'Auto-Bid Paused'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Max limit</p>
            <p className="mt-1 text-sm font-black text-app-text">{formatMoney(autoBid.max_bid, displayCurrency, rates)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Current auto state</p>
            <p className="mt-1 text-sm font-black text-app-text">{formatMoney(autoBid.current_bid || 0, displayCurrency, rates)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Market step</p>
            <p className="mt-1 text-sm font-black text-app-text">{formatMoney(1, displayCurrency, rates)}</p>
          </div>
        </div>
      ) : null}

      <div
        className={`grid transition-all duration-300 ${
          panelOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Input
              label={`Max Auto-Bid Amount (${displayCurrency})`}
              name="auto-bid-max"
              type="number"
              min={displayMinimumMaxBid}
              step="1"
              placeholder={`Above ${formatMoney(currentPrice, displayCurrency, rates)}`}
              value={maxAmount}
              onChange={(event) => {
                setMaxAmount(event.target.value)
                setError('')
              }}
              helperText={error || disabledReason || ' '}
              aria-invalid={Boolean(error)}
              disabled={disabled || isSubmitting || !isRateReady}
            />

            <div>
              <Input
                label={`Bid Increment (${displayCurrency})`}
                name="auto-bid-increment"
                type="number"
                min="1"
                step="1"
                value={incrementAmount}
                onChange={(event) => setIncrementAmount(event.target.value)}
                helperText=" "
                disabled={disabled || isSubmitting || !isRateReady}
              />
              <div className="-mt-3 flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-700 transition hover:border-sky-200 hover:bg-sky-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                    onClick={() => handlePreset(preset.value)}
                    disabled={disabled || isSubmitting || !isRateReady}
                  >
                    {formatMoney(convertToUsd(preset.value, displayCurrency, rates), displayCurrency, rates)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="submit" disabled={disabled || isSubmitting || !isRateReady}>
                {isSubmitting ? 'Activating...' : autoBid ? 'Update Auto-Bid' : 'Activate Auto-Bid'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!autoBid?.is_active || isSubmitting}
                onClick={onDisable}
              >
                Disable Auto-Bid
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default AutoBidPanel
