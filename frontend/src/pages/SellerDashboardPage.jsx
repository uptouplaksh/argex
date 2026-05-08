import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AuctionCard from '../components/AuctionCard'
import Button from '../components/Button'
import Card from '../components/Card'
import ConfirmModal from '../components/ConfirmModal'
import EmptyState from '../components/EmptyState'
import useToast from '../hooks/useToast'
import { cancelAuction, getCategories, getMyAuctions } from '../services/auctionService'
import { getAuctionStatus } from '../utils/auctionStatus'

function SellerDashboardPage() {
  const [auctions, setAuctions] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const loadDashboard = useCallback(async () => {
    setError('')
    setIsLoading(true)

    try {
      const [auctionData, categoryData] = await Promise.all([getMyAuctions(), getCategories()])
      setAuctions(auctionData || [])
      setCategories(categoryData || [])
    } catch (loadError) {
      setError(loadError.message || 'Seller dashboard could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(loadDashboard, 0)
    return () => clearTimeout(timeout)
  }, [loadDashboard])

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const stats = useMemo(() => {
    const active = auctions.filter((auction) => getAuctionStatus(auction).status === 'active').length
    const ended = auctions.filter((auction) => getAuctionStatus(auction).status === 'ended').length
    const upcoming = auctions.filter((auction) => getAuctionStatus(auction).status === 'upcoming').length
    const cancelled = auctions.filter((auction) => getAuctionStatus(auction).status === 'cancelled').length

    return { active, cancelled, ended, upcoming, total: auctions.length }
  }, [auctions])

  const groupedAuctions = useMemo(
    () => ({
      active: auctions.filter((auction) => getAuctionStatus(auction).status === 'active'),
      upcoming: auctions.filter((auction) => getAuctionStatus(auction).status === 'upcoming'),
      ended: auctions.filter((auction) => getAuctionStatus(auction).status === 'ended'),
      cancelled: auctions.filter((auction) => getAuctionStatus(auction).status === 'cancelled'),
    }),
    [auctions],
  )

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
      <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm dark:border dark:border-violet-900/60 dark:bg-slate-900 dark:text-violet-200">
            Seller dashboard
          </div>
          <h1 className="text-3xl font-black text-app-text dark:text-white sm:text-4xl">Manage auctions</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Track listings you created, launch new auctions, and review marketplace outcomes.
          </p>
        </div>
        <Button as={Link} to="/seller/create" variant="primary">
          Create Auction
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Created', stats.total],
          ['Active', stats.active],
          ['Upcoming', stats.upcoming],
          ['Ended', stats.ended],
          ['Cancelled', stats.cancelled],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-app-text dark:text-white">{value}</p>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl bg-white/80 shadow-soft dark:bg-slate-900/80" />
          ))}
        </div>
      ) : error ? (
        <Card className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-black text-app-text dark:text-white">Seller dashboard unavailable</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{error}</p>
          <Button className="mt-6" variant="secondary" onClick={loadDashboard}>
            Retry
          </Button>
        </Card>
      ) : auctions.length ? (
        <div className="space-y-8">
          {[
            ['Active auctions', groupedAuctions.active],
            ['Upcoming auctions', groupedAuctions.upcoming],
            ['Ended auctions', groupedAuctions.ended],
            ['Cancelled auctions', groupedAuctions.cancelled],
          ].map(([title, items]) =>
            items.length ? (
              <section key={title} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-black text-app-text dark:text-white">{title}</h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {items.length}
                  </span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((auction) => (
                    <AuctionCard
                      key={auction.id}
                      auction={auction}
                      categoryName={categoryById.get(auction.category_id)}
                      isWatchlisted={false}
                      isUpdatingWatchlist={false}
                      onToggleWatchlist={() => {}}
                      onCancelAuction={setCancelTarget}
                      hideWatchlistAction
                    />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      ) : (
        <EmptyState title="No auctions created yet" message="Create your first auction to start selling on Argex.">
          <Button as={Link} to="/seller/create" variant="primary">
            Create Auction
          </Button>
        </EmptyState>
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

export default SellerDashboardPage
