import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import useAuth from '../hooks/useAuth'
import { createSecurityPin } from '../services/authService'

function SetupPinPage() {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isAuthenticated, syncUser, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const redirectTo = location.state?.redirectTo || '/auctions'

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.has_security_pin) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!/^\d{4}$|^\d{6}$/.test(pin)) {
      setError('Security PIN must be 4 or 6 digits.')
      return
    }

    if (pin !== confirmPin) {
      setError('PIN entries do not match.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const updatedUser = await createSecurityPin(pin)
      syncUser(updatedUser)
      navigate(redirectTo, { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Security PIN could not be created.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md items-center">
      <Card>
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black uppercase text-violet-700">
            Account security
          </div>
          <h1 className="text-2xl font-black text-app-text">Create your security PIN</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This PIN keeps normal sign-ins fast while adding a second account check.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <Input
            label="Security PIN"
            name="pin"
            inputMode="numeric"
            maxLength="6"
            placeholder="4 or 6 digits"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError('')
            }}
          />
          <Input
            label="Confirm PIN"
            name="confirm-pin"
            inputMode="numeric"
            maxLength="6"
            placeholder="Repeat PIN"
            value={confirmPin}
            onChange={(event) => {
              setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))
              setError('')
            }}
          />

          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving PIN...' : 'Save Security PIN'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default SetupPinPage
