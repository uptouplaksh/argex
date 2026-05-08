import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import useAuth from '../hooks/useAuth'
import useCurrency from '../hooks/useCurrency'
import useToast from '../hooks/useToast'
import { getAuction, getCategories, updateAuction } from '../services/auctionService'
import { getBidHistory } from '../services/bidService'
import { convertFromUsd, formatCurrencyCode, normalizeCurrency } from '../utils/currency'

const initialForm = {
  title: '',
  description: '',
  category_id: '',
  auction_currency: 'USD',
  starting_price: '',
  end_date: '',
  end_hour: '',
  end_minute: '00',
  end_period: 'PM',
}

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1))
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

function buildLocalDateTime(dateValue, hourValue, minuteValue, period) {
  if (!dateValue || !hourValue || !minuteValue || !period) {
    return null
  }

  const [year, month, day] = dateValue.split('-').map(Number)
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  if (!year || !month || !day || !hour || Number.isNaN(minute)) {
    return null
  }

  const hour24 = period === 'PM' ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour
  const date = new Date(year, month - 1, day, hour24, minute, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoDateTime(dateValue, hourValue, minuteValue, period) {
  return buildLocalDateTime(dateValue, hourValue, minuteValue, period)?.toISOString() || null
}

function splitDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return {}
  }

  const hour24 = date.getHours()
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12

  return {
    end_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    end_hour: String(hour12),
    end_minute: String(Math.floor(date.getMinutes() / 5) * 5).padStart(2, '0'),
    end_period: period,
  }
}

function EditAuctionPage() {
  const { auctionId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { rates, supportedCurrencies } = useCurrency()
  const [auction, setAuction] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(initialForm)
  const [hasBids, setHasBids] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadEditor = useCallback(async () => {
    setIsLoading(true)
    setSubmitError('')
    try {
      const [auctionData, categoryData, bidHistory] = await Promise.all([
        getAuction(auctionId),
        getCategories(),
        getBidHistory(auctionId),
      ])
      setAuction(auctionData)
      setCategories(categoryData || [])
      setHasBids((bidHistory || []).length > 0)
      setForm({
        ...initialForm,
        title: auctionData.title || '',
        description: auctionData.description || '',
        category_id: String(auctionData.category_id || ''),
        auction_currency: normalizeCurrency(auctionData.auction_currency, supportedCurrencies),
        starting_price: String(convertFromUsd(auctionData.starting_price || 0, normalizeCurrency(auctionData.auction_currency, supportedCurrencies), rates)),
        ...splitDateTime(auctionData.end_time),
      })
    } catch (error) {
      setSubmitError(error.message || 'Auction could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }, [auctionId, rates, supportedCurrencies])

  useEffect(() => {
    const timeout = setTimeout(loadEditor, 0)
    return () => clearTimeout(timeout)
  }, [loadEditor])

  if (!isLoading && auction && String(auction.seller_id) !== String(user?.id)) {
    return <Navigate to={`/auctions/${auctionId}`} replace />
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  const validate = () => {
    const nextErrors = {}
    const startingPrice = Number(form.starting_price)
    const endDate = buildLocalDateTime(form.end_date, form.end_hour, form.end_minute, form.end_period)

    if (!form.title.trim()) {
      nextErrors.title = 'Title is required'
    }
    if (!form.category_id) {
      nextErrors.category_id = 'Choose a category'
    }
    if (!hasBids && (!startingPrice || startingPrice <= 0)) {
      nextErrors.starting_price = 'Starting bid must be greater than zero'
    }
    if (!endDate || endDate.getTime() <= Date.now()) {
      nextErrors.end_time = 'End time must be in the future'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    try {
      await updateAuction(auction.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category_id: Number(form.category_id),
        ...(!hasBids ? { auction_currency: form.auction_currency } : {}),
        end_time: toIsoDateTime(form.end_date, form.end_hour, form.end_minute, form.end_period),
        ...(!hasBids ? { starting_price: Number(form.starting_price) } : {}),
      })
      showToast('Auction updated.', 'success')
      navigate(`/auctions/${auction.id}`, { replace: true })
    } catch (error) {
      setSubmitError(error.message || 'Auction could not be updated.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-3xl bg-white/80 shadow-soft dark:bg-slate-900/80" />
  }

  if (!auction) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-black text-app-text dark:text-white">Auction editor unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{submitError || 'Auction not found.'}</p>
        <Button className="mt-6" variant="secondary" onClick={() => navigate('/seller')}>
          Back to seller dashboard
        </Button>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm dark:border dark:border-violet-900/60 dark:bg-slate-900 dark:text-violet-200">
          Seller workspace
        </div>
        <h1 className="text-3xl font-black text-app-text dark:text-white sm:text-4xl">Edit auction</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Update listing details while preserving bidding integrity.
        </p>
      </section>

      <Card>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <Input label="Title" name="title" value={form.title} helperText={errors.title} aria-invalid={Boolean(errors.title)} onChange={updateField} />

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-app-text dark:text-slate-100">Description</span>
            <textarea
              name="description"
              className="min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-app-text shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-violet-950"
              value={form.description}
              onChange={updateField}
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-app-text dark:text-slate-100">Category</span>
              <select
                name="category_id"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition duration-200 focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950"
                value={form.category_id}
                aria-invalid={Boolean(errors.category_id)}
                onChange={updateField}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              {errors.category_id ? <span className="mt-2 block text-xs font-semibold text-red-600">{errors.category_id}</span> : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-app-text dark:text-slate-100">Currency</span>
              <select
                name="auction_currency"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-app-text shadow-sm outline-none transition duration-200 focus:border-primary focus:ring-4 focus:ring-violet-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950"
                value={form.auction_currency}
                disabled={hasBids}
                onChange={updateField}
              >
                {supportedCurrencies.map((currency) => (
                  <option key={currency} value={currency}>{formatCurrencyCode(currency)}</option>
                ))}
              </select>
              {hasBids ? <span className="mt-2 block text-xs text-slate-500">Currency cannot be modified after bidding has started.</span> : null}
            </label>

            <Input
              label={`Starting bid (${form.auction_currency})`}
              name="starting_price"
              type="number"
              min="1"
              step="1"
              value={form.starting_price}
              helperText={hasBids ? 'This field cannot be modified after bidding has started.' : errors.starting_price}
              aria-invalid={Boolean(errors.starting_price)}
              disabled={hasBids}
              onChange={updateField}
            />
          </div>

          <fieldset className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <legend className="px-1 text-sm font-black text-app-text dark:text-slate-100">End time</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto]">
              <input name="end_date" type="date" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={form.end_date} onChange={updateField} />
              <select name="end_hour" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={form.end_hour} onChange={updateField}>
                <option value="">Hour</option>
                {hourOptions.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
              <select name="end_minute" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={form.end_minute} onChange={updateField}>
                {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
              </select>
              <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                {['AM', 'PM'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={`rounded-lg px-3 py-2 text-sm font-black transition ${form.end_period === period ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/70 dark:text-violet-100' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                    onClick={() => updateField({ target: { name: 'end_period', value: period } })}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            {errors.end_time ? <p className="mt-3 text-xs font-semibold text-red-600">{errors.end_time}</p> : null}
          </fieldset>

          {submitError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate(`/auctions/${auction.id}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default EditAuctionPage
