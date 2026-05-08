import { useState } from 'react'
import { convertFromUsd, convertToUsd, formatMoney, normalizeCurrency } from '../utils/currency'
import Button from './Button'
import Input from './Input'

function BidForm({ currentPrice, currency = 'USD', disabled, disabledReason, isRateReady = true, isSubmitting, onSubmit, rates }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const minimumBid = Number(currentPrice || 0) + 1
  const displayCurrency = normalizeCurrency(currency, Object.keys(rates || { USD: 1 }))
  const displayMinimumBid = convertFromUsd(minimumBid, displayCurrency, rates)
  const displayCurrentPrice = convertFromUsd(currentPrice, displayCurrency, rates)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const numericAmount = Number(amount)

    if (!amount) {
      setError('Enter a bid amount')
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Bid amount must be greater than zero')
      return
    }

    if (numericAmount <= displayCurrentPrice) {
      setError(`Bid must be higher than ${formatMoney(currentPrice, displayCurrency, rates)}`)
      return
    }

    setError('')
    await onSubmit(convertToUsd(numericAmount, displayCurrency, rates))
    setAmount('')
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <Input
        label={`Your bid (${displayCurrency})`}
        name="bid-amount"
        type="number"
        min={displayMinimumBid}
        step="1"
        placeholder={`Minimum ${formatMoney(minimumBid, displayCurrency, rates)}`}
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value)
          setError('')
        }}
        helperText={error || disabledReason || (!isRateReady ? 'Live exchange rates are loading.' : `Enter more than the current bid.`)}
        aria-invalid={Boolean(error)}
        disabled={disabled || isSubmitting || !isRateReady}
      />
      <Button className="w-full" type="submit" disabled={disabled || isSubmitting || !isRateReady}>
        {isSubmitting ? 'Placing bid...' : 'Place bid'}
      </Button>
    </form>
  )
}

export default BidForm
