import api from './api'

export async function getBidHistory(auctionId) {
  const { data } = await api.get(`/bids/${auctionId}/history`)
  return data
}

export async function placeBid(auctionId, amount) {
  const { data } = await api.post(`/bids/${auctionId}`, { amount })
  return data
}

export async function getAutoBid(auctionId) {
  const { data } = await api.get(`/bids/auto/${auctionId}`)
  return data
}

export async function upsertAutoBid(auctionId, maxBid) {
  const { data } = await api.post('/bids/auto', { auction_id: auctionId, max_bid: maxBid })
  return data
}

export async function disableAutoBid(auctionId) {
  const { data } = await api.delete(`/bids/auto/${auctionId}`)
  return data
}

export async function getMyBidStats() {
  const { data } = await api.get('/bids/me/stats')
  return data
}
