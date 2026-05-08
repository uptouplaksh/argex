import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import PasswordToggle from '../components/PasswordToggle'
import useAuth from '../hooks/useAuth'

const initialForm = {
  username: '',
  password: '',
  pin: '',
}

function LoginPage() {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState('credentials')
  const { isAuthenticated, login, verifyPin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const redirectTo = location.state?.from?.pathname || '/auctions'

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.username.trim()) {
      nextErrors.username = 'Username is required'
    }

    if (!form.password) {
      nextErrors.password = 'Password is required'
    }

    if (step === 'pin' && !/^\d{4}$|^\d{6}$/.test(form.pin)) {
      nextErrors.pin = 'Enter your 4 or 6 digit security PIN'
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
      if (step === 'pin') {
        await verifyPin({
          username: form.username.trim(),
          password: form.password,
          pin: form.pin,
        })
        navigate(redirectTo, { replace: true })
        return
      }

      const response = await login({
        username: form.username.trim(),
        password: form.password,
      })
      if (response?.pin_required) {
        setStep('pin')
        return
      }
      if (response?.pin_setup_required) {
        navigate('/setup-pin', {
          replace: true,
          state: { redirectTo },
        })
        return
      }
      navigate(redirectTo, { replace: true })
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
          <h1 className="text-2xl font-black text-app-text">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === 'pin'
              ? 'Enter your security PIN to open your session.'
              : 'Access auction rooms, watchlists, and role-based workspaces.'}
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
            disabled={step === 'pin'}
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
            disabled={step === 'pin'}
          />
          {step === 'pin' ? (
            <Input
              label="Security PIN"
              name="pin"
              inputMode="numeric"
              maxLength="6"
              placeholder="Enter PIN"
              value={form.pin}
              onChange={(event) => {
                setForm((current) => ({ ...current, pin: event.target.value.replace(/\D/g, '').slice(0, 6) }))
                setErrors((current) => ({ ...current, pin: '' }))
                setSubmitError('')
              }}
              helperText={errors.pin || 'Use the 4 or 6 digit PIN on your account.'}
              aria-invalid={Boolean(errors.pin)}
            />
          ) : null}
          {submitError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {submitError}
            </div>
          ) : null}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : step === 'pin' ? 'Verify PIN' : 'Continue'}
          </Button>
          {step === 'pin' ? (
            <Button
              className="w-full"
              type="button"
              variant="ghost"
              onClick={() => {
                setStep('credentials')
                setForm((current) => ({ ...current, pin: '' }))
                setSubmitError('')
              }}
            >
              Use different credentials
            </Button>
          ) : null}
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">
          New to Argex?{' '}
          <Link className="font-black text-violet-700 transition hover:text-violet-500" to="/register">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default LoginPage
