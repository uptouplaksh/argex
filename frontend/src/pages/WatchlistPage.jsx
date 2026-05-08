import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AuctionCard from '../components/AuctionCard'
import Button from '../components/Button'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import useToast from '../hooks/useToast'
import { getCategories } from '../services/auctionService'
import { getWatchlist, removeFromWatchlist } from '../services/watchlistService'

function WatchlistSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-2xl bg-white/80 shadow-soft dark:bg-slate-900/80" />
      ))}
    </div>
  )
}

function WatchlistPage() {
  const [watchlistItems, setWatchlistItems] = useState([])
  const [categories, setCategories] = useState([])
  const [updatingAuctionId, setUpdatingAuctionId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { showToast } = useToast()

  const loadWatchlist = useCallback(async () => {
    setError('')

    try {
      const [items, categoryData] = await Promise.all([getWatchlist(), getCategories()])
      setWatchlistItems(items || [])
      setCategories(categoryData || [])
    } catch {
      setError('Saved auctions could not be loaded.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(loadWatchlist, 0)
    return () => clearTimeout(timeout)
  }, [loadWatchlist])

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const savedAuctionIds = useMemo(
    () => new Set(watchlistItems.map((item) => item.auction_id)),
    [watchlistItems],
  )

  const handleRemoveSavedAuction = async (auctionId) => {
    const previousItems = watchlistItems
    setUpdatingAuctionId(auctionId)
    setWatchlistItems((current) => current.filter((item) => item.auction_id !== auctionId))

    try {
      await removeFromWatchlist(auctionId)
      showToast('Removed from watchlist', 'info')
    } catch (watchlistError) {
      const message = watchlistError.message || ''

      if (message.includes('not found')) {
        showToast('Removed from watchlist', 'info')
      } else {
        setWatchlistItems(previousItems)
        showToast(message || 'Could not update watchlist.', 'error')
      }
    } finally {
      setUpdatingAuctionId(null)
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <div className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm dark:border dark:border-violet-900/60 dark:bg-slate-900 dark:text-violet-200">
            Saved marketplace
          </div>
          <h1 className="text-3xl font-black text-app-text sm:text-4xl">Watchlist</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Follow auctions you want to revisit and track their current state.
          </p>
        </div>
        <Button as={Link} to="/auctions" variant="secondary">
          Browse auctions
        </Button>
      </section>

      {isLoading ? (
        <WatchlistSkeleton />
      ) : error ? (
        <Card className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-5 h-14 w-14 rounded-3xl bg-sky-50 dark:bg-sky-900/40" />
          <h2 className="text-2xl font-black text-app-text">Saved auctions unavailable</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
          <Button className="mt-6" variant="secondary" onClick={loadWatchlist}>
            Retry
          </Button>
        </Card>
      ) : watchlistItems.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {watchlistItems.map((item) => (
            <AuctionCard
              key={item.id}
              auction={item.auction}
              categoryName={categoryById.get(item.auction.category_id)}
              isWatchlisted={savedAuctionIds.has(item.auction_id)}
              isUpdatingWatchlist={updatingAuctionId === item.auction_id}
              onToggleWatchlist={handleRemoveSavedAuction}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No saved auctions yet" message="Save auctions from the marketplace to follow them here.">
          <Button as={Link} to="/auctions" variant="primary">
            Browse Auctions
          </Button>
        </EmptyState>
      )}
    </div>
  )
}

export default WatchlistPage
