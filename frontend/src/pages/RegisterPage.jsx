import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import PasswordToggle from '../components/PasswordToggle'
import useAuth from '../hooks/useAuth'
import useCurrency from '../hooks/useCurrency'
import { registerUser } from '../services/authService'
import { normalizeCurrency } from '../utils/currency'

const initialForm = {
  username: '',
  email: '',
  phone_number: '',
  password: '',
  preferred_currency: 'USD',
}

function RegisterPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { isAuthenticated } = useAuth()
  const { supportedCurrencies } = useCurrency()
  const navigate = useNavigate()

  if (isAuthenticated) {
    return <Navigate to="/auctions" replace />
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
    setSuccessMessage('')
  }

  const validate = () => {
    const nextErrors = {}
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!form.username.trim()) {
      nextErrors.username = 'Username is required'
    } else if (form.username.trim().length < 3) {
      nextErrors.username = 'Username must be at least 3 characters'
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required'
    } else if (!emailPattern.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address'
    }

    if (form.phone_number.trim() && !/^[+0-9()\-\s]{7,20}$/.test(form.phone_number.trim())) {
      nextErrors.phone_number = 'Enter a valid phone number'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required'
    } else if (form.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters'
    } else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      nextErrors.password = 'Password must include letters and numbers'
    }

    if (!supportedCurrencies.includes(normalizeCurrency(form.preferred_currency, supportedCurrencies))) {
      nextErrors.preferred_currency = 'Choose a supported currency'
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
      const response = await registerUser({
        username: form.username.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim() || null,
        password: form.password,
        preferred_currency: normalizeCurrency(form.preferred_currency, supportedCurrencies),
      })
      if (response?.otp_required) {
        navigate('/verify-otp', {
          replace: true,
          state: { otpSession: response, redirectTo: '/auctions' },
        })
      } else {
        setSuccessMessage('Account created. Redirecting to sign in...')
        setTimeout(() => navigate('/login', { replace: true }), 700)
      }
    } catch (error) {
      setSubmitError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md items-center">
      <Card>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-app-text">Create account</h1>
          <p className="mt-2 text-sm text-slate-500">
            New accounts start with bidder access.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Username"
            name="username"
            placeholder="your_username"
            value={form.username}
            onChange={updateField}
            helperText={errors.username}
            aria-invalid={Boolean(errors.username)}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={updateField}
            helperText={errors.email}
            aria-invalid={Boolean(errors.email)}
          />
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={updateField}
            helperText={errors.password}
            aria-invalid={Boolean(errors.password)}
            trailingElement={
              <PasswordToggle isVisible={showPassword} onToggle={() => setShowPassword((current) => !current)} />
            }
          />
          <Input
            label="Phone number"
            name="phone_number"
            placeholder="+1 555 0100"
            value={form.phone_number}
            onChange={updateField}
            helperText={errors.phone_number || 'Optional'}
            aria-invalid={Boolean(errors.phone_number)}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-app-text dark:text-slate-100">Preferred currency</span>
            <select
              name="preferred_currency"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={form.preferred_currency}
              onChange={updateField}
            >
              {supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            {errors.preferred_currency ? <span className="mt-2 block text-xs font-semibold text-red-600">{errors.preferred_currency}</span> : null}
          </label>
          {submitError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {submitError}
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {successMessage}
            </div>
          ) : null}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Register'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link className="font-black text-violet-700 transition hover:text-violet-500" to="/login">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default RegisterPage
