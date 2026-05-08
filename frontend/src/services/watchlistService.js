import api from './api'

export async function getWatchlist() {
  const { data } = await api.get('/watchlist/')
  return data
}

export async function addToWatchlist(auctionId) {
  const { data } = await api.post(`/watchlist/${auctionId}`)
  return data
}

export async function removeFromWatchlist(auctionId) {
  await api.delete(`/watchlist/${auctionId}`)
}
