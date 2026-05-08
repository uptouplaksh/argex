import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Reveal from '../components/Reveal'
import useAuth from '../hooks/useAuth'
import useCurrency from '../hooks/useCurrency'
import { getAuctions, getCategories } from '../services/auctionService'
import { getAuctionStatus } from '../utils/auctionStatus'
import { formatAuctionMoney, normalizeCurrency } from '../utils/currency'

const highlights = [
  {
    title: 'Real-Time Auctions',
    description: 'Live auction rooms keep bid activity, timing, and user feedback moving without manual refreshes.',
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-200',
  },
  {
    title: 'Auto-Bidding Engine',
    description: 'Bidders can compete through automated bid rules while the platform keeps the auction fair.',
    tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-200',
  },
  {
    title: 'Defender Monitoring',
    description: 'Security teams get focused incident workflows instead of noisy generic admin screens.',
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  {
    title: 'Risk Detection',
    description: 'Anomaly detection and risk scoring help surface suspicious bidding behavior early.',
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200',
  },
]

function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const { rates, supportedCurrencies } = useCurrency()
  const [auctions, setAuctions] = useState([])
  const [categories, setCategories] = useState([])
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(true)
  const [marketplaceError, setMarketplaceError] = useState('')
  const currency = normalizeCurrency(user?.preferred_currency, supportedCurrencies)
  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'defender' ? '/defender' : user?.role === 'seller' ? '/seller' : '/watchlist'
  const dashboardLabel =
    user?.role === 'admin'
      ? 'Admin Panel'
      : user?.role === 'defender'
        ? 'Defender Dashboard'
      : user?.role === 'seller'
        ? 'Seller Dashboard'
        : 'Open Watchlist'
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )
  const activeAuctions = useMemo(
    () =>
      auctions
        .filter((auction) => getAuctionStatus(auction).status === 'active')
        .sort((a, b) => Number(b.current_price || 0) - Number(a.current_price || 0))
        .slice(0, 3),
    [auctions],
  )

  useEffect(() => {
    let isMounted = true

    async function loadMarketplace() {
      try {
        const [auctionData, categoryData] = await Promise.all([getAuctions(), getCategories()])
        if (isMounted) {
          setAuctions(auctionData || [])
          setCategories(categoryData || [])
          setMarketplaceError('')
        }
      } catch {
        if (isMounted) {
          setMarketplaceError('Live marketplace is temporarily unavailable.')
        }
      } finally {
        if (isMounted) {
          setIsMarketplaceLoading(false)
        }
      }
    }

    loadMarketplace()
    const interval = setInterval(loadMarketplace, 15000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="page-enter space-y-16 pb-8">
      <section className="grid min-h-[calc(100vh-9rem)] items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-12">
        <div className="max-w-3xl space-y-7">
          <div className="inline-flex rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur dark:border-violet-900/60 dark:bg-slate-900 dark:text-violet-300">
            Secure real-time auction platform
          </div>

          <div className="space-y-5">
            <h1 className="text-5xl font-black tracking-normal text-app-text dark:text-white sm:text-6xl lg:text-7xl">
              Argex
            </h1>
            <p className="max-w-2xl text-2xl font-black leading-tight text-slate-800 dark:text-slate-100 sm:text-3xl">
              Live auctions with security intelligence built into every bid.
            </p>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              Argex combines real-time bidding, watchlists, risk scoring, and defender workflows so marketplaces can move fast
              without losing trust.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isAuthenticated ? (
              <>
                <Button as={Link} to={dashboardPath} size="lg">
                  {dashboardLabel}
                </Button>
                <Button as={Link} to="/auctions" variant="secondary" size="lg">
                  Browse Auctions
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} to="/login" size="lg">
                  Login
                </Button>
                <Button as={Link} to="/register" variant="secondary" size="lg">
                  Create Account
                </Button>
              </>
            )}
          </div>
        </div>

        <Reveal className="relative mx-auto w-full max-w-xl" delay={120}>
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-violet-100 via-sky-50 to-emerald-100 p-5 dark:from-slate-800 dark:via-slate-900 dark:to-emerald-950 sm:p-6">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-violet-700 dark:text-violet-300">Live marketplace</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Verified bidding stream</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200">
                  {activeAuctions.length ? `${activeAuctions.length} live` : 'Synced'}
                </span>
              </div>

              <div className="space-y-4">
                {isMarketplaceLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/80 dark:bg-slate-800" />
                  ))
                ) : marketplaceError ? (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40">
                    {marketplaceError}
                  </div>
                ) : activeAuctions.length ? (
                  activeAuctions.map((auction) => (
                    <Link
                      key={auction.id}
                      to={`/auctions/${auction.id}`}
                      className="block rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm transition duration-300 hover:-translate-y-1 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-app-text dark:text-white">{auction.title}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {categoryById.get(auction.category_id) || 'Uncategorized'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-app-text dark:text-white">
                            {formatAuctionMoney(
                              auction.current_price ?? auction.starting_price,
                              auction.auction_currency,
                              rates,
                              currency,
                            )}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            {getAuctionStatus(auction).label}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/80 bg-white/90 p-4 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    No active auctions right now. The stream will populate when sellers open live listings.
                  </div>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item, index) => (
          <Reveal key={item.title} delay={index * 70}>
          <Card className="h-full">
            <span className={`mb-5 inline-grid h-11 w-11 place-items-center rounded-2xl text-sm font-black ${item.tone}`}>
              {item.title.slice(0, 1)}
            </span>
            <h2 className="text-xl font-black text-app-text dark:text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
          </Card>
          </Reveal>
        ))}
      </section>

      <Reveal as="section" className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase text-violet-700 dark:text-violet-300">Security intelligence</p>
          <h2 className="mt-3 text-3xl font-black text-app-text dark:text-white sm:text-4xl">
            Built for trust, not just transactions.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
            Defender dashboards, incident logs, user risk profiles, and notification flows give Argex the operating layer
            needed for competitive auction environments.
          </p>
        </div>
        <Card className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-red-50 p-4 dark:bg-red-950/40">
            <p className="text-xs font-semibold uppercase text-slate-500">Anomaly checks</p>
            <p className="mt-2 text-2xl font-black text-app-text dark:text-white">Live</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/40">
            <p className="text-xs font-semibold uppercase text-slate-500">Risk scoring</p>
            <p className="mt-2 text-2xl font-black text-app-text dark:text-white">Active</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
            <p className="text-xs font-semibold uppercase text-slate-500">Defender flow</p>
            <p className="mt-2 text-2xl font-black text-app-text dark:text-white">Ready</p>
          </div>
        </Card>
      </Reveal>
    </div>
  )
}

export default HomePage
