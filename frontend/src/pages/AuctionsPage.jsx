import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuctionCard from '../components/AuctionCard'
import Button from '../components/Button'
import Card from '../components/Card'
import ConfirmModal from '../components/ConfirmModal'
import Input from '../components/Input'
import useAuth from '../hooks/useAuth'
import useToast from '../hooks/useToast'
import { cancelAuction, getAuctions, getCategories } from '../services/auctionService'
import { addToWatchlist, getWatchlist, removeFromWatchlist } from '../services/watchlistService'
import { getAuctionStatus } from '../utils/auctionStatus'

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
]

function AuctionSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-soft">
      <div className="h-3 bg-gradient-to-r from-violet-100 via-sky-100 to-emerald-100" />
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex justify-between gap-4">
          <div className="h-7 w-28 animate-pulse rounded-full bg-violet-100" />
          <div className="h-7 w-16 animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="space-y-3">
          <div className="h-5 w-24 animate-pulse rounded-full bg-sky-100" />
          <div className="h-7 w-4/5 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="h-4 w-2/3 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  )
}

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <Card className="mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-5 h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-100 via-sky-100 to-emerald-100" />
      <h2 className="text-2xl font-black text-app-text">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
      {actionLabel ? (
        <Button className="mt-6" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  )
}

