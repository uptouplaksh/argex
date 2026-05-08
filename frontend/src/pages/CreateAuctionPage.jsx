import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import useAuth from '../hooks/useAuth'
import useCurrency from '../hooks/useCurrency'
import useToast from '../hooks/useToast'
import { createAuction, getCategories } from '../services/auctionService'
import { formatCurrencyCode, normalizeCurrency } from '../utils/currency'

const initialForm = {
  title: '',
  description: '',
  category_id: '',
  auction_currency: 'USD',
  starting_price: '',
  start_date: '',
  start_hour: '',
  start_minute: '00',
  start_period: 'AM',
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

function TimeSelector({ dateName, dateValue, error, helperText, hourName, hourValue, label, minuteName, minuteValue, onChange, periodName, periodValue }) {
  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition duration-200 focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950'

  return (
    <fieldset className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <legend className="px-1 text-sm font-black text-app-text dark:text-slate-100">{label}</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_auto]">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Date</span>
          <input
            name={dateName}
            type="date"
            className={fieldClass}
            value={dateValue}
            aria-invalid={Boolean(error)}
            onChange={onChange}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Hour</span>
          <select name={hourName} className={fieldClass} value={hourValue} aria-invalid={Boolean(error)} onChange={onChange}>
            <option value="">Hour</option>
            {hourOptions.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Minute</span>
          <select name={minuteName} className={fieldClass} value={minuteValue} onChange={onChange}>
            {minuteOptions.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">AM/PM</span>
          <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {['AM', 'PM'].map((period) => (
              <button
                key={period}
                type="button"
                className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                  periodValue === period
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/70 dark:text-violet-100'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                aria-pressed={periodValue === period}
                onClick={() => onChange({ target: { name: periodName, value: period } })}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error || helperText ? (
        <p className={`mt-3 text-xs ${error ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
          {error || helperText}
        </p>
      ) : null}
    </fieldset>
  )
}

function CreateAuctionPage() {
  const [form, setForm] = useState(initialForm)
  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAuth()
  const { supportedCurrencies } = useCurrency()

  useEffect(() => {
    let isMounted = true

    async function loadCategories() {
      try {
        const data = await getCategories()
        if (isMounted) {
          setCategories(data || [])
          setForm((current) => ({
            ...current,
            auction_currency: normalizeCurrency(user?.preferred_currency, supportedCurrencies),
          }))
        }
      } catch (error) {
        if (isMounted) {
          setSubmitError(error.message || 'Categories could not be loaded.')
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false)
        }
      }
    }

    loadCategories()

    return () => {
      isMounted = false
    }
  }, [supportedCurrencies, user?.preferred_currency])

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  const validate = () => {
    const nextErrors = {}
    const startingPrice = Number(form.starting_price)
    const startDate = buildLocalDateTime(form.start_date, form.start_hour, form.start_minute, form.start_period)
    const endDate = buildLocalDateTime(form.end_date, form.end_hour, form.end_minute, form.end_period)
    const startTime = startDate?.getTime() || Date.now()
    const endTime = endDate?.getTime() ?? Number.NaN

    if (!form.title.trim()) {
      nextErrors.title = 'Title is required'
    }

    if (!form.category_id) {
      nextErrors.category_id = 'Choose a category'
    }

    if (!startingPrice || startingPrice <= 0) {
      nextErrors.starting_price = 'Starting bid must be greater than zero'
    }

    if ((form.start_date || form.start_hour) && !startDate) {
      nextErrors.start_time = 'Choose a complete start date and 12-hour time, or leave it blank.'
    }

    if (!endDate || Number.isNaN(endTime)) {
      nextErrors.end_time = 'Choose an end date and 12-hour time.'
    } else if (endTime <= startTime) {
      nextErrors.end_time = 'End time must be after the start time'
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
      const auction = await createAuction({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category_id: Number(form.category_id),
        auction_currency: form.auction_currency,
        starting_price: Number(form.starting_price),
        start_time: toIsoDateTime(form.start_date, form.start_hour, form.start_minute, form.start_period),
        end_time: toIsoDateTime(form.end_date, form.end_hour, form.end_minute, form.end_period),
      })

      showToast('Auction created.', 'success')
      navigate(`/auctions/${auction.id}`, { replace: true })
    } catch (error) {
      setSubmitError(error.message || 'Auction could not be created.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm dark:border dark:border-violet-900/60 dark:bg-slate-900 dark:text-violet-200">
          Seller workspace
        </div>
        <h1 className="text-3xl font-black text-app-text dark:text-white sm:text-4xl">Create auction</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Launch a verified marketplace listing with clear timing, category, and opening bid.
        </p>
      </section>

      <Card>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <Input
            label="Title"
            name="title"
            placeholder="Collector camera kit"
            value={form.title}
            helperText={errors.title}
            aria-invalid={Boolean(errors.title)}
            onChange={updateField}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-app-text dark:text-slate-100">Description</span>
            <textarea
              name="description"
              className="min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-app-text shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-violet-950"
              placeholder="Describe condition, included items, provenance, or delivery details."
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
                disabled={isLoadingCategories}
                onChange={updateField}
              >
                <option value="">{isLoadingCategories ? 'Loading categories...' : 'Select category'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id ? <span className="mt-2 block text-xs font-semibold text-red-600">{errors.category_id}</span> : null}
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-app-text dark:text-slate-100">Currency</span>
              <select
                name="auction_currency"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-app-text shadow-sm outline-none transition duration-200 focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950"
                value={form.auction_currency}
                onChange={updateField}
              >
                {supportedCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {formatCurrencyCode(currency)}
                  </option>
                ))}
              </select>
            </label>

            <Input
              label={`Starting bid (${form.auction_currency})`}
              name="starting_price"
              type="number"
              min="1"
              step="1"
              placeholder={form.auction_currency === 'INR' ? '45000' : '500'}
              value={form.starting_price}
              helperText={errors.starting_price}
              aria-invalid={Boolean(errors.starting_price)}
              onChange={updateField}
            />
          </div>

          <div className="grid gap-5">
            <TimeSelector
              label="Start time"
              dateName="start_date"
              dateValue={form.start_date}
              hourName="start_hour"
              hourValue={form.start_hour}
              minuteName="start_minute"
              minuteValue={form.start_minute}
              periodName="start_period"
              periodValue={form.start_period}
              helperText="Leave all start fields blank to start immediately."
              error={errors.start_time}
              onChange={updateField}
            />
            <TimeSelector
              label="End time"
              dateName="end_date"
              dateValue={form.end_date}
              hourName="end_hour"
              hourValue={form.end_hour}
              minuteName="end_minute"
              minuteValue={form.end_minute}
              periodName="end_period"
              periodValue={form.end_period}
              error={errors.end_time}
              onChange={updateField}
            />
          </div>

          {submitError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => navigate('/seller')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingCategories}>
              {isSubmitting ? 'Creating...' : 'Create Auction'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default CreateAuctionPage
