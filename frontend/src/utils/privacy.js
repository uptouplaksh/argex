export function canViewFullBidderUsername(role) {
  return ['admin', 'defender'].includes(String(role || '').toLowerCase())
}

export function maskUsername(username) {
  if (!username) {
    return username
  }

  const value = String(username)
  if (value.includes('*')) {
    return value
  }

  if (value.length <= 2) {
    return `${value[0] || ''}${'*'.repeat(Math.max(value.length - 1, 0))}`
  }

  if (value.length <= 4) {
    return `${value[0]}${'*'.repeat(value.length - 2)}${value.at(-1)}`
  }

  const suffixLength = value.length >= 8 ? 2 : 1
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(value.length - 2 - suffixLength, 1))}${value.slice(-suffixLength)}`
}

export function formatBidderLabel(username, bidderId, role) {
  if (username) {
    return `@${canViewFullBidderUsername(role) ? username : maskUsername(username)}`
  }

  return bidderId ? `Bidder ${bidderId}` : 'Bidder'
}
