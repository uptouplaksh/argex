import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AutoBidPanel from '../components/AutoBidPanel'
import BidForm from '../components/BidForm'
import BidHistoryPanel from '../components/BidHistoryPanel'
import Button from '../components/Button'
import Card from '../components/Card'
import ConfirmModal from '../components/ConfirmModal'
import Reveal from '../components/Reveal'
import useAuth from '../hooks/useAuth'
import useAuctionWebSocket from '../hooks/useAuctionWebSocket'
import useCurrency from '../hooks/useCurrency'
import { cancelAuction, getAuction, getCategories, getHighestBid } from '../services/auctionService'
import { disableAutoBid, getAutoBid, getBidHistory, placeBid, upsertAutoBid } from '../services/bidService'
import { formatAuctionMoney, formatMoney, normalizeCurrency } from '../utils/currency'
import { formatReadableDateTime } from '../utils/dateTime'
import { formatBidderLabel } from '../utils/privacy'

function getTimeRemaining(endTime, now) {
  const end = new Date(endTime).getTime()
  const diff = end - now

  if (Number.isNaN(end) || diff <= 0) {
    return 'Auction ended'
  }

  const minutes = Math.floor(diff / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const remainingMinutes = minutes % 60

  if (days > 0) {
    return `${days}d ${hours}h remaining`
  }

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m remaining`
  }

  return `${Math.max(remainingMinutes, 1)}m remaining`
}

function getStatusTone(status, hasEnded) {
  if (hasEnded || status === 'ended') {
    return 'bg-slate-100 text-slate-600'
  }

  if (status === 'cancelled') {
    return 'bg-red-100 text-red-700'
  }

  if (status === 'active') {
    return 'bg-emerald-100 text-emerald-700'
  }

  return 'bg-sky-100 text-sky-700'
}

function getBidKey(bid) {
  return bid.id || `${bid.bidder_id}-${bid.amount}-${bid.created_at}`
}

function normalizeSocketBid(event) {
  return {
    id: event.id || `ws-${event.bidder_id}-${event.amount}-${event.timestamp}`,
    auction_id: event.auction_id,
    bidder_id: event.bidder_id,
    bidder_username: event.bidder_username,
    amount: event.amount,
    created_at: event.timestamp || event.created_at || new Date().toISOString(),
    is_auto: Boolean(event.is_auto),
  }
}

function mergeBidIntoHistory(currentBids, nextBid) {
  const nextBidKey = `${nextBid.bidder_id}-${nextBid.amount}-${nextBid.created_at}`
  const alreadyExists = currentBids.some((bid) => {
    const bidKey = `${bid.bidder_id}-${bid.amount}-${bid.created_at}`
    return bid.id === nextBid.id || bidKey === nextBidKey
  })

  if (alreadyExists) {
    return currentBids
  }

  return [nextBid, ...currentBids].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

function getFriendlyBidError(error, fallback = 'Bid action could not be completed.') {
  const message = error?.message || ''

  if (/insufficient|affordable|balance/i.test(message)) {
    return 'Insufficient balance for that bid.'
  }

  if (/own auction/i.test(message)) {
    return 'You cannot bid on your own auction.'
  }

  if (/maximum bid|current price|higher than|greater than/i.test(message)) {
    return message
  }

  if (/auction ended/i.test(message)) {
    return 'This auction has ended.'
  }

  if (/auction not active/i.test(message)) {
    return 'This auction is not active yet.'
  }

  if (/auto-bid not found/i.test(message)) {
    return 'No active auto-bid was found for this auction.'
  }

  return message || fallback
}

function RoomSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <Card>
          <div className="h-7 w-32 animate-pulse rounded-full bg-violet-100" />
          <div className="mt-5 h-10 w-3/4 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-4 h-5 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="mt-2 h-5 w-2/3 animate-pulse rounded-xl bg-slate-100" />
        </Card>
        <Card>
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </Card>
      </div>
      <Card className="h-80">
        <div className="h-full animate-pulse rounded-2xl bg-slate-100" />
      </Card>
    </div>
  )
}

function Toast({ type, message, onClose }) {
  const styles =
    type === 'success'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : 'border-red-100 bg-red-50 text-red-700'

  return (
    <div className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm font-semibold shadow-soft ${styles}`}>
      <div className="flex items-start gap-3">
        <span>{message}</span>
        <button type="button" className="font-black" onClick={onClose} aria-label="Dismiss message">
          x
        </button>
      </div>
    </div>
  )
}

