export const ROLES = {
  admin: 'admin',
  bidder: 'bidder',
  defender: 'defender',
  seller: 'seller',
}

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase()
}

export function isMarketplaceRole(role) {
  return [ROLES.bidder, ROLES.seller].includes(normalizeRole(role))
}
