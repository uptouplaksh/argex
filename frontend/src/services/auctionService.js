import api from './api'

export async function getAuctions(categoryId) {
  const params = categoryId ? { category_id: categoryId } : undefined
  const { data } = await api.get('/auctions/', { params })
  return data
}

export async function getAuction(auctionId) {
  const { data } = await api.get(`/auctions/${auctionId}`)
  return data
}

export async function getMyAuctions() {
  const { data } = await api.get('/auctions/mine')
  return data
}

export async function createAuction(payload) {
  const { data } = await api.post('/auctions/', payload)
  return data
}

export async function updateAuction(auctionId, payload) {
  const { data } = await api.put(`/auctions/${auctionId}`, payload)
  return data
}

export async function cancelAuction(auctionId) {
  await api.delete(`/auctions/${auctionId}`)
}

export async function getHighestBid(auctionId) {
  const { data } = await api.get(`/auctions/${auctionId}/highest-bid`)
  return data
}

export async function getCategories() {
  const { data } = await api.get('/categories/')
  return data
}
