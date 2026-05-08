import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import Reveal from '../components/Reveal'
import useAuth from '../hooks/useAuth'
import useCurrency from '../hooks/useCurrency'
import useToast from '../hooks/useToast'
import { requestSellerAccess } from '../services/adminService'
import { getMyAuctions } from '../services/auctionService'
import { changeSecurityPin, createSecurityPin, getCurrentUser, requestPinChangeOtp, updateCurrencyPreference } from '../services/authService'
import { getMyBidStats } from '../services/bidService'
import { getIncidents } from '../services/defenderService'
import { getWatchlist } from '../services/watchlistService'
import { formatMoney, formatRateAge, normalizeCurrency } from '../utils/currency'
import { ROLES, isMarketplaceRole, normalizeRole } from '../utils/roles'

const blankPinForm = { current_pin: '', new_pin: '', otp_code: '' }

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-app-text dark:text-white">{value}</p>
    </div>
  )
}

function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ watched: 0, bidsPlaced: 0, auctionsWon: 0, created: 0, incidents: 0 })
  const [sellerRequestStatus, setSellerRequestStatus] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRequestingSeller, setIsRequestingSeller] = useState(false)
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false)
  const [pinForm, setPinForm] = useState(blankPinForm)
  const [pinVerification, setPinVerification] = useState(null)
  const [isPinActionLoading, setIsPinActionLoading] = useState(false)
  const { syncUser, user } = useAuth()
  const { error: rateError, fetchedAt, isLoading: isRateLoading, isStale, rates, supportedCurrencies } = useCurrency()
  const { showToast } = useToast()

  const displayUser = profile || user
  const role = normalizeRole(displayUser?.role)
  const preferredCurrency = normalizeCurrency(displayUser?.preferred_currency, supportedCurrencies)
  const accountStatus = displayUser?.is_blocked
    ? 'Blocked'
    : displayUser?.is_verified === false
      ? 'Verification Pending'
      : 'Verified Account'
  const statusTone = displayUser?.is_blocked
    ? 'bg-red-100 text-red-700'
    : displayUser?.is_verified === false
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700'

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    try {
      const currentUser = await getCurrentUser()
      const currentRole = normalizeRole(currentUser.role)
      setProfile(currentUser)
      syncUser(currentUser)

      if (isMarketplaceRole(currentRole)) {
        const [watchlistItems, bidStats] = await Promise.all([getWatchlist(), getMyBidStats()])
        setStats((current) => ({
          ...current,
          watched: watchlistItems.length,
          bidsPlaced: bidStats.bids_placed || 0,
          auctionsWon: bidStats.auctions_won || 0,
        }))
      }

      if (currentRole === ROLES.seller) {
        const sellerAuctions = await getMyAuctions().catch(() => [])
        setStats((current) => ({ ...current, created: sellerAuctions.length }))
      }

      if (currentRole === ROLES.defender) {
        const incidents = await getIncidents({ user_id: currentUser.id }).catch(() => [])
        setStats((current) => ({ ...current, incidents: incidents.length }))
      }
    } catch (error) {
      showToast(error.message || 'Profile could not be loaded.', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast, syncUser])

  useEffect(() => {
    const timeout = setTimeout(loadProfile, 0)
    return () => clearTimeout(timeout)
  }, [loadProfile])

  const visibleStats = useMemo(() => {
    if (role === ROLES.seller) {
      return [
        { label: 'Auctions created', value: stats.created },
        { label: 'Watched', value: stats.watched },
        { label: 'Bids placed', value: stats.bidsPlaced },
        { label: 'Auctions won', value: stats.auctionsWon },
      ]
    }

    if (role === ROLES.defender) {
      return [
        { label: 'Incidents', value: stats.incidents },
        { label: 'Workspace', value: 'Defender' },
        { label: 'Status', value: accountStatus },
      ]
    }

    if (role === ROLES.admin) {
      return [
        { label: 'Workspace', value: 'Admin' },
        { label: 'Access', value: 'Full' },
        { label: 'Status', value: accountStatus },
      ]
    }

    return [
      { label: 'Watched', value: stats.watched },
      { label: 'Bids placed', value: stats.bidsPlaced },
      { label: 'Auctions won', value: stats.auctionsWon },
    ]
  }, [accountStatus, role, stats])

  const handleCurrencyChange = async (event) => {
    setIsUpdatingCurrency(true)
    try {
      const updatedUser = await updateCurrencyPreference(event.target.value)
      setProfile(updatedUser)
      syncUser(updatedUser)
      showToast('Currency preference updated.', 'success')
    } catch (error) {
      showToast(error.message || 'Currency preference could not be updated.', 'error')
    } finally {
      setIsUpdatingCurrency(false)
    }
  }

  const updatePinField = (event) => {
    const { name, value } = event.target
    setPinForm((current) => ({ ...current, [name]: value.replace(/\D/g, '').slice(0, 6) }))
  }

  const handleCreatePin = async () => {
    if (!/^\d{4}$|^\d{6}$/.test(pinForm.new_pin)) {
      showToast('Security PIN must be 4 or 6 digits.', 'error')
      return
    }

    setIsPinActionLoading(true)
    try {
      const updatedUser = await createSecurityPin(pinForm.new_pin)
      setProfile(updatedUser)
      syncUser(updatedUser)
      setPinForm(blankPinForm)
      showToast('Security PIN created.', 'success')
    } catch (error) {
      showToast(error.message || 'Security PIN could not be created.', 'error')
    } finally {
      setIsPinActionLoading(false)
    }
  }

  const handleRequestPinOtp = async () => {
    setIsPinActionLoading(true)
    try {
      const verification = await requestPinChangeOtp()
      setPinVerification(verification)
      setPinForm((current) => ({ ...current, otp_code: '' }))
      showToast('Verification code sent to your email.', 'success')
    } catch (error) {
      showToast(error.message || 'Could not send verification code.', 'error')
    } finally {
      setIsPinActionLoading(false)
    }
  }

  const handleChangePin = async ({ reset = false } = {}) => {
    if (!pinVerification?.verification_id) {
      showToast('Request an email verification code first.', 'error')
      return
    }
    if (!/^\d{4}$|^\d{6}$/.test(pinForm.new_pin)) {
      showToast('New PIN must be 4 or 6 digits.', 'error')
      return
    }
    if (!reset && !/^\d{4}$|^\d{6}$/.test(pinForm.current_pin)) {
      showToast('Enter your current PIN.', 'error')
      return
    }
    if (!/^\d{6}$/.test(pinForm.otp_code)) {
      showToast('Enter the 6 digit email code.', 'error')
      return
    }

    setIsPinActionLoading(true)
    try {
      const updatedUser = await changeSecurityPin({
        current_pin: reset ? null : pinForm.current_pin,
        new_pin: pinForm.new_pin,
        verification_id: pinVerification.verification_id,
        otp_code: pinForm.otp_code,
      })
      setProfile(updatedUser)
      syncUser(updatedUser)
      setPinVerification(null)
      setPinForm(blankPinForm)
      showToast(reset ? 'Security PIN reset.' : 'Security PIN changed.', 'success')
    } catch (error) {
      showToast(error.message || 'Security PIN could not be updated.', 'error')
    } finally {
      setIsPinActionLoading(false)
    }
  }

  const handleRequestSeller = async () => {
    setIsRequestingSeller(true)
    try {
      await requestSellerAccess()
      setSellerRequestStatus('pending')
      showToast('Seller request submitted.', 'success')
    } catch (error) {
      const message = error.message || ''
      if (message.toLowerCase().includes('pending') || message.toLowerCase().includes('already')) {
        setSellerRequestStatus('pending')
        showToast('Seller request is already pending.', 'info')
      } else {
        showToast(message || 'Could not request seller access.', 'error')
      }
    } finally {
      setIsRequestingSeller(false)
    }
  }

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-white/80 dark:bg-slate-900" />
  }

  return (
    <div className="page-enter space-y-6">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-violet-700 dark:text-violet-300">Account</p>
            <h1 className="mt-2 text-3xl font-black text-app-text dark:text-white sm:text-4xl">{displayUser?.username}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">{displayUser?.email}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusTone}`}>{accountStatus}</span>
        </div>
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-black text-app-text dark:text-white">Account overview</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <StatCard label="Role" value={displayUser?.role} />
              <StatCard label="Balance" value={formatMoney(displayUser?.account_balance || 0, preferredCurrency, rates)} />
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-semibold uppercase text-slate-500">Preferred currency</p>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-app-text outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  value={preferredCurrency}
                  disabled={isUpdatingCurrency}
                  onChange={handleCurrencyChange}
                >
                  {supportedCurrencies.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {isRateLoading ? 'Loading live rates...' : isStale ? 'Using cached rates' : formatRateAge(fetchedAt)}
                </p>
                {rateError ? <p className="mt-1 text-xs font-semibold text-amber-700">{rateError}</p> : null}
              </div>
              <StatCard label="Email verification" value={displayUser?.is_verified ? 'Verified' : 'Pending'} />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-app-text dark:text-white">Marketplace stats</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleStats.map((item) => <StatCard key={item.label} label={item.label} value={item.value} />)}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-app-text dark:text-white">Security</h2>
            <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-app-text dark:text-white">Security PIN</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {displayUser?.has_security_pin ? 'PIN is enabled for faster protected sign-in.' : 'Create a 4 or 6 digit PIN.'}
                  </p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${displayUser?.has_security_pin ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {displayUser?.has_security_pin ? 'Enabled' : 'Needed'}
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {displayUser?.has_security_pin ? (
                  <Input label="Current PIN" name="current_pin" inputMode="numeric" maxLength="6" value={pinForm.current_pin} onChange={updatePinField} />
                ) : null}
                <Input label={displayUser?.has_security_pin ? 'New PIN' : 'Create PIN'} name="new_pin" inputMode="numeric" maxLength="6" value={pinForm.new_pin} onChange={updatePinField} />
                {displayUser?.has_security_pin && pinVerification ? (
                  <Input label="Email code" name="otp_code" inputMode="numeric" maxLength="6" value={pinForm.otp_code} onChange={updatePinField} />
                ) : null}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {displayUser?.has_security_pin ? (
                  <>
                    <Button variant="secondary" disabled={isPinActionLoading} onClick={handleRequestPinOtp}>Email PIN Code</Button>
                    <Button disabled={isPinActionLoading || !pinVerification} onClick={() => handleChangePin()}>Change PIN</Button>
                    <Button variant="ghost" disabled={isPinActionLoading || !pinVerification} onClick={() => handleChangePin({ reset: true })}>Reset PIN</Button>
                  </>
                ) : (
                  <Button disabled={isPinActionLoading} onClick={handleCreatePin}>Create Security PIN</Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="text-xl font-black text-app-text dark:text-white">Role actions</h2>
            <div className="mt-5 grid gap-3">
              {role === ROLES.bidder ? (
                <Button variant="secondary" disabled={isRequestingSeller || sellerRequestStatus === 'pending'} onClick={handleRequestSeller}>
                  {sellerRequestStatus === 'pending' ? 'Seller request pending' : 'Request Seller Access'}
                </Button>
              ) : null}
              {role === ROLES.seller ? <Button as={Link} to="/seller/create">Create Auction</Button> : null}
              {role === ROLES.seller ? <Button as={Link} to="/seller" variant="secondary">Seller Dashboard</Button> : null}
              {role === ROLES.defender ? <Button as={Link} to="/defender">Defender Dashboard</Button> : null}
              {role === ROLES.admin ? <Button as={Link} to="/admin">Admin Panel</Button> : null}
              {isMarketplaceRole(role) ? <Button as={Link} to="/watchlist" variant="secondary">Watchlist</Button> : null}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-app-text dark:text-white">Activity</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Recent bidding and watched-auction activity is summarized in marketplace stats. Detailed activity remains available in auction rooms and watchlists.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default ProfilePage
