import {useEffect, useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import useCurrency from '../hooks/useCurrency'
import {getHighestBid} from '../services/auctionService'
import {getAuctionStateClasses, getAuctionStatus} from '../utils/auctionStatus'
import {formatAuctionMoney, normalizeCurrency} from '../utils/currency'
import {formatReadableDateTime} from '../utils/dateTime'
import Button from './Button'
import Reveal from './Reveal'

function AuctionCard({
                         auction,
                         categoryName,
                         isWatchlisted,
                         isUpdatingWatchlist,
                         onToggleWatchlist,
                         hideWatchlistAction = false,
                         onCancelAuction,
                     }) {
    const {user} = useAuth()
    const navigate = useNavigate()
    const {rates, supportedCurrencies} = useCurrency()
    const [auctionResult, setAuctionResult] = useState(null)
    const description = auction.description || 'No description provided yet.'
    const price = auction.current_price ?? auction.starting_price
    const auctionState = getAuctionStatus(auction)
    const isEnded = auctionState.status === 'ended'
    const canManage = String(auction.seller_id) === String(user?.id) &&
        !['ended', 'cancelled'].includes(auctionState.status)

    const currency = normalizeCurrency(user?.preferred_currency, supportedCurrencies)
    const auctionCurrency = normalizeCurrency(auction.auction_currency, supportedCurrencies)

    useEffect(() => {
        let isMounted = true

        async function loadResult() {
            if (!isEnded) {
                setAuctionResult(null)
                return
            }

            try {
                const result = await getHighestBid(auction.id)

                if (isMounted) {
                    setAuctionResult(result)
                }
            } catch {
                if (isMounted) {
                    setAuctionResult(null)
                }
            }
        }

        const timeout = setTimeout(loadResult, 0)

        return () => {
            isMounted = false
            clearTimeout(timeout)
        }
    }, [auction.id, isEnded])

    const handleWatchlistClick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggleWatchlist(auction.id)
    }

    const handleEditClick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        navigate(`/auctions/${auction.id}/edit`)
    }

    const handleCancelClick = (event) => {
        event.preventDefault()
        event.stopPropagation()
        onCancelAuction?.(auction)
    }

    return (<Reveal className="h-full">
        <Link
            to={`/auctions/${auction.id}`}
            className="group block h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
            <article
                className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-soft backdrop-blur transition duration-200 group-hover:-translate-y-1 group-hover:shadow-subtle dark:border-slate-700 dark:bg-slate-900/85">
                <div className="h-3 bg-gradient-to-r from-primary via-secondary to-accent"/>
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
              <span
                  className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-900/70 dark:text-violet-200">
                {categoryName || 'Uncategorized'}
              </span>
                        {hideWatchlistAction ? null : (<button
                            type="button"
                            className={`rounded-full border px-3 py-1 text-sm font-black transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${isWatchlisted ? 'border-emerald-200 bg-emerald-100 text-emerald-700 shadow-sm hover:bg-emerald-200 dark:border-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-100 dark:hover:bg-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-violet-700 dark:hover:bg-violet-900/50 dark:hover:text-violet-100'}`}
                            aria-label={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                            aria-pressed={isWatchlisted}
                            disabled={isUpdatingWatchlist}
                            onClick={handleWatchlistClick}
                        >
                            {isWatchlisted ? 'Saved' : '+ Save'}
                        </button>)}
                    </div>
                    {canManage ? (<div className="mb-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="rounded-full border border-sky-100 bg-white px-3 py-1 text-xs font-black text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200"
                            onClick={handleEditClick}
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                            onClick={handleCancelClick}
                        >
                            Cancel
                        </button>
                    </div>) : null}

                    <div className="space-y-3">
                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${getAuctionStateClasses(auctionState.tone)}`}>
                    {auctionState.label}
                  </span>
                                {auctionState.timeLabel ? (<span
                                    className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-200">
                      {auctionState.timeLabel}
                    </span>) : null}
                            </div>
                            <h2 className="line-clamp-2 text-xl font-black text-app-text dark:text-white">{auction.title}</h2>
                        </div>
                        <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
                    </div>

                    {isEnded ? (<div
                        className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                        <p className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-200">Winning
                            result</p>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs font-semibold text-slate-500">Winner</p>
                                <p className="mt-1 text-sm font-black text-app-text dark:text-white">
                                    {auctionResult?.bidder_username ? `@${auctionResult.bidder_username}` : auctionResult?.bidder_id ? `Bidder ${auctionResult.bidder_id}` : 'No winner'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500">Sold for</p>
                                <p className="mt-1 text-sm font-black text-app-text dark:text-white">
                                    {formatAuctionMoney(auctionResult?.amount ?? price, auctionCurrency, rates, currency)}
                                </p>
                            </div>
                        </div>
                    </div>) : null}

                    <div className="mt-auto pt-6">
                        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                            <div>
                                <p className="text-xs font-semibold text-slate-500">Current bid</p>
                                <p className="mt-1 text-lg font-black text-app-text">{formatAuctionMoney(price, auctionCurrency, rates, currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500">Seller</p>
                                <p className="mt-1 text-sm font-black text-app-text dark:text-white">
                                    {auction.seller?.username ? `@${auction.seller.username}` : 'Seller'}
                                </p>
                            </div>
                            <div className="col-span-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                                <p className="text-xs font-semibold text-slate-500">
                                    {auctionState.status === 'upcoming' ? 'Starts' : 'Ends'}
                                </p>
                                <p className="mt-1 text-sm font-black leading-6 text-app-text dark:text-white">
                                    {formatReadableDateTime(auctionState.status === 'upcoming' ? auction.start_time : auction.end_time)}
                                </p>
                            </div>
                        </div>
                        <Button as="span" className="mt-4 w-full" variant="secondary">
                            View auction
                        </Button>
                    </div>
                </div>
            </article>
        </Link>
    </Reveal>)
}

export default AuctionCard
