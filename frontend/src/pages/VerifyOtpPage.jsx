import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import useAuth from '../hooks/useAuth'
import { resendLoginOtp } from '../services/authService'

function withOtpTimes(session) {
  const now = Date.now()
  return {
    ...session,
    expires_at_ms: now + (session.expires_in_seconds || 0) * 1000,
    resend_at_ms: now + (session.resend_available_in_seconds || 0) * 1000,
  }
}

function VerifyOtpPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, verifyOtp } = useAuth()
  const [otpSession, setOtpSession] = useState(() =>
    location.state?.otpSession ? withOtpTimes(location.state.otpSession) : null,
  )
  const [otpCode, setOtpCode] = useState('')
  const [otpNow, setOtpNow] = useState(() => Date.now())
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const redirectTo = location.state?.redirectTo || '/auctions'

  useEffect(() => {
    if (!otpSession) {
      return undefined
    }

    const timer = setInterval(() => setOtpNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [otpSession])

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  if (!otpSession) {
    return <Navigate to="/login" replace />
  }

  const otpSecondsRemaining = Math.max(0, Math.ceil((otpSession.expires_at_ms - otpNow) / 1000))
  const resendSecondsRemaining = Math.max(0, Math.ceil((otpSession.resend_at_ms - otpNow) / 1000))

  const handleOtpSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      const verifiedUser = await verifyOtp({
        verification_id: otpSession.verification_id,
        code: otpCode.trim(),
      })
      if (!verifiedUser?.has_security_pin) {
        navigate('/setup-pin', { replace: true, state: { redirectTo } })
        return
      }
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(error.message || 'Verification failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOtp = async () => {
    setIsResending(true)
    setSubmitError('')

    try {
      const nextSession = await resendLoginOtp({ verification_id: otpSession.verification_id })
      setOtpSession(withOtpTimes(nextSession))
      setOtpNow(Date.now())
      setOtpCode('')
    } catch (error) {
      setSubmitError(error.message || 'Could not resend verification code')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-md items-center">
      <Card>
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
            Secure verification
          </div>
          <h1 className="text-2xl font-black text-app-text">Enter verification code</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            We emailed a 6-digit code to {otpSession.delivery_hint}. Your session starts only after verification.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleOtpSubmit} noValidate>
          <Input
            label="Verification code"
            name="otp"
            inputMode="numeric"
            maxLength="6"
            placeholder="000000"
            value={otpCode}
            onChange={(event) => {
              setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              setSubmitError('')
            }}
            helperText={
              otpSecondsRemaining
                ? `Code expires in ${Math.floor(otpSecondsRemaining / 60)}:${String(otpSecondsRemaining % 60).padStart(2, '0')}`
                : 'Code expired. Request a new one.'
            }
          />

          {submitError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {submitError}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting || otpCode.length !== 6 || otpSecondsRemaining <= 0}>
            {isSubmitting ? 'Verifying...' : 'Verify and continue'}
          </Button>
          <Button
            className="w-full"
            type="button"
            variant="secondary"
            disabled={isResending || resendSecondsRemaining > 0}
            onClick={handleResendOtp}
          >
            {isResending
              ? 'Emailing...'
              : resendSecondsRemaining > 0
                ? `Resend in ${resendSecondsRemaining}s`
                : 'Email a new code'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default VerifyOtpPage