function AuctionRoomPage() {
  const { auctionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    fetchedAt: ratesFetchedAt,
    isLoading: isRateLoading,
    isStale: isRateStale,
    rates,
    supportedCurrencies,
  } = useCurrency()
  const [auction, setAuction] = useState(null)
  const [categories, setCategories] = useState([])
  const [bids, setBids] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isHistoryLoading, setIsHistoryLoading] = useState(true)
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [now, setNow] = useState(0)
  const [highlightedBidKey, setHighlightedBidKey] = useState('')
  const [bidPulseKey, setBidPulseKey] = useState(0)
  const [auctionResult, setAuctionResult] = useState(null)
  const [autoBid, setAutoBid] = useState(null)
  const [isSubmittingAutoBid, setIsSubmittingAutoBid] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCancelingAuction, setIsCancelingAuction] = useState(false)

  const loadAutoBid = useCallback(async () => {
    if (!['bidder', 'seller'].includes(user?.role)) {
      setAutoBid(null)
      return null
    }

    try {
      const data = await getAutoBid(auctionId)
      setAutoBid(data)
      return data
    } catch (autoBidError) {
      if (!/auto-bid not found/i.test(autoBidError.message || '')) {
        setToast({ type: 'error', message: 'Could not load auto-bid status.' })
      }
      setAutoBid(null)
      return null
    }
  }, [auctionId, user?.role])

  const loadRoom = useCallback(
    async ({ showLoader = false } = {}) => {
      if (showLoader) {
        setIsLoading(true)
      }

      setError('')

      try {
        const [auctionData, categoryData, bidHistory, highestBid] = await Promise.all([
          getAuction(auctionId),
          getCategories(),
          getBidHistory(auctionId),
          getHighestBid(auctionId),
        ])

        setAuction(auctionData)
        setCategories(categoryData)
        setBids(bidHistory)
        setAuctionResult(highestBid?.amount ? highestBid : null)
        await loadAutoBid()
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setIsLoading(false)
        setIsHistoryLoading(false)
      }
    },
    [auctionId, loadAutoBid],
  )

  const refreshBids = useCallback(async () => {
    try {
      const [auctionData, bidHistory, highestBid] = await Promise.all([
        getAuction(auctionId),
        getBidHistory(auctionId),
        getHighestBid(auctionId),
      ])
      setAuction(auctionData)
      setBids(bidHistory)
      setAuctionResult(highestBid?.amount ? highestBid : null)
      await loadAutoBid()
    } catch {
      setToast({ type: 'error', message: 'Could not refresh bid activity.' })
    }
  }, [auctionId, loadAutoBid])

  useEffect(() => {
    const timeout = setTimeout(() => loadRoom({ showLoader: true }), 0)
    return () => clearTimeout(timeout)
  }, [loadRoom])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSocketEvent = useCallback(
    (event) => {
      if (Number(event.auction_id) !== Number(auctionId)) {
        return
      }

      if (event.type === 'NEW_BID') {
        const nextBid = normalizeSocketBid(event)
        const nextBidKey = getBidKey(nextBid)
        const isCurrentUserBid = String(nextBid.bidder_id) === String(user?.id)
        const socketCurrency = normalizeCurrency(auction?.auction_currency, supportedCurrencies)
        const preferredCurrency = normalizeCurrency(user?.preferred_currency, supportedCurrencies)

        setAuction((currentAuction) =>
          currentAuction
            ? {
                ...currentAuction,
                current_price: Math.max(Number(currentAuction.current_price || 0), Number(nextBid.amount || 0)),
              }
            : currentAuction,
        )
        setBids((currentBids) => mergeBidIntoHistory(currentBids, nextBid))
        setAuctionResult({
          auction_id: nextBid.auction_id,
          amount: nextBid.amount,
          bidder_id: nextBid.bidder_id,
          bidder_username: nextBid.bidder_username || null,
          created_at: nextBid.created_at,
        })
        setHighlightedBidKey(nextBidKey)
        setBidPulseKey((current) => current + 1)
        if (nextBid.is_auto && isCurrentUserBid) {
          setAutoBid((current) =>
            current
              ? {
                  ...current,
                  current_bid: Math.max(Number(current.current_bid || 0), Number(nextBid.amount || 0)),
                  is_active: Number(nextBid.amount || 0) < Number(current.max_bid || 0),
                }
              : current,
          )
        }
        setToast({
          type: nextBid.is_auto && !isCurrentUserBid ? 'error' : 'success',
          message:
            nextBid.is_auto && isCurrentUserBid
              ? `Your auto-bid increased the bid to ${formatAuctionMoney(
                  nextBid.amount,
                  socketCurrency,
                  rates,
                  preferredCurrency,
                )}`
              : nextBid.is_auto
                ? `Another user's auto-bid moved the bid to ${formatAuctionMoney(
                    nextBid.amount,
                    socketCurrency,
                    rates,
                    preferredCurrency,
                  )}`
                : `New bid: ${formatAuctionMoney(
                    nextBid.amount,
                    socketCurrency,
                    rates,
                    preferredCurrency,
                  )}`,
        })
        return
      }

      if (event.type === 'OUTBID') {
        setAuction((currentAuction) =>
          currentAuction
            ? {
                ...currentAuction,
                current_price: Math.max(
                  Number(currentAuction.current_price || 0),
                  Number(event.new_highest_bid || 0),
                ),
              }
            : currentAuction,
        )

        if (String(event.user_id) === String(user?.id)) {
          setToast({ type: 'error', message: 'Another user outbid you.' })
        }
        return
      }

      if (event.type === 'TIME_EXTENDED') {
        setAuction((currentAuction) =>
          currentAuction
            ? {
                ...currentAuction,
                end_time: event.new_end_time,
                status: 'active',
              }
            : currentAuction,
        )
        setToast({ type: 'success', message: 'Auction time was extended.' })
        return
      }

      if (event.type === 'AUCTION_ENDED') {
        setAuction((currentAuction) =>
          currentAuction
            ? {
                ...currentAuction,
                current_price: event.final_price ?? currentAuction.current_price,
                status: 'ended',
              }
            : currentAuction,
        )
        setAuctionResult({
          auction_id: event.auction_id,
          amount: event.final_price,
          bidder_id: event.winner_id,
          bidder_username: event.winner_username,
          created_at: new Date().toISOString(),
        })
        setToast({ type: 'success', message: 'Auction ended.' })
      }
    },
    [auction?.auction_currency, auctionId, rates, supportedCurrencies, user?.id, user?.preferred_currency],
  )

  const socketStatus = useAuctionWebSocket(auctionId, handleSocketEvent)

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeout = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!highlightedBidKey) {
      return undefined
    }

    const timeout = setTimeout(() => setHighlightedBidKey(''), 2500)
    return () => clearTimeout(timeout)
  }, [highlightedBidKey])

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  if (isLoading) {
    return <RoomSkeleton />
  }

  if (error || !auction) {
    return (
      <Card className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-3xl bg-red-50" />
        <h1 className="text-2xl font-black text-app-text">Auction room unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{error || 'Auction not found'}</p>
        <Button as={Link} to="/auctions" className="mt-6" variant="secondary">
          Back to marketplace
        </Button>
      </Card>
    )
  }

  const status = auction.status || 'listed'
  const hasEnded = new Date(auction.end_time).getTime() <= now
  const isCancelled = status === 'cancelled'
  const isActive = status === 'active' && !hasEnded && !isCancelled
  const categoryName = categoryById.get(auction.category_id) || 'Uncategorized'
  const sellerLabel = auction.seller?.username ? `@${auction.seller.username}` : 'Seller'
  const isOwnAuction = String(auction.seller_id) === String(user?.id)
  const currentBid = auction.current_price ?? auction.starting_price
  const currency = normalizeCurrency(user?.preferred_currency, supportedCurrencies)
  const auctionCurrency = normalizeCurrency(auction.auction_currency, supportedCurrencies)
  const isRateReady = auctionCurrency === 'USD' || Boolean(rates?.[auctionCurrency])
  const latestBid = bids[0]
  const canBid = isActive && ['bidder', 'seller'].includes(user?.role) && !isOwnAuction
  const disabledReason = !isActive
    ? isCancelled
      ? 'This auction has been cancelled.'
      : hasEnded || status === 'ended'
        ? 'This auction has ended.'
        : 'This auction is not active yet.'
    : isOwnAuction
      ? 'You cannot bid on your own auction.'
      : !['bidder', 'seller'].includes(user?.role)
        ? 'Only bidder and seller accounts can place bids.'
      : ''

  const handleBidSubmit = async (amount) => {
    setIsSubmittingBid(true)

    try {
      await placeBid(auction.id, amount)
      setToast({ type: 'success', message: 'Bid placed successfully.' })
      await refreshBids()
    } catch (bidError) {
      setToast({ type: 'error', message: getFriendlyBidError(bidError) })
    } finally {
      setIsSubmittingBid(false)
    }
  }

  const handleAutoBidSubmit = async (maxBid) => {
    setIsSubmittingAutoBid(true)

    try {
      const data = await upsertAutoBid(auction.id, maxBid)
      setAutoBid(data)
      setToast({ type: 'success', message: data.is_active ? 'Auto-Bid Active.' : 'Auto-Bid limit saved.' })
      await refreshBids()
    } catch (autoBidError) {
      setToast({ type: 'error', message: getFriendlyBidError(autoBidError, 'Auto-Bid could not be activated.') })
    } finally {
      setIsSubmittingAutoBid(false)
    }
  }

  const handleAutoBidDisable = async () => {
    setIsSubmittingAutoBid(true)

    try {
      const data = await disableAutoBid(auction.id)
      setAutoBid(data)
      setToast({ type: 'success', message: 'Auto-Bid disabled.' })
    } catch (autoBidError) {
      setToast({ type: 'error', message: getFriendlyBidError(autoBidError, 'Auto-Bid could not be disabled.') })
    } finally {
      setIsSubmittingAutoBid(false)
    }
  }

  const handleCancelAuction = async () => {
    setIsCancelingAuction(true)
    try {
      await cancelAuction(auction.id)
      setAuction((current) => (current ? { ...current, status: 'cancelled' } : current))
      setShowCancelConfirm(false)
      setToast({ type: 'success', message: 'Auction cancelled.' })
    } catch (cancelError) {
      setToast({ type: 'error', message: cancelError.message || 'Auction could not be cancelled.' })
    } finally {
      setIsCancelingAuction(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
      <ConfirmModal
        title={showCancelConfirm ? 'Cancel auction' : ''}
        message={`Are you sure you want to cancel "${auction.title}"? This keeps the record but stops marketplace bidding.`}
        confirmLabel="Cancel Auction"
        tone="secondary"
        isLoading={isCancelingAuction}
        onCancel={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelAuction}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="space-y-6">
          <Reveal>
            <Card className="overflow-hidden">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                {categoryName}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${getStatusTone(status, hasEnded)}`}>
                {hasEnded && status === 'active' ? 'ended' : status}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                {getTimeRemaining(auction.end_time, now)}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-black text-app-text sm:text-4xl">{auction.title}</h1>
              <p className="max-w-3xl text-base leading-8 text-slate-600">
                {auction.description || 'This seller has not added a detailed description yet.'}
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div
                key={bidPulseKey}
                className="bid-pop rounded-2xl bg-violet-50 p-4 transition duration-300"
              >
                <p className="text-xs font-semibold uppercase text-slate-500">Current highest bid</p>
                <p className="mt-2 text-2xl font-black text-app-text">{formatAuctionMoney(currentBid, auctionCurrency, rates, currency)}</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Starting price</p>
                <p className="mt-2 text-2xl font-black text-app-text">
                  {formatAuctionMoney(auction.starting_price, auctionCurrency, rates, currency)}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Seller</p>
                <p className="mt-2 text-lg font-black text-app-text">{sellerLabel}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Ends</p>
                <p className="mt-2 text-sm font-black leading-6 text-app-text">
                  {formatReadableDateTime(auction.end_time)}
                </p>
              </div>
            </div>
            </Card>
          </Reveal>

          {hasEnded || status === 'ended' ? (
            <Reveal>
              <Card className="border-emerald-100 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase text-emerald-700 dark:text-emerald-200">Auction complete</p>
                    <h2 className="mt-2 text-2xl font-black text-app-text dark:text-white">
                      This auction ended successfully.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Winning bidder{' '}
                      <span className="font-black text-app-text dark:text-white">
                        {auctionResult?.bidder_id || auctionResult?.bidder_username
                          ? formatBidderLabel(auctionResult.bidder_username, auctionResult.bidder_id, user?.role)
                          : 'not available'}
                      </span>{' '}
                      closed at {formatAuctionMoney(auctionResult?.amount || currentBid, auctionCurrency, rates, currency)}.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 text-right shadow-sm dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase text-slate-500">Final price</p>
                    <p className="mt-1 text-3xl font-black text-app-text dark:text-white">
                      {formatAuctionMoney(auctionResult?.amount || currentBid, auctionCurrency, rates, currency)}
                    </p>
                  </div>
                </div>
              </Card>
            </Reveal>
          ) : null}

          <BidHistoryPanel auctionCurrency={auctionCurrency} bids={bids} highlightedBidKey={highlightedBidKey} isLoading={isHistoryLoading} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          {isOwnAuction && !['ended', 'cancelled'].includes(status) && !hasEnded ? (
            <Card>
              <p className="text-sm font-semibold text-violet-700">Seller controls</p>
              <h2 className="mt-1 text-xl font-black text-app-text">Manage listing</h2>
              <div className="mt-4 grid gap-3">
                <Button variant="secondary" onClick={() => navigate(`/auctions/${auction.id}/edit`)}>
                  Edit Auction
                </Button>
                <Button variant="ghost" onClick={() => setShowCancelConfirm(true)}>
                  Cancel Auction
                </Button>
              </div>
            </Card>
          ) : null}
          <Card>
            <div className="mb-6">
              <p className="text-sm font-semibold text-violet-700">Bidding panel</p>
              <h2 className="mt-1 text-2xl font-black text-app-text">{formatAuctionMoney(currentBid, auctionCurrency, rates, currency)}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {latestBid
                  ? `Leading bidder: ${formatBidderLabel(latestBid.bidder_username, latestBid.bidder_id, user?.role)}`
                  : 'No leading bidder yet'}
              </p>
              {['bidder', 'seller'].includes(user?.role) && user?.account_balance !== undefined ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
                  <p className="text-xs font-semibold uppercase text-slate-500">Wallet balance</p>
                  <p className="mt-1 text-lg font-black text-app-text dark:text-white">
                    {formatMoney(user?.account_balance || 0, currency, rates)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {isRateLoading
                      ? 'Loading live rates...'
                      : isRateStale
                        ? 'Using cached rates'
                        : ratesFetchedAt
                          ? 'Live rates active'
                          : 'Rates pending'}
                  </p>
                </div>
              ) : null}
            </div>

            <BidForm
              currentPrice={currentBid}
              currency={auctionCurrency}
              disabled={!canBid}
              disabledReason={disabledReason}
              isRateReady={isRateReady}
              isSubmitting={isSubmittingBid}
              onSubmit={handleBidSubmit}
              rates={rates}
            />

            <AutoBidPanel
              autoBid={autoBid}
              currentPrice={currentBid}
              currency={auctionCurrency}
              disabled={!canBid}
              disabledReason={disabledReason}
              isRateReady={isRateReady}
              isSubmitting={isSubmittingAutoBid}
              onDisable={handleAutoBidDisable}
              onSubmit={handleAutoBidSubmit}
              rates={rates}
              walletBalance={user?.account_balance}
            />
          </Card>

          <Card>
            <p className="text-sm font-semibold text-sky-700">Room status</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="text-sm font-semibold text-slate-600">Mode</span>
                <span
                  className={`text-sm font-black capitalize ${
                    socketStatus === 'connected'
                      ? 'text-emerald-700'
                      : socketStatus === 'reconnecting'
                        ? 'text-amber-700'
                        : 'text-slate-600'
                  }`}
                >
                  {socketStatus}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <span className="text-sm font-semibold text-slate-600">Updates</span>
                <span className="text-sm font-black text-app-text">Live</span>
              </div>
              <Button className="w-full" variant="secondary" onClick={refreshBids}>
                Refresh now
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default AuctionRoomPage
