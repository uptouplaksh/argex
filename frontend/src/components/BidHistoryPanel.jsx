import useAuth from '../hooks/useAuth'
import useCurrency from '../hooks/useCurrency'
import { formatMoney, normalizeCurrency } from '../utils/currency'
import { formatReadableDateTime } from '../utils/dateTime'

function getBidKey(bid) {
  return bid.id || `${bid.bidder_id}-${bid.amount}-${bid.created_at}`
}

function BidHistoryPanel({ auctionCurrency, bids = [], highlightedBidKey, isLoading }) {
  const { user } = useAuth()
  const { rates, supportedCurrencies } = useCurrency()
  const currency = normalizeCurrency(auctionCurrency || user?.preferred_currency, supportedCurrencies)
  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-soft backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-700">Bid history</p>
          <h2 className="mt-1 text-xl font-black text-app-text">Latest activity</h2>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 dark:bg-sky-900/50 dark:text-sky-200">
          {bids.length} bids
        </span>
      </div>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))
        ) : bids.length ? (
          bids.map((bid) => (
            <article
              key={getBidKey(bid)}
              className={`rounded-2xl border p-4 transition duration-300 ${
                highlightedBidKey === getBidKey(bid)
                  ? 'border-emerald-200 bg-emerald-50 shadow-subtle dark:border-emerald-800 dark:bg-emerald-900/40'
                  : 'border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-app-text">
                    {bid.bidder_username ? `@${bid.bidder_username}` : `Bidder ${bid.bidder_id}`}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {formatReadableDateTime(bid.created_at, 'Unknown time')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-app-text">{formatMoney(bid.amount, currency, rates)}</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                      bid.is_auto ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {bid.is_auto ? 'Auto' : 'Manual'}
                  </span>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-sky-100 bg-sky-50/70 p-6 text-center dark:border-slate-700 dark:bg-slate-800/70">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-white shadow-sm dark:bg-slate-900" />
            <p className="font-black text-app-text">No bids placed yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Bid activity will appear here as soon as the first offer is placed.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default BidHistoryPanel