function AuctionsPage() {
  const [auctions, setAuctions] = useState([])
  const [categories, setCategories] = useState([])
  const [watchlistedIds, setWatchlistedIds] = useState(() => new Set())
  const [updatingWatchlistId, setUpdatingWatchlistId] = useState(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [watchlistStatus, setWatchlistStatus] = useState('idle')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const syncWatchlistState = useCallback(async () => {
    const watchlistItems = await getWatchlist()
    setWatchlistedIds(new Set((watchlistItems || []).map((item) => item.auction_id)))
    setWatchlistStatus('ready')
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadMarketplace() {
      setIsLoading(true)
      setError('')

      try {
        const [auctionData, categoryData] = await Promise.all([getAuctions(), getCategories()])

        if (!isMounted) {
          return
        }

        setAuctions(auctionData)
        setCategories(categoryData)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMarketplace()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let resetTimer

    async function loadWatchlist() {
      if (!isAuthenticated) {
        resetTimer = setTimeout(() => {
          if (isMounted) {
            setWatchlistedIds(new Set())
            setWatchlistStatus('idle')
          }
        }, 0)
        return
      }

      setWatchlistStatus('loading')

      try {
        const watchlistItems = await getWatchlist()

        if (isMounted) {
          setWatchlistedIds(new Set((watchlistItems || []).map((item) => item.auction_id)))
          setWatchlistStatus('ready')
        }
      } catch {
        if (isMounted) {
          setWatchlistedIds(new Set())
          setWatchlistStatus('unavailable')
        }
      }
    }

    loadWatchlist()

    return () => {
      isMounted = false
      clearTimeout(resetTimer)
    }
  }, [isAuthenticated])

  const retryWatchlist = async () => {
    if (!isAuthenticated) {
      return
    }

    setWatchlistStatus('loading')

    try {
      await syncWatchlistState()
    } catch {
      setWatchlistedIds(new Set())
      setWatchlistStatus('unavailable')
    }
  }

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const filteredAuctions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return auctions.filter((auction) => {
      const categoryName = categoryById.get(auction.category_id) || ''
      const matchesCategory =
        selectedCategoryId === 'all' || Number(selectedCategoryId) === Number(auction.category_id)
      const auctionStatus = getAuctionStatus(auction).status
      const matchesStatus = selectedStatus === 'all' || selectedStatus === auctionStatus
      const matchesSearch =
        !normalizedSearch ||
        auction.title.toLowerCase().includes(normalizedSearch) ||
        categoryName.toLowerCase().includes(normalizedSearch)

      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [auctions, categoryById, searchTerm, selectedCategoryId, selectedStatus])

  const activeFilterLabels = useMemo(() => {
    const labels = []
    if (selectedCategoryId !== 'all') {
      labels.push(categoryById.get(Number(selectedCategoryId)) || 'Category')
    }
    if (selectedStatus !== 'all') {
      labels.push(statusFilters.find((item) => item.value === selectedStatus)?.label || 'Status')
    }
    if (searchTerm.trim()) {
      labels.push(`Search: ${searchTerm.trim()}`)
    }
    return labels
  }, [categoryById, searchTerm, selectedCategoryId, selectedStatus])

  const handleToggleWatchlist = async (auctionId) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/auctions' } } })
      return
    }

    if (updatingWatchlistId === auctionId) {
      return
    }

    const wasWatchlisted = watchlistedIds.has(auctionId)
    const previousIds = new Set(watchlistedIds)
    const nextIds = new Set(previousIds)

    if (wasWatchlisted) {
      nextIds.delete(auctionId)
    } else {
      nextIds.add(auctionId)
    }

    setWatchlistedIds(nextIds)
    setUpdatingWatchlistId(auctionId)
    setWatchlistStatus('ready')

    try {
      if (wasWatchlisted) {
        await removeFromWatchlist(auctionId)
        showToast('Removed from watchlist', 'info')
      } else {
        await addToWatchlist(auctionId)
        showToast('Added to watchlist', 'success')
      }
      await syncWatchlistState()
    } catch (watchlistError) {
      const message = watchlistError.message || ''

      if (!wasWatchlisted && message.includes('already in watchlist')) {
        const syncedIds = new Set(previousIds)
        syncedIds.add(auctionId)
        setWatchlistedIds(syncedIds)
        setWatchlistStatus('ready')
        showToast('Already saved to watchlist', 'info')
      } else if (wasWatchlisted && message.includes('not found')) {
        const syncedIds = new Set(previousIds)
        syncedIds.delete(auctionId)
        setWatchlistedIds(syncedIds)
        setWatchlistStatus('ready')
        showToast('Removed from watchlist', 'info')
      } else {
        setWatchlistedIds(previousIds)
        setWatchlistStatus('unavailable')
        showToast(message || 'Could not update watchlist.', 'error')
      }
    } finally {
      setUpdatingWatchlistId(null)
    }
  }

  const clearFilters = () => {
    setSelectedCategoryId('all')
    setSelectedStatus('all')
    setSearchTerm('')
  }

  const confirmCancelAuction = async () => {
    if (!cancelTarget) {
      return
    }

    setIsCanceling(true)
    try {
      await cancelAuction(cancelTarget.id)
      setAuctions((current) =>
        current.map((auction) => (auction.id === cancelTarget.id ? { ...auction, status: 'cancelled' } : auction)),
      )
      setCancelTarget(null)
      showToast('Auction cancelled.', 'success')
    } catch (cancelError) {
      showToast(cancelError.message || 'Auction could not be cancelled.', 'error')
    } finally {
      setIsCanceling(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm dark:border dark:border-violet-900/60 dark:bg-slate-900 dark:text-violet-200">
            Marketplace discovery
          </div>
          <h1 className="text-3xl font-black text-app-text sm:text-4xl">Auctions</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Browse active listings, compare current bids, and save auctions you want to follow.
          </p>
        </div>
        <Card className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Listings</p>
            <p className="mt-1 text-3xl font-black text-app-text">{auctions.length}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Saved</p>
            <p className="mt-1 text-3xl font-black text-app-text">{watchlistedIds.size}</p>
          </div>
        </Card>
      </section>

      <Card className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_15rem_15rem]">
          <Input
            label="Search marketplace"
            name="auction-search"
            placeholder="Search by title or category"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-app-text">Category</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition duration-200 focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950"
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-app-text">Status</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition duration-200 focus:border-primary focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-violet-950"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              {statusFilters.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Categories</p>
            <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-black transition ${
                selectedCategoryId === 'all'
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/70 dark:text-violet-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-white hover:text-app-text dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
              }`}
              onClick={() => setSelectedCategoryId('all')}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  Number(selectedCategoryId) === category.id
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/70 dark:text-violet-100'
                    : 'bg-slate-100 text-slate-600 hover:bg-white hover:text-app-text dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
                }`}
                onClick={() => setSelectedCategoryId(String(category.id))}
              >
                {category.name}
              </button>
            ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Status</p>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    selectedStatus === status.value
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-white hover:text-app-text dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
                  }`}
                  onClick={() => setSelectedStatus(status.value)}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex flex-wrap gap-2">
              {activeFilterLabels.length ? (
                activeFilterLabels.map((label) => (
                  <span key={label} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-900/50 dark:text-sky-200">
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-sm font-semibold text-slate-500">No filters applied</span>
              )}
            </div>
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {watchlistStatus === 'unavailable' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm font-semibold text-sky-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-sky-200">
          <span>Saved status is temporarily unavailable. Auction browsing still works.</span>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700 transition hover:-translate-y-0.5 hover:text-violet-700 dark:bg-slate-800 dark:text-sky-200 dark:hover:text-violet-200"
            onClick={retryWatchlist}
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <AuctionSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Marketplace could not load"
          message={error}
          actionLabel="Try again"
          onAction={() => window.location.reload()}
        />
      ) : filteredAuctions.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredAuctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              categoryName={categoryById.get(auction.category_id)}
              isWatchlisted={watchlistedIds.has(auction.id)}
              isUpdatingWatchlist={updatingWatchlistId === auction.id}
              onToggleWatchlist={handleToggleWatchlist}
              onCancelAuction={setCancelTarget}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No auctions found"
          message="Try another search term, category, or status filter to discover more listings."
          actionLabel="Reset marketplace"
          onAction={clearFilters}
        />
      )}
      <ConfirmModal
        title={cancelTarget ? 'Cancel auction' : ''}
        message={cancelTarget ? `Are you sure you want to cancel "${cancelTarget.title}"? This keeps the record but stops marketplace bidding.` : ''}
        confirmLabel="Cancel Auction"
        tone="secondary"
        isLoading={isCanceling}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancelAuction}
      />
    </div>
  )
}

export default AuctionsPage
